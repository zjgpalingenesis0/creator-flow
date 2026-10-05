import assert from 'node:assert/strict'
import { after, describe, it } from 'node:test'

import { buildApp } from '../src/app.js'
import { testAssetOptions } from './support/assets.js'
import { testAuthOptions } from './support/auth.js'

describe('CreatorFlow API', () => {
  const app = buildApp({
    ...testAuthOptions,
    ...testAssetOptions,
    logger: false,
    healthProbes: {
      database: async () => undefined,
      redis: async () => undefined,
      storage: async () => undefined,
    },
  })

  app.get('/cookie-test', async (request, reply) => {
    reply.setCookie('session', 'issued-token', {
      httpOnly: true,
      sameSite: 'lax',
      path: '/',
    })

    return { session: request.cookies.session ?? null }
  })

  after(async () => {
    await app.close()
  })

  it('serves the API root', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api',
    })

    assert.equal(response.statusCode, 200)
    assert.deepEqual(response.json(), {
      name: 'CreatorFlow API',
    })
  })

  it('supports setting an HttpOnly session cookie', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/cookie-test',
    })

    assert.equal(response.statusCode, 200)
    assert.equal(
      response.headers['set-cookie'],
      'session=issued-token; Path=/; HttpOnly; SameSite=Lax',
    )
  })

  it('parses the session cookie from requests', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/cookie-test',
      headers: {
        cookie: 'session=incoming-token',
      },
    })

    assert.equal(response.statusCode, 200)
    assert.deepEqual(response.json(), { session: 'incoming-token' })
  })
})
