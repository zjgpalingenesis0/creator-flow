import { useState, type FormEvent } from 'react'
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router-dom'

import { ApiError } from '@/api/client'
import { useAuthActions, useCurrentUser } from '@/hooks/useAuth'

type Mode = 'login' | 'register'

export default function AuthPage() {
  const [params] = useSearchParams()
  const mode: Mode = params.get('mode') === 'register' ? 'register' : 'login'
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const { user, isLoading } = useCurrentUser()
  const { login, register } = useAuthActions()
  const navigate = useNavigate()
  const action = mode === 'login' ? login : register

  if (isLoading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-canvas text-sm text-muted">
        正在确认登录状态…
      </main>
    )
  }

  if (user) {
    return <Navigate to="/create" replace />
  }

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    action.mutate(
      { username, password },
      { onSuccess: () => navigate('/create', { replace: true }) },
    )
  }

  const errorMessage =
    action.error instanceof ApiError ? action.error.message : action.error ? '操作失败，请稍后重试' : null

  return (
    <main className="grid min-h-screen bg-canvas font-sans text-ink lg:grid-cols-[0.9fr_1.1fr]">
      <section className="hidden bg-ink p-12 text-paper lg:flex lg:flex-col lg:justify-between">
        <Link to="/" className="text-lg font-semibold">
          CreatorFlow
        </Link>
        <div>
          <p className="text-sm tracking-[0.2em] text-brand">灵感从这里流动</p>
          <p className="mt-5 max-w-lg text-4xl font-semibold leading-tight">
            把想法带进工作台，
            <br />让创作自然发生。
          </p>
        </div>
        <p className="text-sm text-faint">图片与演示文稿创作空间</p>
      </section>

      <section className="flex items-center justify-center px-5 py-12 sm:px-8">
        <div className="w-full max-w-md rounded-panel border border-line bg-paper p-7 shadow-panel sm:p-10">
          <Link to="/" className="text-sm font-semibold text-brand lg:hidden">
            CreatorFlow
          </Link>
          <p className="mt-6 text-sm text-muted lg:mt-0">
            {mode === 'login' ? '欢迎回来' : '开始你的创作旅程'}
          </p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight">
            {mode === 'login' ? '登录 CreatorFlow' : '创建你的账号'}
          </h1>

          <form className="mt-8 space-y-5" onSubmit={submit}>
            <label className="block text-sm font-medium">
              用户名
              <input
                value={username}
                onChange={(event) => setUsername(event.target.value)}
                minLength={3}
                maxLength={32}
                autoComplete="username"
                required
                className="mt-2 w-full rounded-control border border-line bg-paper px-4 py-3 outline-none transition focus:border-brand focus:ring-3 focus:ring-brand-soft"
              />
            </label>
            <label className="block text-sm font-medium">
              密码
              <input
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                minLength={6}
                maxLength={64}
                autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                required
                className="mt-2 w-full rounded-control border border-line bg-paper px-4 py-3 outline-none transition focus:border-brand focus:ring-3 focus:ring-brand-soft"
              />
            </label>

            {errorMessage && (
              <p role="alert" className="rounded-control bg-red-50 px-4 py-3 text-sm text-danger">
                {errorMessage}
              </p>
            )}

            <button
              type="submit"
              disabled={action.isPending}
              className="w-full rounded-control bg-ink px-5 py-3.5 text-sm font-semibold text-paper transition hover:bg-brand-strong disabled:cursor-wait disabled:opacity-60"
            >
              {action.isPending ? '请稍候…' : mode === 'login' ? '登录' : '注册'}
            </button>
          </form>

          <p className="mt-7 text-center text-sm text-muted">
            {mode === 'login' ? '还没有账号？' : '已经有账号？'}{' '}
            <Link
              to={mode === 'login' ? '/auth?mode=register' : '/auth'}
              className="font-semibold text-brand-strong hover:underline"
            >
              {mode === 'login' ? '立即注册' : '返回登录'}
            </Link>
          </p>
        </div>
      </section>
    </main>
  )
}
