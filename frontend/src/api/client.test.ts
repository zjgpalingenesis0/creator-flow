import { afterEach, describe, expect, it, vi } from 'vitest'

import { api, ApiError } from './client'

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('api client', () => {
  it('prefixes GET requests with /api and returns JSON', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ name: 'CreatorFlow API' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    )
    vi.stubGlobal('fetch', fetchMock)

    await expect(api.get<{ name: string }>('/')).resolves.toEqual({
      name: 'CreatorFlow API',
    })
    expect(fetchMock).toHaveBeenCalledOnce()

    const [url, init] = fetchMock.mock.calls[0]!
    expect(url).toBe('/api/')
    expect(init.credentials).toBe('same-origin')
  })

  it('serializes a POST body as JSON', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ id: 'user-id', username: 'demo_user' }), {
        status: 201,
        headers: { 'Content-Type': 'application/json' },
      }),
    )
    vi.stubGlobal('fetch', fetchMock)

    await api.post('/auth/register', {
      username: 'demo_user',
      password: 'secret123',
    })

    const [, init] = fetchMock.mock.calls[0]!
    expect(init.method).toBe('POST')
    expect(init.body).toBe(
      JSON.stringify({ username: 'demo_user', password: 'secret123' }),
    )
    expect(new Headers(init.headers).get('Content-Type')).toBe('application/json')
  })

  it('returns undefined for a 204 response without parsing JSON', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(null, { status: 204 }))
    vi.stubGlobal('fetch', fetchMock)

    await expect(api.post<void>('/auth/logout')).resolves.toBeUndefined()
  })

  it('throws an ApiError with the backend message and status', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ message: '用户名或密码错误' }), {
        status: 401,
        statusText: 'Unauthorized',
        headers: { 'Content-Type': 'application/json' },
      }),
    )
    vi.stubGlobal('fetch', fetchMock)

    await expect(api.post('/auth/login', {})).rejects.toMatchObject({
      name: 'ApiError',
      message: '用户名或密码错误',
      status: 401,
    } satisfies Partial<ApiError>)
  })

  it('falls back to the HTTP status text when the error body is not JSON', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response('upstream unavailable', {
        status: 502,
        statusText: 'Bad Gateway',
      }),
    )
    vi.stubGlobal('fetch', fetchMock)

    await expect(api.get('/jobs')).rejects.toMatchObject({
      name: 'ApiError',
      message: 'Bad Gateway',
      status: 502,
    } satisfies Partial<ApiError>)
  })
})
