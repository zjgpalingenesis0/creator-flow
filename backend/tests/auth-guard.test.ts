import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import { buildApp } from '../src/app.js'
import type { User } from '../src/repositories/users.js'
import { issueToken, SESSION_COOKIE } from '../src/security/token.js'
import type { AuthService } from '../src/services/auth.js'
import { testAssetOptions } from './support/assets.js'

const JWT_SECRET = 'test-secret-that-is-at-least-32-characters'
const USER_ID = '9cb48148-6219-4c15-bd7b-3f75ac82d7de'

const storedUser: User = {
  id: USER_ID,
  username: 'demo_user',
  passwordHash: 'hashed-password',
  createdAt: new Date('2026-10-04T00:00:00.000Z'),
}

function createTestApp() {
  const getByIdCalls: string[] = []
  const authService: AuthService = {
    async register() {
      throw new Error('Not used in this test')
    },
    async authenticate() {
      throw new Error('Not used in this test')
    },
    async getById(id) {
      getByIdCalls.push(id)
      return storedUser
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
      isProduction: false,
    },
  })

  return { app, getByIdCalls }
}

describe('requireCurrentUser', () => {
  it('exposes the authenticated user to a protected route', async (context) => {
    const { app, getByIdCalls } = createTestApp()
    context.after(() => app.close())
    assert.equal(typeof app.requireCurrentUser, 'function')

    app.get(
      '/protected',
      { preHandler: app.requireCurrentUser },
      async (request) => ({
        id: request.currentUser.id,
        username: request.currentUser.username,
      }),
    )
    const token = await issueToken(USER_ID, JWT_SECRET, 24)

    const response = await app.inject({
      method: 'GET',
      url: '/protected',
      headers: {
        cookie: `${SESSION_COOKIE}=${token}`,
      },
    })

    assert.equal(response.statusCode, 200)
    assert.deepEqual(response.json(), { id: USER_ID, username: 'demo_user' })
    assert.deepEqual(getByIdCalls, [USER_ID])
  })

  it('stops a protected route with 401 when no session exists', async (context) => {
    const { app, getByIdCalls } = createTestApp()
    context.after(() => app.close())
    assert.equal(typeof app.requireCurrentUser, 'function')

    let handlerCalled = false
    app.get(
      '/protected',
      { preHandler: app.requireCurrentUser },
      async () => {
        handlerCalled = true
        return { ok: true }
      },
    )

    const response = await app.inject({ method: 'GET', url: '/protected' })

    assert.equal(response.statusCode, 401)
    assert.deepEqual(response.json(), { message: '未登录或会话已过期' })
    assert.equal(handlerCalled, false)
    assert.deepEqual(getByIdCalls, [])
  })
})
