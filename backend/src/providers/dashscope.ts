import { setTimeout as delay } from 'node:timers/promises'

import sharp from 'sharp'

import {
  ProviderError,
  type EditRequest,
  type GenerateRequest,
  type ImageProvider,
  type ProgressCallback,
} from './base.js'

const SUBMIT_PATH = '/api/v1/services/aigc/image-generation/generation'
const EDIT_PATH = '/api/v1/services/aigc/multimodal-generation/generation'
const TASK_PATH = '/api/v1/tasks'
const MIN_EDIT_EDGE = 512
const MAX_EDIT_EDGE = 2048
const DEFAULT_POLL_INTERVAL_MS = 3_000
const DEFAULT_POLL_TIMEOUT_MS = 300_000
const TERMINAL_STATUSES = new Set(['SUCCEEDED', 'FAILED', 'CANCELED', 'UNKNOWN'])

export interface DashScopeImageProviderConfig {
  apiKey: string
  baseUrl: string
  textToImageModel: string
  imageEditModel: string
}

interface DashScopeRuntimeOptions {
  fetcher?: typeof fetch
  pollIntervalMs?: number
  pollTimeoutMs?: number
}

type JsonObject = Record<string, unknown>

export class DashScopeImageProvider implements ImageProvider {
  readonly name = 'dashscope'

  private readonly fetcher: typeof fetch
  private readonly pollIntervalMs: number
  private readonly pollTimeoutMs: number

  constructor(
    private readonly config: DashScopeImageProviderConfig,
    runtime: DashScopeRuntimeOptions = {},
  ) {
    if (!config.apiKey) {
      throw new ProviderError('未配置 DASHSCOPE_API_KEY')
    }
    this.fetcher = runtime.fetcher ?? globalThis.fetch
    this.pollIntervalMs = runtime.pollIntervalMs ?? DEFAULT_POLL_INTERVAL_MS
    this.pollTimeoutMs = runtime.pollTimeoutMs ?? DEFAULT_POLL_TIMEOUT_MS
  }

  async generate(request: GenerateRequest, onProgress?: ProgressCallback) {
    const submitted = await this.post(SUBMIT_PATH, generatePayload(this.config, request), true)
    const taskId = stringField(objectField(submitted, 'output'), 'task_id')
    if (!taskId) {
      throw new ProviderError('模型服务未返回任务 ID')
    }

    const urls = await this.awaitResult(taskId, onProgress)
    return Promise.all(urls.map((url) => this.download(url)))
  }

  async edit(request: EditRequest, onProgress?: ProgressCallback) {
    await onProgress?.(20, '提交编辑')
    const response = await this.post(EDIT_PATH, editPayload(this.config, request))
    const urls = extractUrls(objectField(response, 'output'))
    await onProgress?.(80, '下载结果')
    return Promise.all(urls.map((url) => this.download(url)))
  }

  async upscale(image: Uint8Array, scale: number, onProgress?: ProgressCallback) {
    const metadata = await sharp(image).metadata()
    if (!metadata.width || !metadata.height) {
      throw new ProviderError('无法读取待放大图片的尺寸')
    }
    const [width, height] = fitEditSize(metadata.width * scale, metadata.height * scale)
    const results = await this.edit(
      {
        prompt: '提高清晰度，保持主体、构图和颜色不变，不要添加新元素。',
        image,
        width,
        height,
      },
      onProgress,
    )
    const result = results[0]
    if (!result) {
      throw new ProviderError('生成任务成功但未返回图片')
    }
    return result
  }

  private async awaitResult(taskId: string, onProgress?: ProgressCallback) {
    const startedAt = Date.now()
    const deadline = startedAt + this.pollTimeoutMs

    while (true) {
      const response = await this.get(`${TASK_PATH}/${encodeURIComponent(taskId)}`)
      const output = objectField(response, 'output')
      const status = stringField(output, 'task_status') ?? 'UNKNOWN'

      if (TERMINAL_STATUSES.has(status)) {
        if (status !== 'SUCCEEDED') {
          const message = stringField(output, 'message') ?? '未知原因'
          throw new ProviderError(`生成任务${status}：${message}`)
        }
        return extractUrls(output)
      }

      if (status === 'PENDING') {
        await onProgress?.(10, '排队中')
      } else if (status === 'RUNNING') {
        const waited = Date.now() - startedAt
        await onProgress?.(Math.min(82, 38 + Math.trunc(waited / 2_200)), '生成中')
      }

      if (Date.now() > deadline) {
        throw new ProviderError('生成任务超时')
      }
      if (this.pollIntervalMs > 0) {
        await delay(this.pollIntervalMs)
      }
    }
  }

  private async post(path: string, body: JsonObject, asynchronous = false) {
    const headers = new Headers({
      authorization: `Bearer ${this.config.apiKey}`,
      'content-type': 'application/json',
    })
    if (asynchronous) {
      headers.set('x-dashscope-async', 'enable')
    }
    const response = await this.fetcher(this.url(path), {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    })
    return parseResponse(response)
  }

  private async get(path: string) {
    const response = await this.fetcher(this.url(path), {
      headers: { authorization: `Bearer ${this.config.apiKey}` },
    })
    return parseResponse(response)
  }

  private async download(url: string) {
    const response = await this.fetcher(url)
    if (!response.ok) {
      throw new ProviderError('生成结果下载失败')
    }
    return new Uint8Array(await response.arrayBuffer())
  }

  private url(path: string) {
    return new URL(path, `${this.config.baseUrl.replace(/\/+$/, '')}/`).toString()
  }
}

function generatePayload(
  config: DashScopeImageProviderConfig,
  request: GenerateRequest,
): JsonObject {
  const content: Array<{ image: string } | { text: string }> = (
    request.references ?? []
  ).map((raw) => ({
    image: `data:image/png;base64,${Buffer.from(raw).toString('base64')}`,
  }))
  content.push({ text: request.prompt })

  const parameters: JsonObject = {
    n: request.count ?? 1,
    size: `${request.width}*${request.height}`,
    watermark: false,
  }
  if (request.negativePrompt) {
    parameters.negative_prompt = request.negativePrompt
  }
  if (request.seed !== undefined) {
    parameters.seed = request.seed
  }

  return {
    model: config.textToImageModel,
    input: { messages: [{ role: 'user', content }] },
    parameters,
  }
}

function editPayload(
  config: DashScopeImageProviderConfig,
  request: EditRequest,
): JsonObject {
  const parameters: JsonObject = {
    n: request.count ?? 1,
    watermark: false,
  }
  if (request.width !== undefined && request.height !== undefined) {
    const [width, height] = fitEditSize(request.width, request.height)
    parameters.size = `${width}*${height}`
  }
  if (request.negativePrompt) {
    parameters.negative_prompt = request.negativePrompt
  }

  return {
    model: config.imageEditModel,
    input: {
      messages: [
        {
          role: 'user',
          content: [
            { image: `data:image/png;base64,${Buffer.from(request.image).toString('base64')}` },
            { text: request.prompt },
          ],
        },
      ],
    },
    parameters,
  }
}

async function parseResponse(response: Response): Promise<JsonObject> {
  let body: unknown
  try {
    body = await response.json()
  } catch (error) {
    throw new ProviderError(`模型服务返回非 JSON 响应（HTTP ${response.status}）`, {
      cause: error,
    })
  }

  if (!isObject(body)) {
    throw new ProviderError(`模型服务返回无效响应（HTTP ${response.status}）`)
  }
  if (!response.ok || 'code' in body) {
    throw new ProviderError(
      stringField(body, 'message') ?? `模型服务错误 HTTP ${response.status}`,
    )
  }
  return body
}

function extractUrls(output: JsonObject) {
  const choices = Array.isArray(output.choices) ? output.choices : []
  const urls: string[] = []

  for (const choice of choices) {
    const message = objectField(isObject(choice) ? choice : {}, 'message')
    const content = Array.isArray(message.content) ? message.content : []
    for (const item of content) {
      if (isObject(item)) {
        const image = stringField(item, 'image')
        if (image) {
          urls.push(image)
        }
      }
    }
  }

  if (urls.length === 0) {
    throw new ProviderError('生成任务成功但未返回图片')
  }
  return urls
}

function fitEditSize(width: number, height: number): [number, number] {
  const minimumScale = Math.max(MIN_EDIT_EDGE / Math.min(width, height), 1)
  let fittedWidth = Math.trunc(width * minimumScale)
  let fittedHeight = Math.trunc(height * minimumScale)
  const longEdge = Math.max(fittedWidth, fittedHeight)

  if (longEdge > MAX_EDIT_EDGE) {
    const maximumScale = MAX_EDIT_EDGE / longEdge
    fittedWidth = Math.trunc(fittedWidth * maximumScale)
    fittedHeight = Math.trunc(fittedHeight * maximumScale)
  }

  return [
    Math.max(MIN_EDIT_EDGE, fittedWidth),
    Math.max(MIN_EDIT_EDGE, fittedHeight),
  ]
}

function objectField(object: JsonObject, key: string): JsonObject {
  const value = object[key]
  return isObject(value) ? value : {}
}

function stringField(object: JsonObject, key: string) {
  const value = object[key]
  return typeof value === 'string' ? value : undefined
}

function isObject(value: unknown): value is JsonObject {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}
