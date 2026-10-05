import { z } from 'zod'

import type { Asset } from '../repositories/assets.js'

export const assetResponseSchema = z.object({
  id: z.string().uuid(),
  kind: z.enum(['original', 'generated', 'subject', 'background', 'mask']),
  source: z.enum(['upload', 'generate', 'tool']),
  image_format: z.string(),
  width: z.number().int().positive(),
  height: z.number().int().positive(),
  size_bytes: z.number().int().nonnegative(),
  has_alpha: z.boolean(),
  created_at: z.string().datetime(),
  url: z.string().url(),
})

// 数据库字段使用 camelCase；API 保持稳定的 snake_case 响应格式。
export function toAssetResponse(asset: Asset, url: string) {
  return assetResponseSchema.parse({
    id: asset.id,
    kind: asset.kind,
    source: asset.source,
    image_format: asset.imageFormat,
    width: asset.width,
    height: asset.height,
    size_bytes: asset.sizeBytes,
    has_alpha: asset.hasAlpha,
    created_at: asset.createdAt.toISOString(),
    url,
  })
}

export type AssetResponse = z.infer<typeof assetResponseSchema>
