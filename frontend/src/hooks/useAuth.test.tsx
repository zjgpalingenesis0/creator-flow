// @vitest-environment jsdom

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, cleanup, renderHook, waitFor } from '@testing-library/react'
import type { PropsWithChildren } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { useAuthActions, useCurrentUser } from './useAuth'

const USER = {
  id: '9cb48148-6219-4c15-bd7b-3f75ac82d7de',
  username: 'demo_user',
}

function createQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  })
}

function createWrapper(queryClient: QueryClient) {
  return function Wrapper({ children }: PropsWithChildren) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  }
}

function userResponse() {
  return new Response(JSON.stringify(USER), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  })
}

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

describe('useCurrentUser', () => {
  it('loads and exposes the current user', async () => {
    const fetchMock = vi.fn().mockResolvedValue(userResponse())
    vi.stubGlobal('fetch', fetchMock)
    const queryClient = createQueryClient()

    const { result } = renderHook(() => useCurrentUser(), {
      wrapper: createWrapper(queryClient),
    })

    expect(result.current).toEqual({ user: null, isLoading: true })
    await waitFor(() => expect(result.current.user).toEqual(USER))
    expect(result.current.isLoading).toBe(false)
    expect(fetchMock).toHaveBeenCalledOnce()
  })

  it('settles as logged out without retrying when /me returns 401', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ message: '未登录或会话已过期' }), {
        status: 401,
        statusText: 'Unauthorized',
        headers: { 'Content-Type': 'application/json' },
      }),
    )
    vi.stubGlobal('fetch', fetchMock)
    const queryClient = createQueryClient()

    const { result } = renderHook(() => useCurrentUser(), {
      wrapper: createWrapper(queryClient),
    })

    await waitFor(() => expect(result.current.isLoading).toBe(false))
    expect(result.current.user).toBeNull()
    expect(fetchMock).toHaveBeenCalledOnce()
  })
})

describe('useAuthActions', () => {
  it.each([
    ['login', '/api/auth/login'],
    ['register', '/api/auth/register'],
  ] as const)('%s caches the authenticated user', async (action, expectedUrl) => {
    const fetchMock = vi.fn().mockResolvedValue(userResponse())
    vi.stubGlobal('fetch', fetchMock)
    const queryClient = createQueryClient()
    const { result } = renderHook(() => useAuthActions(), {
      wrapper: createWrapper(queryClient),
    })

    await act(async () => {
      await result.current[action].mutateAsync({
        username: 'demo_user',
        password: 'secret123',
      })
    })

    expect(queryClient.getQueryData(['auth', 'me'])).toEqual(USER)
    expect(fetchMock).toHaveBeenCalledWith(expectedUrl, expect.any(Object))
  })

  it('logout clears cached user data and keeps the auth state logged out', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(null, { status: 204 }))
    vi.stubGlobal('fetch', fetchMock)
    const queryClient = createQueryClient()
    queryClient.setQueryData(['auth', 'me'], USER)
    queryClient.setQueryData(['jobs'], [{ id: 'job-1' }])
    const { result } = renderHook(() => useAuthActions(), {
      wrapper: createWrapper(queryClient),
    })

    await act(async () => {
      await result.current.logout.mutateAsync()
    })

    expect(queryClient.getQueryData(['auth', 'me'])).toBeNull()
    expect(queryClient.getQueryData(['jobs'])).toBeUndefined()
  })
})
