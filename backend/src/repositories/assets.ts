import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js'

import { assets } from '../db/schema/assets.js'

export type Asset = typeof assets.$inferSelect
export type CreateAssetInput = typeof assets.$inferInsert
export type AssetDatabase = Pick<PostgresJsDatabase, 'insert'>

export interface AssetRepository {
  create(input: CreateAssetInput): Promise<Asset>
}

export function createAssetRepository(database: AssetDatabase): AssetRepository {
  return {
    async create(input) {
      const [asset] = await database.insert(assets).values(input).returning()

      if (!asset) {
        throw new Error('Database did not return the created asset')
      }
      return asset
    },
  }
}
