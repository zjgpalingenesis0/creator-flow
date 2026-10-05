import sharp from 'sharp'

export const MAX_IMAGE_BYTES = 20 * 1024 * 1024
export const MAX_IMAGE_PIXELS = 50_000_000
export const MIN_IMAGE_SIDE = 32

const SUPPORTED_FORMATS = {
  jpeg: { imageFormat: 'JPEG', contentType: 'image/jpeg', extension: 'jpg' },
  png: { imageFormat: 'PNG', contentType: 'image/png', extension: 'png' },
  webp: { imageFormat: 'WEBP', contentType: 'image/webp', extension: 'webp' },
} as const

export interface ImageMetadata {
  imageFormat: 'JPEG' | 'PNG' | 'WEBP'
  contentType: 'image/jpeg' | 'image/png' | 'image/webp'
  extension: 'jpg' | 'png' | 'webp'
  width: number
  height: number
  sizeBytes: number
  hasAlpha: boolean
}

export class ImageRejectedError extends Error {
  override name = 'ImageRejectedError'
}

export async function probeImage(data: Uint8Array): Promise<ImageMetadata> {
  if (data.byteLength === 0) {
    throw new ImageRejectedError('文件为空')
  }
  if (data.byteLength > MAX_IMAGE_BYTES) {
    throw new ImageRejectedError('文件超过 20 MB 上限')
  }

  try {
    const decoder = sharp(data, { failOn: 'error', limitInputPixels: false })
    const metadata = await decoder.metadata()
    const format = metadata.format

    if (!format || !(format in SUPPORTED_FORMATS)) {
      throw new ImageRejectedError('仅支持 JPG、PNG 与 WebP')
    }
    if (metadata.width === undefined || metadata.height === undefined) {
      throw new ImageRejectedError('文件已损坏或不是受支持的图片')
    }
    if (Math.min(metadata.width, metadata.height) < MIN_IMAGE_SIDE) {
      throw new ImageRejectedError(`图片过小，最短边需不小于 ${MIN_IMAGE_SIDE} 像素`)
    }
    if (metadata.width * metadata.height > MAX_IMAGE_PIXELS) {
      throw new ImageRejectedError('图片像素总量过大')
    }

    // metadata() 主要读取文件头；stats() 会完整解码图片并暴露截断或损坏的数据。
    await decoder.stats()

    const supported = SUPPORTED_FORMATS[format as keyof typeof SUPPORTED_FORMATS]
    return {
      ...supported,
      width: metadata.width,
      height: metadata.height,
      sizeBytes: data.byteLength,
      hasAlpha: metadata.hasAlpha ?? false,
    }
  } catch (error) {
    if (error instanceof ImageRejectedError) {
      throw error
    }
    throw new ImageRejectedError('文件已损坏或不是受支持的图片', { cause: error })
  }
}
