import { Link } from 'react-router-dom'

import { useCurrentUser } from '@/hooks/useAuth'

export default function LandingPage() {
  const { user, isLoading } = useCurrentUser()
  const entry = user
    ? { navigationLabel: '进入工作台', primaryLabel: '进入工作台', to: '/create' }
    : { navigationLabel: '快速进入', primaryLabel: '快速开始', to: '/auth' }

  return (
    <main className="min-h-screen overflow-hidden bg-canvas px-5 font-sans text-ink sm:px-8">
      <div className="mx-auto max-w-6xl">
        <nav className="flex items-center justify-between py-6">
          <Link to="/" className="text-lg font-semibold tracking-tight">
            CreatorFlow
          </Link>
          {!isLoading && (
            <Link
              to={entry.to}
              className="rounded-control border border-line bg-paper px-4 py-2 text-sm font-medium shadow-sm transition hover:border-brand"
            >
              {entry.navigationLabel}
            </Link>
          )}
        </nav>

        <section className="grid min-h-[calc(100vh-88px)] items-center gap-12 py-14 lg:grid-cols-[1.1fr_0.9fr]">
          <div>
            <p className="text-sm font-semibold tracking-[0.22em] text-brand">CREATORFLOW</p>
            <h1 className="mt-5 max-w-3xl text-5xl font-semibold leading-[1.08] tracking-[-0.04em] sm:text-6xl">
              让每一次创作，
              <span className="text-brand-strong">都有清晰的起点</span>
            </h1>
            <p className="mt-7 max-w-xl text-lg leading-8 text-muted">
              在一个工作台里组织素材、启动创作流程，并逐步完成图片与演示文稿等内容。
            </p>
            {!isLoading && (
              <Link
                to={entry.to}
                className="mt-9 inline-flex rounded-control bg-ink px-6 py-3.5 text-sm font-semibold text-paper transition hover:bg-brand-strong"
              >
                {entry.primaryLabel}
              </Link>
            )}
          </div>

          <div className="relative mx-auto w-full max-w-lg">
            <div className="absolute -inset-8 rounded-full bg-brand-soft blur-3xl" />
            <div className="relative rounded-panel border border-line bg-paper p-5 shadow-panel">
              <div className="flex items-center gap-2 border-b border-line pb-4">
                <span className="size-2.5 rounded-full bg-danger" />
                <span className="size-2.5 rounded-full bg-accent" />
                <span className="size-2.5 rounded-full bg-success" />
              </div>
              <div className="grid gap-4 pt-5 sm:grid-cols-2">
                <div className="rounded-card bg-brand-soft p-5">
                  <p className="text-xs font-medium text-brand-strong">图片创作</p>
                  <div className="mt-10 h-28 rounded-control bg-paper/80" />
                </div>
                <div className="rounded-card bg-canvas p-5">
                  <p className="text-xs font-medium text-muted">演示文稿</p>
                  <div className="mt-4 space-y-3">
                    <div className="h-3 w-4/5 rounded-full bg-line" />
                    <div className="h-3 w-full rounded-full bg-line" />
                    <div className="h-3 w-3/5 rounded-full bg-line" />
                  </div>
                  <div className="mt-9 h-10 rounded-control bg-accent" />
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>
    </main>
  )
}
