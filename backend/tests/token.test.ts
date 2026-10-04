import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import { SESSION_COOKIE, issueToken, readToken } from '../src/security/token.js'

const USER_ID = 'a8098c1a-f86e-11da-bd1a-00112444be1e'
const JWT_SECRET = 'test-secret-that-is-at-least-32-characters-long'

function decodeJwtPart<T>(part: string): T {
  return JSON.parse(Buffer.from(part, 'base64url').toString('utf8')) as T
}

describe('token security', () => {
  it('uses the session cookie name', () => {
    assert.equal(SESSION_COOKIE, 'session')
  })

  it('issues a token that reads back the original user UUID', async () => {
    const token = await issueToken(USER_ID, JWT_SECRET, 24)

    assert.equal(await readToken(token, JWT_SECRET), USER_ID)
  })

  it('signs with HS256 and includes sub and exp claims', async () => {
    const before = Math.floor(Date.now() / 1000)
    const token = await issueToken(USER_ID, JWT_SECRET, 1)
    const [encodedHeader, encodedPayload] = token.split('.')

    assert.ok(encodedHeader)
    assert.ok(encodedPayload)

    const header = decodeJwtPart<{ alg: string }>(encodedHeader)
    const payload = decodeJwtPart<{ sub: string; exp: number }>(encodedPayload)

    assert.equal(header.alg, 'HS256')
    assert.equal(payload.sub, USER_ID)
    assert.ok(payload.exp >= before + 3_600)
    assert.ok(payload.exp <= Math.floor(Date.now() / 1000) + 3_600)
  })

  it('rejects a token verified with a different secret', async () => {
    const token = await issueToken(USER_ID, JWT_SECRET, 24)

    assert.equal(await readToken(token, 'another-secret-that-is-at-least-32-characters'), null)
  })

  it('rejects an expired token', async () => {
    const token = await issueToken(USER_ID, JWT_SECRET, -1)

    assert.equal(await readToken(token, JWT_SECRET), null)
  })

  it('rejects a token whose subject is not a UUID', async () => {
    const token = await issueToken('not-a-uuid', JWT_SECRET, 24)

    assert.equal(await readToken(token, JWT_SECRET), null)
  })

  it('rejects a damaged token', async () => {
    const token = await issueToken(USER_ID, JWT_SECRET, 24)
    const [header, payload] = token.split('.')

    assert.ok(header)
    assert.ok(payload)
    assert.equal(await readToken(`${header}.${payload}.invalid`, JWT_SECRET), null)
  })
})
