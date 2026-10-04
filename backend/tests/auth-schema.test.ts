import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import { credentialsSchema, userResponseSchema } from '../src/schemas/auth.js'

describe('credentialsSchema', () => {
  it('trims a Unicode username without changing the password', () => {
    const credentials = credentialsSchema.parse({
      username: '  用户_123  ',
      password: ' secret ',
    })

    assert.deepEqual(credentials, {
      username: '用户_123',
      password: ' secret ',
    })
  })

  it('accepts username and password boundary lengths', () => {
    assert.equal(
      credentialsSchema.safeParse({ username: 'abc', password: '123456' }).success,
      true,
    )
    assert.equal(
      credentialsSchema.safeParse({
        username: 'a'.repeat(32),
        password: 'p'.repeat(64),
      }).success,
      true,
    )
  })

  it('checks username length after trimming', () => {
    assert.equal(
      credentialsSchema.safeParse({ username: '  ab  ', password: '123456' }).success,
      false,
    )
  })

  it('rejects characters other than letters, numbers, and underscores', () => {
    assert.equal(
      credentialsSchema.safeParse({ username: 'demo-user', password: '123456' }).success,
      false,
    )
    assert.equal(
      credentialsSchema.safeParse({ username: 'demo user', password: '123456' }).success,
      false,
    )
  })

  it('rejects passwords outside the allowed length', () => {
    assert.equal(
      credentialsSchema.safeParse({ username: 'demo', password: '12345' }).success,
      false,
    )
    assert.equal(
      credentialsSchema.safeParse({ username: 'demo', password: 'p'.repeat(65) }).success,
      false,
    )
  })
})

describe('userResponseSchema', () => {
  it('returns only public user fields', () => {
    const user = userResponseSchema.parse({
      id: '9cb48148-6219-4c15-bd7b-3f75ac82d7de',
      username: 'demo_user',
      passwordHash: 'must-not-leak',
      createdAt: new Date(),
    })

    assert.deepEqual(user, {
      id: '9cb48148-6219-4c15-bd7b-3f75ac82d7de',
      username: 'demo_user',
    })
  })

  it('rejects an invalid user UUID', () => {
    assert.equal(
      userResponseSchema.safeParse({ id: 'not-a-uuid', username: 'demo_user' }).success,
      false,
    )
  })
})
