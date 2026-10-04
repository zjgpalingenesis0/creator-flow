import { afterEach, describe, expect, it, vi } from 'vitest'

import { authApi } from './auth'

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('authApi', () => {
  it('maps authentication operations to their backend endpoints', async () => {
    const userResponse = () =>
      new Response(
        JSON.stringify({
          id: '9cb48148-6219-4c15-bd7b-3f75ac82d7de',
          username: 'demo_user',
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      )
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(userResponse())
      .mockResolvedValueOnce(userResponse())
      .mockResolvedValueOnce(userResponse())
      .mockResolvedValueOnce(new Response(null, { status: 204 }))
    vi.stubGlobal('fetch', fetchMock)

    const credentials = { username: 'demo_user', password: 'secret123' }
    await authApi.register(credentials)
    await authApi.login(credentials)
    await authApi.me()
    await authApi.logout()

    expect(fetchMock.mock.calls.map(([url, init]) => [url, init.method])).toEqual([
      ['/api/auth/register', 'POST'],
      ['/api/auth/login', 'POST'],
      ['/api/auth/me', 'GET'],
      ['/api/auth/logout', 'POST'],
    ])
  })
})
