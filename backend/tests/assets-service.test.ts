import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import { PutObjectCommand } from '@aws-sdk/client-s3'
import sharp from 'sharp'

import type { AssetRepository } from '../src/repositories/assets.js'
import { createAssetService } from '../src/services/assets.js'
import type { ImageMetadata } from '../src/services/images.js'
import type { StorageCommandClient } from '../src/services/storage.js'

const ASSET_ID = 'e683b7ce-c6a7-4f78-98ea-360ad5ee5197'
const USER_ID = '9cb48148-6219-4c15-bd7b-3f75ac82d7de'
const CREATED_AT = new Date('2026-10-05T00:00:00.000Z')

function createDoubles() {
  const calls = {
    storage: [] as PutObjectCommand[],
    repository: [] as Array<Parameters<AssetRepository['create']>[0]>,
  }
  const repository: AssetRepository = {
    async create(input) {
      calls.repository.push(input)
      return { ...input, createdAt: CREATED_AT }
    },
  }
  const storage: StorageCommandClient = {
    async send(command) {
      assert.ok(command instanceof PutObjectCommand)
      calls.storage.push(command)
      return {}
    },
  }

  return { repository, storage, calls }
}

describe('createAssetService', () => {
  it('validates bytes, stores the object, and creates the asset record', async () => {
    const data = await sharp({
      create: { width: 64, height: 48, channels: 3, background: '#ffffff' },
    })
      .png()
      .toBuffer()
    const { repository, storage, calls } = createDoubles()
    const service = createAssetService(repository, storage, 'creator-flow', () => ASSET_ID)

    const asset = await service.createFromBytes({
      userId: USER_ID,
      data,
      kind: 'original',
      source: 'upload',
    })

    assert.deepEqual(calls.storage[0]?.input, {
      Bucket: 'creator-flow',
      Key: `users/${USER_ID}/${ASSET_ID}.png`,
      Body: data,
      ContentType: 'image/png',
    })
    assert.deepEqual(calls.repository, [
      {
        id: ASSET_ID,
        userId: USER_ID,
        kind: 'original',
        source: 'upload',
        storageKey: `users/${USER_ID}/${ASSET_ID}.png`,
        imageFormat: 'PNG',
        width: 64,
        height: 48,
        sizeBytes: data.byteLength,
        hasAlpha: false,
      },
    ])
    assert.equal(asset.id, ASSET_ID)
  })

  it('uses supplied image metadata without probing the bytes again', async () => {
    const metadata: ImageMetadata = {
      imageFormat: 'WEBP',
      contentType: 'image/webp',
      extension: 'webp',
      width: 800,
      height: 600,
      sizeBytes: 3,
      hasAlpha: true,
    }
    const data = new Uint8Array([1, 2, 3])
    const { repository, storage, calls } = createDoubles()
    const service = createAssetService(repository, storage, 'creator-flow', () => ASSET_ID)

    await service.createFromBytes({
      userId: USER_ID,
      data,
      kind: 'generated',
      source: 'generate',
      metadata,
    })

    assert.equal(calls.storage[0]?.input.Key, `users/${USER_ID}/${ASSET_ID}.webp`)
    assert.equal(calls.repository[0]?.imageFormat, 'WEBP')
    assert.equal(calls.repository[0]?.source, 'generate')
  })

  it('does not write a database record when object storage fails', async () => {
    const { repository, calls } = createDoubles()
    const storage: StorageCommandClient = {
      async send() {
        throw new Error('storage unavailable')
      },
    }
    const service = createAssetService(repository, storage, 'creator-flow', () => ASSET_ID)
    const metadata: ImageMetadata = {
      imageFormat: 'PNG',
      contentType: 'image/png',
      extension: 'png',
      width: 100,
      height: 100,
      sizeBytes: 3,
      hasAlpha: false,
    }

    await assert.rejects(
      service.createFromBytes({
        userId: USER_ID,
        data: new Uint8Array([1, 2, 3]),
        kind: 'original',
        source: 'upload',
        metadata,
      }),
      /storage unavailable/,
    )
    assert.deepEqual(calls.repository, [])
  })
})
