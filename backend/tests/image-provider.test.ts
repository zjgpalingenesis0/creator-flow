import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import {
  ProviderError,
  type EditRequest,
  type GenerateRequest,
  type ImageProvider,
  type ProgressCallback,
} from '../src/providers/index.js'

class TestImageProvider implements ImageProvider {
  readonly name = 'test'

  async generate(request: GenerateRequest, onProgress?: ProgressCallback) {
    await onProgress?.(50, '生成中')
    return [new Uint8Array([request.width, request.height])]
  }

  async edit(request: EditRequest, onProgress?: ProgressCallback) {
    await onProgress?.(75, '编辑中')
    return [request.image]
  }

  async upscale(image: Uint8Array, scale: number, onProgress?: ProgressCallback) {
    await onProgress?.(90, '放大中')
    return new Uint8Array([...image, scale])
  }
}

describe('ImageProvider contract', () => {
  it('exposes one interface for generation, editing, upscaling, and progress', async () => {
    const provider: ImageProvider = new TestImageProvider()
    const progress: Array<{ value: number; stage: string }> = []
    const onProgress: ProgressCallback = async (value, stage) => {
      progress.push({ value, stage })
    }

    const generated = await provider.generate(
      { prompt: 'test', width: 64, height: 48, count: 1 },
      onProgress,
    )
    const edited = await provider.edit(
      { prompt: 'edit', image: generated[0]!, count: 1 },
      onProgress,
    )
    const upscaled = await provider.upscale(edited[0]!, 2, onProgress)

    assert.equal(provider.name, 'test')
    assert.deepEqual([...upscaled], [64, 48, 2])
    assert.deepEqual(progress, [
      { value: 50, stage: '生成中' },
      { value: 75, stage: '编辑中' },
      { value: 90, stage: '放大中' },
    ])
  })

  it('provides a shared error for provider failures', () => {
    const error = new ProviderError('模型服务不可用')

    assert.equal(error.name, 'ProviderError')
    assert.equal(error.message, '模型服务不可用')
    assert.ok(error instanceof Error)
  })
})
