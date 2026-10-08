import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import sharp from 'sharp'

import { MockImageProvider } from '../src/providers/index.js'

async function image(width: number, height: number, alpha = false) {
  return sharp({
    create: {
      width,
      height,
      channels: alpha ? 4 : 3,
      background: alpha
        ? { r: 80, g: 120, b: 160, alpha: 0.5 }
        : { r: 80, g: 120, b: 160 },
    },
  })
    .png()
    .toBuffer()
}

describe('MockImageProvider', () => {
  it('generates the requested number of deterministic PNG images and reports progress', async () => {
    const provider = new MockImageProvider(0)
    const progress: Array<{ value: number; stage: string }> = []
    const request = { prompt: '蓝色杯子', width: 96, height: 64, count: 2 }

    const first = await provider.generate(request, async (value, stage) => {
      progress.push({ value, stage })
    })
    const second = await provider.generate(request)

    assert.equal(provider.name, 'mock')
    assert.equal(first.length, 2)
    assert.deepEqual(first, second)
    assert.deepEqual(progress, [
      { value: 50, stage: '生成第 1 / 2 张' },
      { value: 100, stage: '生成第 2 / 2 张' },
    ])

    for (const result of first) {
      const metadata = await sharp(result).metadata()
      assert.equal(metadata.format, 'png')
      assert.equal(metadata.width, 96)
      assert.equal(metadata.height, 64)
    }
  })

  it('edits an image to the requested size and reports each result', async () => {
    const provider = new MockImageProvider(0)
    const source = await image(80, 60, true)
    const progress: Array<{ value: number; stage: string }> = []

    const results = await provider.edit(
      { prompt: '换成绿色背景', image: source, width: 120, height: 90, count: 2 },
      async (value, stage) => {
        progress.push({ value, stage })
      },
    )

    assert.equal(results.length, 2)
    assert.deepEqual(progress, [
      { value: 50, stage: '生成第 1 / 2 张' },
      { value: 100, stage: '生成第 2 / 2 张' },
    ])
    for (const result of results) {
      const metadata = await sharp(result).metadata()
      assert.equal(metadata.format, 'png')
      assert.equal(metadata.width, 120)
      assert.equal(metadata.height, 90)
    }
  })

  it('upscales an image and reports processing stages', async () => {
    const provider = new MockImageProvider(0)
    const source = await image(40, 32)
    const progress: Array<{ value: number; stage: string }> = []

    const result = await provider.upscale(source, 2, async (value, stage) => {
      progress.push({ value, stage })
    })
    const metadata = await sharp(result).metadata()

    assert.equal(metadata.format, 'png')
    assert.equal(metadata.width, 80)
    assert.equal(metadata.height, 64)
    assert.deepEqual(progress, [
      { value: 40, stage: '放大画幅' },
      { value: 90, stage: '保存结果' },
    ])
  })
})
