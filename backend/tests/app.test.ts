import assert from 'node:assert/strict'
import { after, describe, it } from 'node:test'

import { buildApp } from '../src/app.js'

describe('CreatorFlow API', () => {
  const app = buildApp({
    logger: false,
    healthProbes: {
      database: async () => undefined,
      redis: async () => undefined,
      storage: async () => undefined,
    },
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
})
