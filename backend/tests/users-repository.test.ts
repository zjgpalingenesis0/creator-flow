import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import type { SQL } from 'drizzle-orm'
import { PgDialect } from 'drizzle-orm/pg-core'

import { users } from '../src/db/schema/users.js'
import {
  createUserRepository,
  type User,
  type UserDatabase,
} from '../src/repositories/users.js'

const USER_ID = '9cb48148-6219-4c15-bd7b-3f75ac82d7de'
const CREATED_AT = new Date('2026-10-04T00:00:00.000Z')

const storedUser: User = {
  id: USER_ID,
  username: 'demo_user',
  passwordHash: 'hashed-password',
  createdAt: CREATED_AT,
}

function createDatabaseDouble(rows: User[]) {
  const calls: {
    insertValues?: unknown
    filters: SQL[]
    limits: number[]
  } = {
    filters: [],
    limits: [],
  }

  const database = {
    insert(table: unknown) {
      assert.equal(table, users)
      return {
        values(values: unknown) {
          calls.insertValues = values
          return {
            returning: async () => rows,
          }
        },
      }
    },
    select() {
      return {
        from(table: unknown) {
          assert.equal(table, users)
          return {
            where(filter: SQL) {
              calls.filters.push(filter)
              return {
                limit(limit: number) {
                  calls.limits.push(limit)
                  return Promise.resolve(rows)
                },
              }
            },
          }
        },
      }
    },
  } as unknown as UserDatabase

  return { database, calls }
}

function renderFilter(filter: SQL) {
  return new PgDialect().sqlToQuery(filter)
}

describe('createUserRepository', () => {
  it('creates and returns a user with a generated UUID', async () => {
    const { database, calls } = createDatabaseDouble([storedUser])
    const repository = createUserRepository(database, () => USER_ID)

    const user = await repository.create({
      username: 'demo_user',
      passwordHash: 'hashed-password',
    })

    assert.deepEqual(calls.insertValues, {
      id: USER_ID,
      username: 'demo_user',
      passwordHash: 'hashed-password',
    })
    assert.deepEqual(user, storedUser)
  })

  it('fails when the database does not return the created user', async () => {
    const { database } = createDatabaseDouble([])
    const repository = createUserRepository(database, () => USER_ID)

    await assert.rejects(
      repository.create({ username: 'demo_user', passwordHash: 'hashed-password' }),
      /did not return the created user/,
    )
  })

  it('finds a user by username', async () => {
    const { database, calls } = createDatabaseDouble([storedUser])
    const repository = createUserRepository(database)

    assert.deepEqual(await repository.findByUsername('demo_user'), storedUser)
    assert.deepEqual(renderFilter(calls.filters[0]!), {
      sql: '"users"."username" = $1',
      params: ['demo_user'],
      typings: ['none'],
    })
    assert.deepEqual(calls.limits, [1])
  })

  it('returns null when a username does not exist', async () => {
    const { database } = createDatabaseDouble([])
    const repository = createUserRepository(database)

    assert.equal(await repository.findByUsername('missing_user'), null)
  })

  it('finds a user by ID', async () => {
    const { database, calls } = createDatabaseDouble([storedUser])
    const repository = createUserRepository(database)

    assert.deepEqual(await repository.findById(USER_ID), storedUser)
    assert.deepEqual(renderFilter(calls.filters[0]!), {
      sql: '"users"."id" = $1',
      params: [USER_ID],
      typings: ['uuid'],
    })
    assert.deepEqual(calls.limits, [1])
  })

  it('returns null when a user ID does not exist', async () => {
    const { database } = createDatabaseDouble([])
    const repository = createUserRepository(database)

    assert.equal(await repository.findById(USER_ID), null)
  })
})
