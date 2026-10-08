import {
  ProviderError,
  type EditRequest,
  type GenerateRequest,
  type ImageProvider,
  type ProgressCallback,
} from './base.js'
import {
  DashScopeImageProvider,
  type DashScopeImageProviderConfig,
} from './dashscope.js'
import { MockImageProvider } from './mock.js'

export interface ImageProviderFactoryConfig extends DashScopeImageProviderConfig {
  name: string
}

export function createImageProvider(config: ImageProviderFactoryConfig): ImageProvider {
  if (config.name === 'mock') {
    return new MockImageProvider()
  }
  if (config.name === 'dashscope') {
    return new DashScopeImageProvider(config)
  }
  throw new ProviderError(`未知的 IMAGE_PROVIDER：${config.name}`)
}

export {
  DashScopeImageProvider,
  MockImageProvider,
  ProviderError,
  type DashScopeImageProviderConfig,
  type EditRequest,
  type GenerateRequest,
  type ImageProvider,
  type ProgressCallback,
}
