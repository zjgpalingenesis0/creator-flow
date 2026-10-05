import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import sharp from 'sharp'

import {
  ImageRejectedError,
  MAX_IMAGE_BYTES,
  probeImage,
} from '../src/services/images.js'

async function image(
  width = 320,
  height = 200,
  channels: 3 | 4 = 3,
  format: 'jpeg' | 'png' | 'webp' = 'png',
) {
  const pipeline = sharp({
    create: {
      width,
      height,
      channels,
      background: channels === 4 ? { r: 255, g: 255, b: 255, alpha: 0.5 } : '#ffffff',
    },
  })
  return pipeline[format]().toBuffer()
}

async function rejectsWith(data: Uint8Array, expectedMessage: string) {
  await assert.rejects(
    probeImage(data),
    (error: Error) => error instanceof ImageRejectedError && error.message === expectedMessage,
  )
}

describe('probeImage', () => {
  it('fully decodes a PNG and returns its metadata', async () => {
    const data = await image(320, 200, 4, 'png')

    const metadata = await probeImage(data)

    assert.deepEqual(metadata, {
      imageFormat: 'PNG',
      contentType: 'image/png',
      extension: 'png',
      width: 320,
      height: 200,
      sizeBytes: data.byteLength,
      hasAlpha: true,
    })
  })

  it('recognizes JPEG content without trusting a filename', async () => {
    const data = await image(128, 96, 3, 'jpeg')

    const metadata = await probeImage(data)

    assert.equal(metadata.imageFormat, 'JPEG')
    assert.equal(metadata.contentType, 'image/jpeg')
    assert.equal(metadata.extension, 'jpg')
    assert.equal(metadata.hasAlpha, false)
  })

  it('rejects an empty file', async () => {
    await rejectsWith(new Uint8Array(), '文件为空')
  })

  it('rejects a file larger than 20 MB before decoding', async () => {
    await rejectsWith(new Uint8Array(MAX_IMAGE_BYTES + 1), '文件超过 20 MB 上限')
  })

  it('rejects corrupted image data', async () => {
    await rejectsWith(new TextEncoder().encode('not-an-image'), '文件已损坏或不是受支持的图片')
  })

  it('rejects an unsupported image format', async () => {
    const data = new TextEncoder().encode(
      '<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100"></svg>',
    )

    await rejectsWith(data, '仅支持 JPG、PNG 与 WebP')
  })

  it('rejects an image whose shortest side is below 32 pixels', async () => {
    await rejectsWith(await image(31, 100), '图片过小，最短边需不小于 32 像素')
  })

  it('rejects an image with more than 50 million pixels', async () => {
    const data = await image(7100, 7100)

    await rejectsWith(data, '图片像素总量过大')
  })

  it('rejects a truncated image that still contains readable metadata', async () => {
    const complete = await image(1024, 1024, 3, 'png')
    const truncated = complete.subarray(0, Math.floor(complete.byteLength / 2))

    await rejectsWith(truncated, '文件已损坏或不是受支持的图片')
  })
})
