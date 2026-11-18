import { render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { DEFAULT_SETTINGS, newNoteDraft } from '../../domain/defaults'
import { noteToHtml } from '../export/noteHtml'
import { MarkdownPreview } from './MarkdownPreview'
import { needsDiagrams, needsMath } from './richContent'

const engine = vi.hoisted(() => ({ renderDiagram: vi.fn() }))
vi.mock('./diagramEngine', () => engine)

beforeEach(() => {
  engine.renderDiagram.mockReset()
  engine.renderDiagram.mockResolvedValue('<svg data-testid="drawn"><text>Start</text></svg>')
})

describe('detecting rich content', () => {
  it('finds math and diagrams, and ignores prices', () => {
    expect(needsMath('Area $$x^2$$')).toBe(true)
    expect(needsMath('```math\nx\n```')).toBe(true)
    expect(needsMath('costs $5 and $10')).toBe(false)
    expect(needsDiagrams('```mermaid\ngraph TD\n```')).toBe(true)
    expect(needsDiagrams('say mermaid')).toBe(false)
  })
})

describe('math', () => {
  it('draws inline and block math', async () => {
    const { container } = render(
      <MarkdownPreview source={'Area is $$x^2$$ here\n\n$$\ny = 1\n$$\n\n```math\nz\n```'} />,
    )
    await waitFor(() => expect(container.querySelectorAll('math')).toHaveLength(3))
  })

  it('leaves money alone', async () => {
    const { container } = render(<MarkdownPreview source={'From $5 to $10, and $$a$$'} />)
    await waitFor(() => expect(container.querySelector('math')).not.toBeNull())
    expect(container).toHaveTextContent('From $5 to $10')
  })

  it('shows bad math without breaking the page', async () => {
    const { container } = render(<MarkdownPreview source={'$$\\frac{1$$ and **fine**'} />)
    await waitFor(() => expect(container.querySelector('strong')).toHaveTextContent('fine'))
  })

  it('can’t run scripts through math', async () => {
    const { container } = render(<MarkdownPreview source={'$$\\href{javascript:alert(1)}{x}$$'} />)
    await waitFor(() => expect(container.querySelector('math, .katex-error, code')).not.toBeNull())
    expect(container.querySelector('a[href^="javascript"]')).toBeNull()
  })
})

describe('diagrams', () => {
  const src = '```mermaid\ngraph TD; A-->B\n```'

  it('draws a Mermaid block', async () => {
    render(<MarkdownPreview source={src} />)
    expect(await screen.findByRole('img', { name: 'Diagram' })).toBeInTheDocument()
    expect(engine.renderDiagram).toHaveBeenCalledWith('graph TD; A-->B', false)
  })

  it('keeps the code visible when a diagram can’t be drawn', async () => {
    engine.renderDiagram.mockRejectedValue(new Error('bad'))
    render(<MarkdownPreview source={src} />)
    expect(await screen.findByText(/couldn’t be drawn/)).toBeInTheDocument()
    expect(screen.getByText('graph TD; A-->B')).toBeInTheDocument()
  })

  it('redraws when the theme changes', async () => {
    document.documentElement.dataset.theme = 'light'
    render(<MarkdownPreview source={src} />)
    await screen.findByRole('img', { name: 'Diagram' })
    document.documentElement.dataset.theme = 'dark'
    await waitFor(() =>
      expect(engine.renderDiagram).toHaveBeenLastCalledWith('graph TD; A-->B', true),
    )
    document.documentElement.dataset.theme = 'light'
  })

  it('leaves other code blocks alone', () => {
    const { container } = render(<MarkdownPreview source={'```js\nconst a = 1\n```'} />)
    expect(container.querySelector('pre code')).toHaveTextContent('const a = 1')
    expect(engine.renderDiagram).not.toHaveBeenCalled()
  })
})

describe('exports', () => {
  it('include drawn math and diagrams in the web page', async () => {
    const html = await noteToHtml({
      ...newNoteDraft(1, DEFAULT_SETTINGS),
      mode: 'markdown',
      content: '$$x$$\n\n```mermaid\ngraph TD; A-->B\n```',
    })
    expect(html).toContain('<math')
    expect(html).toContain('data-testid="drawn"')
  })
})
