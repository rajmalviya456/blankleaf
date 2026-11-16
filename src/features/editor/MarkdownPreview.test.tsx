import { act, fireEvent, render, screen } from '@testing-library/react'
import { App } from '../../app/App'
import { createAppStore, initStore } from '../../store/store'
import { MarkdownPreview } from './MarkdownPreview'

describe('MarkdownPreview', () => {
  it('renders headings, lists and task lists', () => {
    render(
      <MarkdownPreview
        source={'# Title\n\n- one\n- [x] done\n\n| a | b |\n|---|---|\n| 1 | 2 |'}
      />,
    )
    expect(screen.getByRole('heading', { level: 1, name: 'Title' })).toBeInTheDocument()
    expect(screen.getAllByRole('listitem')).toHaveLength(2)
    expect(screen.getByRole('checkbox')).toBeChecked()
    expect(screen.getByRole('table')).toBeInTheDocument()
  })

  it('strips <script> and on* handlers', () => {
    const { container } = render(
      <MarkdownPreview
        source={
          '<img src=x onerror=alert(1)>\n\n<script>alert(1)</script>\n\n[x](javascript:alert(1))'
        }
      />,
    )
    expect(container.querySelector('script')).toBeNull()
    expect(container.innerHTML).not.toMatch(/onerror/i)
    expect(container.innerHTML).not.toMatch(/javascript:/i)
  })

  it('opens links in a new tab safely', () => {
    render(<MarkdownPreview source={'[site](https://example.com)'} />)
    const a = screen.getByRole('link', { name: 'site' })
    expect(a).toHaveAttribute('target', '_blank')
    expect(a).toHaveAttribute('rel', expect.stringContaining('noopener'))
  })
})

describe('preview modes', () => {
  function setup(mode: 'plain' | 'markdown') {
    const store = initStore(createAppStore())
    const id = store.getState().newNote()
    store.getState().updateContent(id, '# Hello')
    if (mode === 'markdown') store.getState().setLanguage(id, 'markdown')
    render(<App />)
    return { id, s: () => store.getState() }
  }
  const cycle = () =>
    act(() => void fireEvent.keyDown(window, { code: 'KeyP', key: 'p', altKey: true }))

  it('cycle goes edit → split → preview → edit', async () => {
    const { id, s } = setup('markdown')
    expect(screen.queryByRole('article', { name: /preview/i })).toBeNull()
    cycle()
    expect(s().session.perTab[id].previewMode).toBe('split')
    expect(await screen.findByRole('article', { name: /preview/i })).toBeInTheDocument()
    expect(document.querySelector('.cm-editor')).not.toBeNull()
    cycle()
    expect(s().session.perTab[id].previewMode).toBe('preview')
    expect(document.querySelector('.cm-editor')).toBeNull()
    cycle()
    expect(s().session.perTab[id].previewMode).toBe('edit')
  })

  it('preview toggle is only offered when mode is markdown', () => {
    const { id, s } = setup('plain')
    expect(screen.queryByRole('radiogroup', { name: /view/i })).toBeNull()
    cycle()
    expect(s().session.perTab[id]?.previewMode ?? 'edit').toBe('edit')
    act(() => s().setLanguage(id, 'markdown'))
    expect(screen.getByRole('radiogroup', { name: /view/i })).toBeInTheDocument()
  })
})
