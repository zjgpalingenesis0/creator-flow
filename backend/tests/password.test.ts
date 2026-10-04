import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import { hashPassword, verifyPassword } from '../src/security/password.js'

describe('password security', () => {
  it('hashes a password without storing the plaintext', async () => {
    const plain = 'secret123'

    const hashed = await hashPassword(plain)

    assert.notEqual(hashed, plain)
    assert.match(hashed, /^\$2[aby]\$12\$/)
  })

  it('uses a different salt for each hash', async () => {
    const plain = 'secret123'

    const firstHash = await hashPassword(plain)
    const secondHash = await hashPassword(plain)

    assert.notEqual(firstHash, secondHash)
    assert.equal(await verifyPassword(plain, firstHash), true)
    assert.equal(await verifyPassword(plain, secondHash), true)
  })

  it('rejects a password that does not match the hash', async () => {
    const hashed = await hashPassword('secret123')

    assert.equal(await verifyPassword('wrong-password', hashed), false)
  })
})
