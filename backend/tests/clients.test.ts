import assert from 'node:assert/strict'
import { after, describe, it } from 'node:test'

import { closeClients, createClients } from '../src/clients/index.js'
import { loadConfig } from '../src/config.js'

const config = loadConfig({
  API_HOST: '0.0.0.0',
  API_PORT: '7302',
  DATABASE_URL: 'postgresql://creator_flow:creator_flow_dev@localhost:7311/creator_flow',
  REDIS_URL: 'redis://localhost:7312',
  S3_ENDPOINT: 'http://localhost:7313',
  S3_ACCESS_KEY: 'creator_flow',
  S3_SECRET_KEY: 'creator_flow_dev',
  S3_BUCKET: 'creator-flow',
  S3_REGION: 'us-east-1',
  S3_FORCE_PATH_STYLE: 'true',
  JWT_SECRET: 'dev-only-secret-please-change-in-production',
  JWT_TTL_HOURS: '24',
})

describe('service clients', () => {
  const clients = createClients(config)

  after(async () => {
    await closeClients(clients)
  })

  it('creates clients without opening external connections', () => {
    assert.equal(typeof clients.database, 'function')
    assert.equal(clients.redis.status, 'wait')
    assert.equal(typeof clients.storage.send, 'function')
  })

  it('configures the S3-compatible storage endpoint and credentials', async () => {
    const endpointProvider = clients.storage.config.endpoint
    assert.ok(endpointProvider)

    const endpoint = await endpointProvider()
    const credentials = await clients.storage.config.credentials()

    assert.equal(endpoint.protocol, 'http:')
    assert.equal(endpoint.hostname, 'localhost')
    assert.equal(endpoint.port, 7313)
    assert.equal(clients.storage.config.forcePathStyle, true)
    assert.equal(credentials.accessKeyId, 'creator_flow')
    assert.equal(credentials.secretAccessKey, 'creator_flow_dev')
  })
})
