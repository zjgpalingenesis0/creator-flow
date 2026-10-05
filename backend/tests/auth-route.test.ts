import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import { buildApp } from '../src/app.js'
import type { User } from '../src/repositories/users.js'
import { issueToken, readToken, SESSION_COOKIE } from '../src/security/token.js'
import {
  type AuthService,
  InvalidCredentialsError,
  UsernameTakenError,
} from '../src/services/auth.js'
import { testAssetOptions } from './support/assets.js'

const JWT_SECRET = 'test-secret-that-is-at-least-32-characters'
const USER_ID = '9cb48148-6219-4c15-bd7b-3f75ac82d7de'

const storedUser: User = {
  id: USER_ID,
  username: 'demo_user',
  passwordHash: 'hashed-password',
  createdAt: new Date('2026-10-04T00:00:00.000Z'),
}

function createTestApp(options: {
  register?: AuthService['register']
  authenticate?: AuthService['authenticate']
  getById?: AuthService['getById']
  isProduction?: boolean
} = {}) {
  const registerCalls: Array<{ username: string; password: string }> = []
  const authenticateCalls: Array<{ username: string; password: string }> = []
  const getByIdCalls: string[] = []
  const authService: AuthService = {
    async register(username, password) {
      registerCalls.push({ username, password })
      return options.register?.(username, password) ?? storedUser
    },
    async authenticate(username, password) {
      authenticateCalls.push({ username, password })
      return options.authenticate?.(username, password) ?? storedUser
    },
    async getById(id) {
      getByIdCalls.push(id)
      return options.getById?.(id) ?? storedUser
    },
  }

  const app = buildApp({
    ...testAssetOptions,
    logger: false,
    healthProbes: {
      database: async () => undefined,
      redis: async () => undefined,
      storage: async () => undefined,
    },
    authService,
    auth: {
      jwtSecret: JWT_SECRET,
      jwtTtlHours: 24,
      isProduction: options.isProduction ?? false,
    },
  })

  return { app, registerCalls, authenticateCalls, getByIdCalls }
}

function getSessionCookie(header: string | string[] | undefined): string {
  if (typeof header !== 'string') {
    throw new TypeError('Expected a single Set-Cookie header')
  }
  return header
}

describe('POST /api/auth/register', () => {
  it('creates a user, returns public fields, and starts a session', async (context) => {
    const { app, registerCalls } = createTestApp()
    context.after(() => app.close())

    const response = await app.inject({
      method: 'POST',
      url: '/api/auth/register',
      payload: {
        username: '  demo_user  ',
        password: 'secret123',
      },
    })

    assert.equal(response.statusCode, 201)
    assert.deepEqual(registerCalls, [{ username: 'demo_user', password: 'secret123' }])
    assert.deepEqual(response.json(), { id: USER_ID, username: 'demo_user' })

    const cookie = getSessionCookie(response.headers['set-cookie'])
    assert.match(cookie, /^session=[^;]+/)
    assert.match(cookie, /Max-Age=86400/)
    assert.match(cookie, /Path=\//)
    assert.match(cookie, /HttpOnly/)
    assert.match(cookie, /SameSite=Lax/)
    assert.doesNotMatch(cookie, /Secure/)

    const token = cookie.slice(`${SESSION_COOKIE}=`.length, cookie.indexOf(';'))
    assert.equal(await readToken(token, JWT_SECRET), USER_ID)
  })

  it('returns 422 without calling the service when credentials are invalid', async (context) => {
    const { app, registerCalls } = createTestApp()
    context.after(() => app.close())

    const response = await app.inject({
      method: 'POST',
      url: '/api/auth/register',
      payload: {
        username: 'invalid-name',
        password: 'secret123',
      },
    })

    assert.equal(response.statusCode, 422)
    assert.deepEqual(registerCalls, [])
  })

  it('returns 409 when the username is already taken', async (context) => {
    const { app } = createTestApp({
      async register() {
        throw new UsernameTakenError()
      },
    })
    context.after(() => app.close())

    const response = await app.inject({
      method: 'POST',
      url: '/api/auth/register',
      payload: {
        username: 'demo_user',
        password: 'secret123',
      },
    })

    assert.equal(response.statusCode, 409)
    assert.deepEqual(response.json(), { message: '该用户名已被占用' })
  })

  it('sets Secure on the session cookie in production', async (context) => {
    const { app } = createTestApp({ isProduction: true })
    context.after(() => app.close())

    const response = await app.inject({
      method: 'POST',
      url: '/api/auth/register',
      payload: {
        username: 'demo_user',
        password: 'secret123',
      },
    })

    assert.equal(response.statusCode, 201)
    assert.match(getSessionCookie(response.headers['set-cookie']), /Secure/)
  })
})

describe('POST /api/auth/login', () => {
  it('authenticates a user and starts a session', async (context) => {
    const { app, authenticateCalls } = createTestApp()
    context.after(() => app.close())

    const response = await app.inject({
      method: 'POST',
      url: '/api/auth/login',
      payload: {
        username: '  demo_user  ',
        password: 'secret123',
      },
    })

    assert.equal(response.statusCode, 200)
    assert.deepEqual(authenticateCalls, [
      { username: 'demo_user', password: 'secret123' },
    ])
    assert.deepEqual(response.json(), { id: USER_ID, username: 'demo_user' })

    const cookie = getSessionCookie(response.headers['set-cookie'])
    assert.match(cookie, /^session=[^;]+/)
    assert.match(cookie, /Max-Age=86400/)
    assert.match(cookie, /Path=\//)
    assert.match(cookie, /HttpOnly/)
    assert.match(cookie, /SameSite=Lax/)

    const token = cookie.slice(`${SESSION_COOKIE}=`.length, cookie.indexOf(';'))
    assert.equal(await readToken(token, JWT_SECRET), USER_ID)
  })

  it('returns 422 without calling the service when credentials are invalid', async (context) => {
    const { app, authenticateCalls } = createTestApp()
    context.after(() => app.close())

    const response = await app.inject({
      method: 'POST',
      url: '/api/auth/login',
      payload: {
        username: 'invalid-name',
        password: 'secret123',
      },
    })

    assert.equal(response.statusCode, 422)
    assert.deepEqual(authenticateCalls, [])
  })

  it('returns 401 when the username or password is incorrect', async (context) => {
    const { app } = createTestApp({
      async authenticate() {
        throw new InvalidCredentialsError()
      },
    })
    context.after(() => app.close())

    const response = await app.inject({
      method: 'POST',
      url: '/api/auth/login',
      payload: {
        username: 'demo_user',
        password: 'wrong-password',
      },
    })

    assert.equal(response.statusCode, 401)
    assert.deepEqual(response.json(), { message: '用户名或密码错误' })
  })
})

describe('GET /api/auth/me', () => {
  it('returns the current user for a valid session', async (context) => {
    const { app, getByIdCalls } = createTestApp()
    context.after(() => app.close())
    const token = await issueToken(USER_ID, JWT_SECRET, 24)

    const response = await app.inject({
      method: 'GET',
      url: '/api/auth/me',
      headers: {
        cookie: `${SESSION_COOKIE}=${token}`,
      },
    })

    assert.equal(response.statusCode, 200)
    assert.deepEqual(getByIdCalls, [USER_ID])
    assert.deepEqual(response.json(), { id: USER_ID, username: 'demo_user' })
  })

  it('returns 401 without querying the user when the session cookie is missing', async (context) => {
    const { app, getByIdCalls } = createTestApp()
    context.after(() => app.close())

    const response = await app.inject({
      method: 'GET',
      url: '/api/auth/me',
    })

    assert.equal(response.statusCode, 401)
    assert.deepEqual(getByIdCalls, [])
    assert.deepEqual(response.json(), { message: '未登录或会话已过期' })
  })

  it('returns 401 without querying the user when the token is invalid', async (context) => {
    const { app, getByIdCalls } = createTestApp()
    context.after(() => app.close())

    const response = await app.inject({
      method: 'GET',
      url: '/api/auth/me',
      headers: {
        cookie: `${SESSION_COOKIE}=invalid-token`,
      },
    })

    assert.equal(response.statusCode, 401)
    assert.deepEqual(getByIdCalls, [])
    assert.deepEqual(response.json(), { message: '未登录或会话已过期' })
  })

  it('returns 401 when the session user no longer exists', async (context) => {
    const { app, getByIdCalls } = createTestApp({
      async getById() {
        return null
      },
    })
    context.after(() => app.close())
    const token = await issueToken(USER_ID, JWT_SECRET, 24)

    const response = await app.inject({
      method: 'GET',
      url: '/api/auth/me',
      headers: {
        cookie: `${SESSION_COOKIE}=${token}`,
      },
    })

    assert.equal(response.statusCode, 401)
    assert.deepEqual(getByIdCalls, [USER_ID])
    assert.deepEqual(response.json(), { message: '未登录或会话已过期' })
  })
})

describe('POST /api/auth/logout', () => {
  it('clears the session cookie and returns 204', async (context) => {
    const { app } = createTestApp()
    context.after(() => app.close())

    const response = await app.inject({
      method: 'POST',
      url: '/api/auth/logout',
      headers: {
        cookie: `${SESSION_COOKIE}=existing-token`,
      },
    })

    assert.equal(response.statusCode, 204)
    assert.equal(response.body, '')

    const cookie = getSessionCookie(response.headers['set-cookie'])
    assert.match(cookie, /^session=;/)
    assert.match(cookie, /Path=\//)
    assert.match(cookie, /Expires=Thu, 01 Jan 1970 00:00:00 GMT/)
  })

  it('remains successful when no session cookie exists', async (context) => {
    const { app } = createTestApp()
    context.after(() => app.close())

    const response = await app.inject({
      method: 'POST',
      url: '/api/auth/logout',
    })

    assert.equal(response.statusCode, 204)
    assert.match(getSessionCookie(response.headers['set-cookie']), /^session=;/)
  })
})
