import { Link, useParams } from 'react-router-dom'

export default function EditorPage() {
  const { sessionId } = useParams()

  return (
    <section className="rounded-panel border border-line bg-paper p-8 shadow-panel">
      <p className="text-sm font-semibold text-brand">创作会话</p>
      <h1 className="mt-2 text-3xl font-semibold tracking-tight">编辑器</h1>
      <p className="mt-4 text-sm text-muted">会话 ID：{sessionId}</p>
      <p className="mt-8 text-muted">编辑器的具体能力会在对应创作流程接入时实现。</p>
      <Link to="/create" className="mt-8 inline-flex text-sm font-semibold text-brand-strong hover:underline">
        返回创作空间
      </Link>
    </section>
  )
}
