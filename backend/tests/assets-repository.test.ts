import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import { assets } from '../src/db/schema/assets.js'
import {
  createAssetRepository,
  type Asset,
  type AssetDatabase,
  type CreateAssetInput,
} from '../src/repositories/assets.js'

const ASSET_ID = 'e683b7ce-c6a7-4f78-98ea-360ad5ee5197'
const USER_ID = '9cb48148-6219-4c15-bd7b-3f75ac82d7de'

const input: CreateAssetInput = {
  id: ASSET_ID,
  userId: USER_ID,
  kind: 'original',
  source: 'upload',
  storageKey: `users/${USER_ID}/${ASSET_ID}.png`,
  imageFormat: 'PNG',
  width: 320,
  height: 200,
  sizeBytes: 1024,
  hasAlpha: true,
}

const storedAsset: Asset = {
  ...input,
  createdAt: new Date('2026-10-05T00:00:00.000Z'),
}

function createDatabaseDouble(rows: Asset[]) {
  const calls: { table?: unknown; values?: unknown } = {}
  const database = {
    insert(table: unknown) {
      calls.table = table
      return {
        values(values: unknown) {
          calls.values = values
          return { returning: async () => rows }
        },
      }
    },
  } as unknown as AssetDatabase

  return { database, calls }
}

describe('createAssetRepository', () => {
  it('inserts and returns an asset', async () => {
    const { database, calls } = createDatabaseDouble([storedAsset])
    const repository = createAssetRepository(database)

    const result = await repository.create(input)

    assert.equal(calls.table, assets)
    assert.deepEqual(calls.values, input)
    assert.deepEqual(result, storedAsset)
  })

  it('fails when the database does not return the created asset', async () => {
    const { database } = createDatabaseDouble([])
    const repository = createAssetRepository(database)

    await assert.rejects(repository.create(input), /did not return the created asset/)
  })
})
