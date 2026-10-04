import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import { getTableConfig } from 'drizzle-orm/pg-core'

import { users } from '../src/db/schema/users.js'

describe('users schema', () => {
  const table = getTableConfig(users)

  it('defines the original users table columns', () => {
    assert.equal(table.name, 'users')
    assert.deepEqual(
      table.columns.map((column) => column.name),
      ['id', 'username', 'password_hash', 'created_at'],
    )

    assert.equal(users.id.columnType, 'PgUUID')
    assert.equal(users.id.primary, true)
    assert.equal(users.id.notNull, true)

    assert.equal(users.username.columnType, 'PgVarchar')
    assert.equal(users.username.getSQLType(), 'varchar(32)')
    assert.equal(users.username.notNull, true)

    assert.equal(users.passwordHash.columnType, 'PgVarchar')
    assert.equal(users.passwordHash.getSQLType(), 'varchar(128)')
    assert.equal(users.passwordHash.notNull, true)

    assert.equal(users.createdAt.columnType, 'PgTimestamp')
    assert.equal(users.createdAt.notNull, true)
    assert.ok(users.createdAt.default)
  })

  it('defines a unique username index with the original name', () => {
    assert.equal(table.indexes.length, 1)
    assert.equal(table.indexes[0]?.config.name, 'ix_users_username')
    assert.equal(table.indexes[0]?.config.unique, true)
    const indexedColumn = table.indexes[0]?.config.columns[0]
    assert.ok(indexedColumn && 'name' in indexedColumn)
    assert.equal(indexedColumn.name, 'username')
  })
})
