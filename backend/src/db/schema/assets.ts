import { boolean, index, integer, pgTable, timestamp, uuid, varchar } from 'drizzle-orm/pg-core'

import { users } from './users.js'

export const ASSET_KINDS = ['original', 'generated', 'subject', 'background', 'mask'] as const
export const ASSET_SOURCES = ['upload', 'generate', 'tool'] as const

export type AssetKind = (typeof ASSET_KINDS)[number]
export type AssetSource = (typeof ASSET_SOURCES)[number]

export const assets = pgTable(
  'assets',
  {
    id: uuid('id').primaryKey(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    kind: varchar('kind', { length: 16, enum: ASSET_KINDS }).notNull(),
    source: varchar('source', { length: 16, enum: ASSET_SOURCES }).notNull(),
    storageKey: varchar('storage_key', { length: 255 }).notNull().unique(),
    imageFormat: varchar('image_format', { length: 8 }).notNull(),
    width: integer('width').notNull(),
    height: integer('height').notNull(),
    sizeBytes: integer('size_bytes').notNull(),
    hasAlpha: boolean('has_alpha').notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => [index('ix_assets_user_id').on(table.userId)],
)
