import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import { buildApp } from '../src/app.js'
import type { Asset } from '../src/repositories/assets.js'
import { issueToken, SESSION_COOKIE } from '../src/security/token.js'
import type { AssetService, CreateAssetFromBytesInput } from '../src/services/assets.js'
import type { AuthService } from '../src/services/auth.js'
import { ImageRejectedError, MAX_IMAGE_BYTES } from '../src/services/images.js'

const JWT_SECRET = 'test-secret-that-is-at-least-32-characters'
const USER_ID = '9cb48148-6219-4c15-bd7b-3f75ac82d7de'

const storedUser = {
  id: USER_ID,
  username: 'demo_user',
  passwordHash: 'hashed-password',
  createdAt: new Date('2026-10-04T00:00:00.000Z'),
}

const storedAsset: Asset = {
  id: 'a39f0b5e-2c66-48a0-87c0-02c432292b4c',
  userId: USER_ID,
  kind: 'original',
  source: 'upload',
  storageKey: `users/${USER_ID}/a39f0b5e-2c66-48a0-87c0-02c432292b4c.png`,
  imageFormat: 'PNG',
  width: 640,
  height: 480,
  sizeBytes: 4,
  hasAlpha: true,
  createdAt: new Date('2026-10-05T08:00:00.000Z'),
}

function multipartFile(data: Uint8Array, fieldName = 'file') {
  const boundary = 'creator-flow-test-boundary'
  const head = Buffer.from(
    `--${boundary}\r\n` +
      `Content-Disposition: form-data; name="${fieldName}"; filename="image.png"\r\n` +
      'Content-Type: image/png\r\n\r\n',
  )
  const tail = Buffer.from(`\r\n--${boundary}--\r\n`)

  return {
    headers: { 'content-type': `multipart/form-data; boundary=${boundary}` },
    payload: Buffer.concat([head, data, tail]),
  }
}

function emptyMultipart() {
  const boundary = 'creator-flow-empty-boundary'
  return {
    headers: { 'content-type': `multipart/form-data; boundary=${boundary}` },
    payload: Buffer.from(`--${boundary}--\r\n`),
  }
}

function createTestApp(options: {
  createFromBytes?: AssetService['createFromBytes']
} = {}) {
  const createCalls: CreateAssetFromBytesInput[] = []
  const authService: AuthService = {
    async register() {
      throw new Error('Not used in this test')
    },
    async authenticate() {
      throw new Error('Not used in this test')
    },
    async getById() {
      return storedUser
    },
  }
  const assetService: AssetService = {
    async createFromBytes(input) {
      createCalls.push(input)
      return options.createFromBytes?.(input) ?? storedAsset
    },
  }

  const app = buildApp({
    logger: false,
    healthProbes: {
      database: async () => undefined,
      redis: async () => undefined,
      storage: async () => undefined,
    },
    authService,
    assetService,
    createAssetUrl: async (storageKey: string) => `http://storage.test/${storageKey}`,
    auth: {
      jwtSecret: JWT_SECRET,
      jwtTtlHours: 24,
      isProduction: false,
    },
  })

  return { app, createCalls }
}

async function sessionCookie() {
  const token = await issueToken(USER_ID, JWT_SECRET, 24)
  return `${SESSION_COOKIE}=${token}`
}

describe('POST /api/assets', () => {
  it('rejects unauthenticated uploads without calling the asset service', async (context) => {
    const { app, createCalls } = createTestApp()
    context.after(() => app.close())

    const response = await app.inject({
      method: 'POST',
      url: '/api/assets',
      ...multipartFile(new Uint8Array([1, 2, 3, 4])),
    })

    assert.equal(response.statusCode, 401)
    assert.deepEqual(createCalls, [])
  })

  it('stores an authenticated upload and returns its public fields', async (context) => {
    const { app, createCalls } = createTestApp()
    context.after(() => app.close())
    const data = new Uint8Array([1, 2, 3, 4])

    const response = await app.inject({
      method: 'POST',
      url: '/api/assets',
      headers: {
        ...multipartFile(data).headers,
        cookie: await sessionCookie(),
      },
      payload: multipartFile(data).payload,
    })

    assert.equal(response.statusCode, 201)
    assert.equal(createCalls.length, 1)
    assert.equal(createCalls[0]?.userId, USER_ID)
    assert.deepEqual([...createCalls[0]!.data], [...data])
    assert.equal(createCalls[0]?.kind, 'original')
    assert.equal(createCalls[0]?.source, 'upload')
    assert.deepEqual(response.json(), {
      id: storedAsset.id,
      kind: 'original',
      source: 'upload',
      image_format: 'PNG',
      width: 640,
      height: 480,
      size_bytes: 4,
      has_alpha: true,
      created_at: '2026-10-05T08:00:00.000Z',
      url: `http://storage.test/${storedAsset.storageKey}`,
    })
  })

  it('returns 422 when the request does not contain a file field', async (context) => {
    const { app, createCalls } = createTestApp()
    context.after(() => app.close())

    const response = await app.inject({
      method: 'POST',
      url: '/api/assets',
      headers: {
        ...emptyMultipart().headers,
        cookie: await sessionCookie(),
      },
      payload: emptyMultipart().payload,
    })

    assert.equal(response.statusCode, 422)
    assert.deepEqual(response.json(), { message: '请选择要上传的图片' })
    assert.deepEqual(createCalls, [])
  })

  it('returns 422 when the request is not multipart', async (context) => {
    const { app, createCalls } = createTestApp()
    context.after(() => app.close())

    const response = await app.inject({
      method: 'POST',
      url: '/api/assets',
      headers: { cookie: await sessionCookie() },
      payload: {},
    })

    assert.equal(response.statusCode, 422)
    assert.deepEqual(response.json(), { message: '请使用 multipart/form-data 上传图片' })
    assert.deepEqual(createCalls, [])
  })

  it('returns 422 when image validation rejects the file', async (context) => {
    const { app } = createTestApp({
      async createFromBytes() {
        throw new ImageRejectedError('文件已损坏或不是受支持的图片')
      },
    })
    context.after(() => app.close())
    const upload = multipartFile(new Uint8Array([1, 2, 3, 4]))

    const response = await app.inject({
      method: 'POST',
      url: '/api/assets',
      headers: { ...upload.headers, cookie: await sessionCookie() },
      payload: upload.payload,
    })

    assert.equal(response.statusCode, 422)
    assert.deepEqual(response.json(), {
      message: '文件已损坏或不是受支持的图片',
    })
  })

  it('returns 413 before calling the service when the file exceeds 20 MB', async (context) => {
    const { app, createCalls } = createTestApp()
    context.after(() => app.close())
    const upload = multipartFile(new Uint8Array(MAX_IMAGE_BYTES + 1))

    const response = await app.inject({
      method: 'POST',
      url: '/api/assets',
      headers: { ...upload.headers, cookie: await sessionCookie() },
      payload: upload.payload,
    })

    assert.equal(response.statusCode, 413)
    assert.deepEqual(response.json(), { message: '文件超过 20 MB 上限' })
    assert.deepEqual(createCalls, [])
  })
})
