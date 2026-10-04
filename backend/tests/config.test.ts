import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import { loadConfig } from '../src/config.js'

const validEnvironment = {
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
}

describe('loadConfig', () => {
  it('validates and converts environment variables', () => {
    const config = loadConfig(validEnvironment)

    assert.deepEqual(config, {
      api: {
        host: '0.0.0.0',
        port: 7302,
      },
      databaseUrl: validEnvironment.DATABASE_URL,
      redisUrl: validEnvironment.REDIS_URL,
      storage: {
        endpoint: 'http://localhost:7313',
        accessKey: 'creator_flow',
        secretKey: 'creator_flow_dev',
        bucket: 'creator-flow',
        region: 'us-east-1',
        forcePathStyle: true,
      },
      auth: {
        jwtSecret: 'dev-only-secret-please-change-in-production',
        jwtTtlHours: 24,
      },
    })
  })

  it('identifies a missing required variable', () => {
    const { DATABASE_URL: _, ...missingDatabaseUrl } = validEnvironment

    assert.throws(() => loadConfig(missingDatabaseUrl), /DATABASE_URL/)
  })

  it('rejects an invalid API port', () => {
    assert.throws(
      () => loadConfig({ ...validEnvironment, API_PORT: '70000' }),
      /API_PORT/,
    )
  })
})
