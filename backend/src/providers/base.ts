export type ProgressCallback = (progress: number, stage: string) => Promise<void>

export class ProviderError extends Error {
  override name = 'ProviderError'
}

export interface GenerateRequest {
  prompt: string
  width: number
  height: number
  count?: number
  negativePrompt?: string
  seed?: number
  // 参考图使用原始字节，具体 Provider 决定如何传给模型平台。
  references?: readonly Uint8Array[]
}

export interface EditRequest {
  prompt: string
  image: Uint8Array
  count?: number
  width?: number
  height?: number
  negativePrompt?: string
}

export interface ImageProvider {
  readonly name: string

  generate(
    request: GenerateRequest,
    onProgress?: ProgressCallback,
  ): Promise<Uint8Array[]>

  edit(
    request: EditRequest,
    onProgress?: ProgressCallback,
  ): Promise<Uint8Array[]>

  upscale(
    image: Uint8Array,
    scale: number,
    onProgress?: ProgressCallback,
  ): Promise<Uint8Array>
}
