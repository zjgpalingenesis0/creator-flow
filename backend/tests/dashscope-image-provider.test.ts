import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import sharp from 'sharp'

import {
  DashScopeImageProvider,
  ProviderError,
} from '../src/providers/index.js'

const CONFIG = {
  apiKey: 'test-api-key',
  baseUrl: 'https://dashscope.example.com',
  textToImageModel: 'text-to-image-test',
  imageEditModel: 'image-edit-test',
}

interface FetchCall {
  url: string
  init: RequestInit | undefined
}

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  })
}

function fakeFetch(responses: Response[]) {
  const calls: FetchCall[] = []
  const fetcher = (async (input: string | URL | Request, init?: RequestInit) => {
    calls.push({ url: String(input), init })
    const response = responses.shift()
    if (!response) {
      throw new Error('Unexpected fetch call')
    }
    return response
  }) as typeof fetch

  return { fetcher, calls }
}

function requestBody(call: FetchCall) {
  const body = call.init?.body
  if (typeof body !== 'string') {
    throw new TypeError('Expected a JSON string request body')
  }
  return JSON.parse(body) as Record<string, unknown>
}

async function sourceImage(width = 100, height = 50) {
  return sharp({
    create: {
      width,
      height,
      channels: 3,
      background: { r: 30, g: 60, b: 90 },
    },
  })
    .png()
    .toBuffer()
}

describe('DashScopeImageProvider', () => {
  it('requires an API key', () => {
    assert.throws(
      () => new DashScopeImageProvider({ ...CONFIG, apiKey: '' }),
      (error: unknown) =>
        error instanceof ProviderError && error.message === '未配置 DASHSCOPE_API_KEY',
    )
  })

  it('submits and polls a generation task before downloading image bytes', async () => {
    const firstImage = new Uint8Array([1, 2, 3])
    const secondImage = new Uint8Array([4, 5, 6])
    const { fetcher, calls } = fakeFetch([
      jsonResponse({ output: { task_id: 'task-1' } }),
      jsonResponse({ output: { task_status: 'PENDING' } }),
      jsonResponse({ output: { task_status: 'RUNNING' } }),
      jsonResponse({
        output: {
          task_status: 'SUCCEEDED',
          choices: [
            {
              message: {
                content: [
                  { image: 'https://files.example.com/one.png' },
                  { image: 'https://files.example.com/two.png' },
                ],
              },
            },
          ],
        },
      }),
      new Response(firstImage),
      new Response(secondImage),
    ])
    const provider = new DashScopeImageProvider(CONFIG, {
      fetcher,
      pollIntervalMs: 0,
      pollTimeoutMs: 1_000,
    })
    const progress: Array<{ value: number; stage: string }> = []

    const results = await provider.generate(
      {
        prompt: '一只猫',
        width: 1024,
        height: 768,
        count: 2,
        negativePrompt: '模糊',
        seed: 42,
        references: [new Uint8Array([7, 8])],
      },
      async (value, stage) => {
        progress.push({ value, stage })
      },
    )

    assert.deepEqual(results, [firstImage, secondImage])
    assert.equal(calls[0]?.url, `${CONFIG.baseUrl}/api/v1/services/aigc/image-generation/generation`)
    assert.equal(calls[0]?.init?.method, 'POST')
    assert.equal(new Headers(calls[0]?.init?.headers).get('authorization'), 'Bearer test-api-key')
    assert.equal(new Headers(calls[0]?.init?.headers).get('x-dashscope-async'), 'enable')
    assert.deepEqual(requestBody(calls[0]!), {
      model: 'text-to-image-test',
      input: {
        messages: [
          {
            role: 'user',
            content: [
              { image: 'data:image/png;base64,Bwg=' },
              { text: '一只猫' },
            ],
          },
        ],
      },
      parameters: {
        n: 2,
        size: '1024*768',
        watermark: false,
        negative_prompt: '模糊',
        seed: 42,
      },
    })
    assert.deepEqual(progress.map(({ stage }) => stage), ['排队中', '生成中'])
    assert.deepEqual(calls.slice(-2).map(({ url }) => url), [
      'https://files.example.com/one.png',
      'https://files.example.com/two.png',
    ])
  })

  it('sends an inline image to the synchronous edit endpoint', async () => {
    const source = new Uint8Array([1, 2, 3])
    const output = new Uint8Array([9, 8, 7])
    const { fetcher, calls } = fakeFetch([
      jsonResponse({
        output: {
          choices: [
            { message: { content: [{ image: 'https://files.example.com/edited.png' }] } },
          ],
        },
      }),
      new Response(output),
    ])
    const provider = new DashScopeImageProvider(CONFIG, { fetcher })
    const progress: Array<{ value: number; stage: string }> = []

    const results = await provider.edit(
      {
        prompt: '换成白色背景',
        image: source,
        count: 1,
        width: 300,
        height: 100,
        negativePrompt: '阴影',
      },
      async (value, stage) => {
        progress.push({ value, stage })
      },
    )

    assert.deepEqual(results, [output])
    assert.equal(calls[0]?.url, `${CONFIG.baseUrl}/api/v1/services/aigc/multimodal-generation/generation`)
    assert.deepEqual(requestBody(calls[0]!), {
      model: 'image-edit-test',
      input: {
        messages: [
          {
            role: 'user',
            content: [
              { image: 'data:image/png;base64,AQID' },
              { text: '换成白色背景' },
            ],
          },
        ],
      },
      parameters: {
        n: 1,
        watermark: false,
        size: '1536*512',
        negative_prompt: '阴影',
      },
    })
    assert.deepEqual(progress, [
      { value: 20, stage: '提交编辑' },
      { value: 80, stage: '下载结果' },
    ])
  })

  it('implements upscaling through the edit model with a fitted target size', async () => {
    const source = await sourceImage()
    const output = new Uint8Array([5, 4, 3])
    const { fetcher, calls } = fakeFetch([
      jsonResponse({
        output: {
          choices: [
            { message: { content: [{ image: 'https://files.example.com/upscaled.png' }] } },
          ],
        },
      }),
      new Response(output),
    ])
    const provider = new DashScopeImageProvider(CONFIG, { fetcher })

    const result = await provider.upscale(source, 2)
    const body = requestBody(calls[0]!) as {
      parameters: { size: string }
      input: { messages: Array<{ content: Array<{ text?: string }> }> }
    }

    assert.deepEqual(result, output)
    assert.equal(body.parameters.size, '1024*512')
    assert.match(body.input.messages[0]!.content[1]!.text!, /保持主体、构图和颜色不变/)
  })

  it('converts a failed generation task into ProviderError', async () => {
    const { fetcher } = fakeFetch([
      jsonResponse({ output: { task_id: 'task-2' } }),
      jsonResponse({ output: { task_status: 'FAILED', message: '内容审核失败' } }),
    ])
    const provider = new DashScopeImageProvider(CONFIG, {
      fetcher,
      pollIntervalMs: 0,
    })

    await assert.rejects(
      () => provider.generate({ prompt: 'test', width: 512, height: 512 }),
      (error: unknown) =>
        error instanceof ProviderError && error.message === '生成任务FAILED：内容审核失败',
    )
  })

  it('converts an HTTP model error into ProviderError', async () => {
    const { fetcher } = fakeFetch([
      jsonResponse({ code: 'InvalidApiKey', message: 'API Key 无效' }, 401),
    ])
    const provider = new DashScopeImageProvider(CONFIG, { fetcher })

    await assert.rejects(
      () => provider.edit({ prompt: 'test', image: new Uint8Array([1]) }),
      (error: unknown) =>
        error instanceof ProviderError && error.message === 'API Key 无效',
    )
  })
})
