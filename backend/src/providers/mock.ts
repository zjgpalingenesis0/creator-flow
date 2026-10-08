import { createHash } from 'node:crypto'
import { setTimeout as delay } from 'node:timers/promises'

import sharp from 'sharp'

import type {
  EditRequest,
  GenerateRequest,
  ImageProvider,
  ProgressCallback,
} from './base.js'

const DEFAULT_STEP_DELAY_MS = 400

export class MockImageProvider implements ImageProvider {
  readonly name = 'mock'

  constructor(private readonly stepDelayMs = DEFAULT_STEP_DELAY_MS) {}

  async generate(request: GenerateRequest, onProgress?: ProgressCallback) {
    const count = request.count ?? 1
    const seed = promptSeed(request.prompt)
    const images: Uint8Array[] = []

    for (let index = 0; index < count; index += 1) {
      await this.wait()
      await reportItemProgress(onProgress, index, count)
      images.push(await renderPlaceholder(request, seed + index * 977, index))
    }

    return images
  }

  async edit(request: EditRequest, onProgress?: ProgressCallback) {
    const count = request.count ?? 1
    const metadata = await sharp(request.image).metadata()
    if (!metadata.width || !metadata.height) {
      throw new Error('无法读取待编辑图片的尺寸')
    }

    const width = request.width ?? metadata.width
    const height = request.height ?? metadata.height
    const seed = promptSeed(request.prompt)
    const images: Uint8Array[] = []

    for (let index = 0; index < count; index += 1) {
      await this.wait()
      await reportItemProgress(onProgress, index, count)
      images.push(
        await composeImage(
          request.image,
          metadata.width,
          metadata.height,
          width,
          height,
          seed + index * 977,
        ),
      )
    }

    return images
  }

  async upscale(image: Uint8Array, scale: number, onProgress?: ProgressCallback) {
    const metadata = await sharp(image).metadata()
    if (!metadata.width || !metadata.height) {
      throw new Error('无法读取待放大图片的尺寸')
    }

    await onProgress?.(40, '放大画幅')
    await this.wait()
    const result = await sharp(image)
      .resize(metadata.width * scale, metadata.height * scale, {
        kernel: sharp.kernel.lanczos3,
      })
      .png()
      .toBuffer()
    await onProgress?.(90, '保存结果')
    return result
  }

  private async wait() {
    if (this.stepDelayMs > 0) {
      await delay(this.stepDelayMs)
    }
  }
}

async function reportItemProgress(
  onProgress: ProgressCallback | undefined,
  index: number,
  count: number,
) {
  await onProgress?.(
    Math.trunc(((index + 1) / count) * 100),
    `生成第 ${index + 1} / ${count} 张`,
  )
}

function promptSeed(prompt: string) {
  return createHash('sha256').update(prompt).digest().readUInt32BE(0)
}

function colorFromSeed(seed: number) {
  return {
    r: 128 + (seed & 0x7f),
    g: 128 + ((seed >>> 8) & 0x7f),
    b: 128 + ((seed >>> 16) & 0x7f),
  }
}

function accentFromSeed(seed: number) {
  return {
    r: 32 + ((seed >>> 16) & 0x9f),
    g: 32 + (seed & 0x9f),
    b: 32 + ((seed >>> 8) & 0x9f),
  }
}

async function renderPlaceholder(request: GenerateRequest, seed: number, index: number) {
  const radius = Math.trunc(Math.min(request.width, request.height) / 3)
    + (index % 3) * Math.trunc(Math.min(request.width, request.height) / 24)
  const accent = accentFromSeed(seed)
  const overlay = Buffer.from(
    `<svg width="${request.width}" height="${request.height}" xmlns="http://www.w3.org/2000/svg">`
      + `<circle cx="${Math.trunc(request.width / 2)}" cy="${Math.trunc(request.height / 2)}" r="${radius}" fill="rgb(${accent.r},${accent.g},${accent.b})"/>`
      + '</svg>',
  )

  return sharp({
    create: {
      width: request.width,
      height: request.height,
      channels: 3,
      background: colorFromSeed(seed),
    },
  })
    .composite([{ input: overlay }])
    .png()
    .toBuffer()
}

async function composeImage(
  source: Uint8Array,
  sourceWidth: number,
  sourceHeight: number,
  width: number,
  height: number,
  seed: number,
) {
  const sameSize = width === sourceWidth && height === sourceHeight
  const scale = Math.min(
    sameSize ? 0.88 : 1,
    width / sourceWidth,
    height / sourceHeight,
  )
  const placedWidth = Math.max(1, Math.trunc(sourceWidth * scale))
  const placedHeight = Math.max(1, Math.trunc(sourceHeight * scale))
  const placed = await sharp(source)
    .resize(placedWidth, placedHeight, { fit: 'fill' })
    .ensureAlpha()
    .png()
    .toBuffer()

  return sharp({
    create: {
      width,
      height,
      channels: 4,
      background: { ...colorFromSeed(seed), alpha: 1 },
    },
  })
    .composite([
      {
        input: placed,
        left: Math.trunc((width - placedWidth) / 2),
        top: Math.trunc((height - placedHeight) / 2),
      },
    ])
    .png()
    .toBuffer()
}
