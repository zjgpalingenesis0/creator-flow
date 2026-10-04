export default function CreatePage() {
  return (
    <section>
      <p className="text-sm font-semibold text-brand">创作空间</p>
      <h1 className="mt-2 text-4xl font-semibold tracking-tight">开始创作</h1>
      <p className="mt-4 max-w-2xl text-muted">选择一种内容类型。具体创作流程会在后续步骤中接入。</p>

      <div className="mt-10 grid gap-5 md:grid-cols-2">
        <article className="rounded-card border border-line bg-paper p-7 shadow-sm">
          <span className="inline-flex rounded-chip bg-brand-soft px-3 py-1 text-xs font-semibold text-brand-strong">
            IMAGE
          </span>
          <h2 className="mt-5 text-xl font-semibold">图片创作</h2>
          <p className="mt-2 text-sm leading-6 text-muted">创建、调整并管理你的视觉内容。</p>
          <p className="mt-7 text-sm font-medium text-faint">即将接入</p>
        </article>

        <article className="rounded-card border border-line bg-paper p-7 shadow-sm">
          <span className="inline-flex rounded-chip bg-accent px-3 py-1 text-xs font-semibold text-ink">
            SLIDES
          </span>
          <h2 className="mt-5 text-xl font-semibold">演示文稿</h2>
          <p className="mt-2 text-sm leading-6 text-muted">从主题和内容出发，组织完整的演示文稿。</p>
          <p className="mt-7 text-sm font-medium text-faint">即将接入</p>
        </article>
      </div>
    </section>
  )
}
