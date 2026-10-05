import { randomUUID } from 'node:crypto'

import type { AssetKind, AssetSource } from '../db/schema/assets.js'
import type { AssetRepository } from '../repositories/assets.js'
import { probeImage, type ImageMetadata } from './images.js'
import { putStorageObject, type StorageCommandClient } from './storage.js'

export interface CreateAssetFromBytesInput {
  userId: string
  data: Uint8Array
  kind: AssetKind
  source: AssetSource
  metadata?: ImageMetadata
}

export function createAssetService(
  repository: AssetRepository,
  storage: StorageCommandClient,
  bucket: string,
  generateId: () => string = randomUUID,
) {
  return {
    async createFromBytes(input: CreateAssetFromBytesInput) {
      const metadata = input.metadata ?? (await probeImage(input.data))
      const assetId = generateId()
      const storageKey = `users/${input.userId}/${assetId}.${metadata.extension}`

      await putStorageObject(
        storage,
        bucket,
        storageKey,
        input.data,
        metadata.contentType,
      )

      return repository.create({
        id: assetId,
        userId: input.userId,
        kind: input.kind,
        source: input.source,
        storageKey,
        imageFormat: metadata.imageFormat,
        width: metadata.width,
        height: metadata.height,
        sizeBytes: metadata.sizeBytes,
        hasAlpha: metadata.hasAlpha,
      })
    },
  }
}

export type AssetService = ReturnType<typeof createAssetService>
