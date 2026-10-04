import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import App from './App'

describe('CreatorFlow app', () => {
  it('renders the project identity', () => {
    const html = renderToStaticMarkup(<App />)

    expect(html).toMatch(/CreatorFlow/)
    expect(html).toMatch(/灵创工作台/)
  })

  it('uses semantic design-token classes', () => {
    const html = renderToStaticMarkup(<App />)

    expect(html).toContain('bg-canvas')
    expect(html).toContain('bg-paper')
    expect(html).toContain('text-ink')
    expect(html).toContain('text-brand')
    expect(html).toContain('rounded-panel')
    expect(html).toContain('shadow-panel')
  })
})
