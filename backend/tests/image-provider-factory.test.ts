import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import {
  createImageProvider,
  DashScopeImageProvider,
  MockImageProvider,
  ProviderError,
} from '../src/providers/index.js'

const dashscopeConfig = {
  name: 'dashscope',
  apiKey: 'test-api-key',
  baseUrl: 'https://dashscope.example.com',
  textToImageModel: 'text-to-image-test',
  imageEditModel: 'image-edit-test',
}

describe('createImageProvider', () => {
  it('creates the local mock provider', () => {
    const provider = createImageProvider({ ...dashscopeConfig, name: 'mock' })

    assert.ok(provider instanceof MockImageProvider)
    assert.equal(provider.name, 'mock')
  })

  it('creates the DashScope provider with its configuration', () => {
    const provider = createImageProvider(dashscopeConfig)

    assert.ok(provider instanceof DashScopeImageProvider)
    assert.equal(provider.name, 'dashscope')
  })

  it('rejects an unknown provider', () => {
    assert.throws(
      () => createImageProvider({ ...dashscopeConfig, name: 'unknown' }),
      (error: unknown) =>
        error instanceof ProviderError && error.message === '未知的 IMAGE_PROVIDER：unknown',
    )
  })
})
