import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import { loadConfig } from '../src/config.js'

const validEnvironment = {
  APP_ENV: 'development',
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
  IMAGE_PROVIDER: 'dashscope',
  DASHSCOPE_API_KEY: 'dashscope-test-key',
  DASHSCOPE_BASE_URL: 'https://dashscope.example.com',
  TEXT_TO_IMAGE_MODEL: 'text-to-image-test',
  IMAGE_EDIT_MODEL: 'image-edit-test',
}

describe('loadConfig', () => {
  it('validates and converts environment variables', () => {
    const config = loadConfig(validEnvironment)

    assert.deepEqual(config, {
      appEnv: 'development',
      isProduction: false,
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
      imageProvider: {
        name: 'dashscope',
        apiKey: 'dashscope-test-key',
        baseUrl: 'https://dashscope.example.com',
        textToImageModel: 'text-to-image-test',
        imageEditModel: 'image-edit-test',
      },
    })
  })

  it('identifies the production environment', () => {
    const config = loadConfig({ ...validEnvironment, APP_ENV: 'production' })

    assert.equal(config.appEnv, 'production')
    assert.equal(config.isProduction, true)
  })

  it('defaults to development when APP_ENV is missing', () => {
    const { APP_ENV: _, ...environmentWithoutAppEnv } = validEnvironment

    const config = loadConfig(environmentWithoutAppEnv)

    assert.equal(config.appEnv, 'development')
    assert.equal(config.isProduction, false)
  })

  it('defaults to the local mock image provider', () => {
    const {
      IMAGE_PROVIDER: _provider,
      DASHSCOPE_API_KEY: _apiKey,
      DASHSCOPE_BASE_URL: _baseUrl,
      TEXT_TO_IMAGE_MODEL: _textModel,
      IMAGE_EDIT_MODEL: _editModel,
      ...environmentWithoutImageProvider
    } = validEnvironment

    const config = loadConfig(environmentWithoutImageProvider)

    assert.deepEqual(config.imageProvider, {
      name: 'mock',
      apiKey: '',
      baseUrl: 'https://dashscope.aliyuncs.com',
      textToImageModel: 'qwen-image-3.0-pro',
      imageEditModel: 'qwen-image-edit-max',
    })
  })

  it('rejects an unknown image provider', () => {
    assert.throws(
      () => loadConfig({ ...validEnvironment, IMAGE_PROVIDER: 'unknown' }),
      /IMAGE_PROVIDER/,
    )
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
