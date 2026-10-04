import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import { buildApp } from '../src/app.js'

describe('GET /api/health', () => {
  it('reports all dependencies as healthy', async (context) => {
    const app = buildApp({
      logger: false,
      healthProbes: {
        database: async () => undefined,
        redis: async () => undefined,
        storage: async () => undefined,
      },
    })
    context.after(async () => app.close())

    const response = await app.inject({ method: 'GET', url: '/api/health' })

    assert.equal(response.statusCode, 200)
    assert.deepEqual(response.json(), {
      api: 'ok',
      database: 'ok',
      redis: 'ok',
      storage: 'ok',
    })
  })

  it('returns 503 when a dependency is unavailable', async (context) => {
    const app = buildApp({
      logger: false,
      healthProbes: {
        database: async () => {
          throw new TypeError('offline')
        },
        redis: async () => undefined,
        storage: async () => undefined,
      },
    })
    context.after(async () => app.close())

    const response = await app.inject({ method: 'GET', url: '/api/health' })

    assert.equal(response.statusCode, 503)
    assert.deepEqual(response.json(), {
      api: 'ok',
      database: 'error: TypeError',
      redis: 'ok',
      storage: 'ok',
    })
  })
})
