import { Navigate, Outlet, useLocation } from 'react-router-dom'

import { useCurrentUser } from '@/hooks/useAuth'

export default function RequireAuth() {
  const { user, isLoading } = useCurrentUser()
  const location = useLocation()

  if (isLoading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-canvas text-sm text-muted">
        正在确认登录状态…
      </main>
    )
  }

  return user ? <Outlet /> : <Navigate to="/auth" state={{ from: location }} replace />
}
