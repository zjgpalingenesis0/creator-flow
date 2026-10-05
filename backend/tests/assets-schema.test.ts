import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import { getTableConfig } from 'drizzle-orm/pg-core'

import {
  ASSET_KINDS,
  ASSET_SOURCES,
  assets,
} from '../src/db/schema/assets.js'
import { users } from '../src/db/schema/users.js'

describe('assets schema', () => {
  const table = getTableConfig(assets)

  it('defines asset kinds and sources', () => {
    assert.deepEqual(ASSET_KINDS, ['original', 'generated', 'subject', 'background', 'mask'])
    assert.deepEqual(ASSET_SOURCES, ['upload', 'generate', 'tool'])
    assert.deepEqual(assets.kind.enumValues, ASSET_KINDS)
    assert.deepEqual(assets.source.enumValues, ASSET_SOURCES)
  })

  it('defines asset metadata columns', () => {
    assert.equal(table.name, 'assets')
    assert.deepEqual(
      table.columns.map((column) => column.name),
      [
        'id',
        'user_id',
        'kind',
        'source',
        'storage_key',
        'image_format',
        'width',
        'height',
        'size_bytes',
        'has_alpha',
        'created_at',
      ],
    )

    assert.equal(assets.id.columnType, 'PgUUID')
    assert.equal(assets.id.primary, true)
    assert.equal(assets.userId.notNull, true)
    assert.equal(assets.kind.getSQLType(), 'varchar(16)')
    assert.equal(assets.source.getSQLType(), 'varchar(16)')
    assert.equal(assets.storageKey.getSQLType(), 'varchar(255)')
    assert.equal(assets.storageKey.isUnique, true)
    assert.equal(assets.imageFormat.getSQLType(), 'varchar(8)')
    assert.equal(assets.width.notNull, true)
    assert.equal(assets.height.notNull, true)
    assert.equal(assets.sizeBytes.notNull, true)
    assert.equal(assets.hasAlpha.notNull, true)
    assert.ok(assets.createdAt.default)
  })

  it('indexes the owner and deletes assets with their user', () => {
    assert.equal(table.indexes.length, 1)
    assert.equal(table.indexes[0]?.config.name, 'ix_assets_user_id')
    assert.equal(table.indexes[0]?.config.unique, false)

    assert.equal(table.foreignKeys.length, 1)
    const foreignKey = table.foreignKeys[0]
    const reference = foreignKey?.reference()
    assert.equal(reference?.foreignTable, users)
    assert.equal(reference?.columns[0]?.name, 'user_id')
    assert.equal(reference?.foreignColumns[0]?.name, 'id')
    assert.equal(foreignKey?.onDelete, 'cascade')
  })
})
