import { Link, Outlet, useNavigate } from 'react-router-dom'

import { useAuthActions, useCurrentUser } from '@/hooks/useAuth'

export default function WorkbenchLayout() {
  const { user } = useCurrentUser()
  const { logout } = useAuthActions()
  const navigate = useNavigate()

  const handleLogout = () => {
    logout.mutate(undefined, {
      onSuccess: () => navigate('/', { replace: true }),
    })
  }

  return (
    <div className="min-h-screen bg-canvas font-sans text-ink">
      <header className="border-b border-line bg-paper">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-4 sm:px-8">
          <Link to="/create" className="flex items-center gap-3" aria-label="CreatorFlow 工作台">
            <span className="grid size-9 place-items-center rounded-control bg-ink text-sm font-semibold text-paper">
              CF
            </span>
            <span>
              <span className="block text-sm font-semibold">CreatorFlow</span>
              <span className="block text-xs text-muted">灵创工作台</span>
            </span>
          </Link>

          <div className="flex items-center gap-3">
            <span className="hidden text-sm text-muted sm:inline">{user?.username}</span>
            <button
              type="button"
              onClick={handleLogout}
              disabled={logout.isPending}
              className="rounded-control border border-line px-4 py-2 text-sm transition hover:border-brand hover:text-brand disabled:cursor-wait disabled:opacity-60"
            >
              {logout.isPending ? '正在退出…' : '退出登录'}
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-5 py-10 sm:px-8 sm:py-14">
        <Outlet />
      </main>
    </div>
  )
}
