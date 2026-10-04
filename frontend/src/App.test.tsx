// @vitest-environment jsdom

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import App from './App'

const USER = {
  id: '9cb48148-6219-4c15-bd7b-3f75ac82d7de',
  username: 'demo_user',
}

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

function renderApp(path: string, fetchMock: ReturnType<typeof vi.fn>) {
  window.history.replaceState({}, '', path)
  vi.stubGlobal('fetch', fetchMock)

  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  })

  return render(
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>,
  )
}

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

describe('CreatorFlow routes', () => {
  it('redirects unauthenticated visitors from /create to /auth', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(jsonResponse({ message: '未登录或会话已过期' }, 401))

    renderApp('/create', fetchMock)

    expect(screen.getByText('正在确认登录状态…')).toBeTruthy()
    expect(await screen.findByRole('heading', { name: '登录 CreatorFlow' })).toBeTruthy()
    expect(window.location.pathname).toBe('/auth')
  })

  it('renders the protected workbench for an authenticated user', async () => {
    renderApp('/create', vi.fn().mockResolvedValue(jsonResponse(USER)))

    expect(await screen.findByRole('heading', { name: '开始创作' })).toBeTruthy()
    expect(screen.getByText('demo_user')).toBeTruthy()
  })

  it('shows the correct landing entry for the current auth state', async () => {
    const { unmount } = renderApp('/', vi.fn().mockResolvedValue(jsonResponse(USER)))

    const authenticatedEntries = await screen.findAllByRole('link', { name: '进入工作台' })
    expect(authenticatedEntries.every((link) => link.getAttribute('href') === '/create')).toBe(true)

    unmount()
    renderApp(
      '/',
      vi.fn().mockResolvedValue(jsonResponse({ message: '未登录或会话已过期' }, 401)),
    )
    expect((await screen.findByRole('link', { name: '快速进入' })).getAttribute('href')).toBe(
      '/auth',
    )
    expect(screen.getByRole('link', { name: '快速开始' }).getAttribute('href')).toBe('/auth')
  })
})

describe('authentication pages', () => {
  it.each([
    ['login', '登录 CreatorFlow', '/api/auth/login'],
    ['register', '创建你的账号', '/api/auth/register'],
  ] as const)('submits %s and enters the workbench', async (mode, title, endpoint) => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse({ message: '未登录或会话已过期' }, 401))
      .mockResolvedValueOnce(jsonResponse(USER))

    renderApp(`/auth?mode=${mode}`, fetchMock)
    expect(await screen.findByRole('heading', { name: title })).toBeTruthy()

    fireEvent.change(screen.getByLabelText('用户名'), { target: { value: 'demo_user' } })
    fireEvent.change(screen.getByLabelText('密码'), { target: { value: 'secret123' } })
    fireEvent.click(screen.getByRole('button', { name: mode === 'login' ? '登录' : '注册' }))

    expect(await screen.findByRole('heading', { name: '开始创作' })).toBeTruthy()
    expect(fetchMock).toHaveBeenLastCalledWith(
      endpoint,
      expect.objectContaining({ method: 'POST' }),
    )
    expect(window.location.pathname).toBe('/create')
  })

  it('shows the server error when login fails', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse({ message: '未登录或会话已过期' }, 401))
      .mockResolvedValueOnce(jsonResponse({ message: '用户名或密码错误' }, 401))

    renderApp('/auth', fetchMock)
    await screen.findByRole('heading', { name: '登录 CreatorFlow' })
    fireEvent.change(screen.getByLabelText('用户名'), { target: { value: 'demo_user' } })
    fireEvent.change(screen.getByLabelText('密码'), { target: { value: 'wrong-password' } })
    fireEvent.click(screen.getByRole('button', { name: '登录' }))

    expect((await screen.findByRole('alert')).textContent).toContain('用户名或密码错误')
  })

  it('logs out from the workbench and returns to the landing page', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse(USER))
      .mockResolvedValueOnce(new Response(null, { status: 204 }))

    renderApp('/create', fetchMock)
    fireEvent.click(await screen.findByRole('button', { name: '退出登录' }))

    await waitFor(() => expect(window.location.pathname).toBe('/'))
    expect(screen.getByRole('heading', { name: /让每一次创作.*都有清晰的起点/ })).toBeTruthy()
  })
})
