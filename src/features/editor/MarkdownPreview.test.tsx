import { act, fireEvent, render, screen, within } from '@testing-library/react'
import { App } from '../../app/App'
import { DEFAULT_SETTINGS, newNoteDraft } from '../../domain/defaults'
import { createAppStore, initStore } from '../../store/store'
import { noteToHtml } from '../export/noteHtml'
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

  it('shows a blank task line (as templates have) as a box that can be ticked', () => {
    const ticked: number[] = []
    const source = '- [ ]\n- [x]\n- [ ] real'
    render(<MarkdownPreview source={source} onToggleTask={(at) => ticked.push(at)} />)
    const boxes = screen.getAllByRole('checkbox')
    expect(boxes).toHaveLength(3)
    expect(boxes[1]).toBeChecked()
    expect(boxes[0]).toHaveAccessibleName('Empty task')
    expect(screen.queryByText('[ ]')).toBeNull()
    fireEvent.click(boxes[0])
    expect(ticked).toEqual([0])
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

  it('highlights fenced code by language', () => {
    const { container } = render(
      <MarkdownPreview source={'```js\nconst x = 1\n```\n\n```ruby\ndef test\nend\n```'} />,
    )
    const keywords = [...container.querySelectorAll('.hljs-keyword')].map((n) => n.textContent)
    expect(keywords).toEqual(expect.arrayContaining(['const', 'def', 'end']))
    expect(container.querySelector('.hljs-number')?.textContent).toBe('1')
  })

  it.each([
    ['dockerfile', 'FROM node:24\nRUN npm ci'],
    ['powershell', 'Get-ChildItem -Path C:\\ | Where-Object { $_.Length -gt 1 }'],
    ['nginx', 'server {\n  listen 80;\n}'],
  ])('highlights %s fences like the editor does', (lang, code) => {
    const { container } = render(<MarkdownPreview source={`\`\`\`${lang}\n${code}\n\`\`\``} />)
    expect(container.querySelectorAll('[class*="hljs-"]').length).toBeGreaterThan(0)
  })

  it('leaves unknown or unlabeled fences as plain text', () => {
    const { container } = render(
      <MarkdownPreview source={'```\nplain words\n```\n\n```nosuchlang\nx\n```'} />,
    )
    expect(container.querySelectorAll('[class*="hljs-"]')).toHaveLength(0)
    expect(container.textContent).toContain('plain words')
  })

  it('opens links in a new tab safely', () => {
    render(<MarkdownPreview source={'[site](https://example.com)'} />)
    const a = screen.getByRole('link', { name: 'site' })
    expect(a).toHaveAttribute('target', '_blank')
    expect(a).toHaveAttribute('rel', expect.stringContaining('noopener'))
  })

  it('shows a note nested thousands of levels deep as plain text (shared notes too)', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {}) // React reports the caught error
    const deep = '>'.repeat(3000) + ' x'
    expect(() => render(<MarkdownPreview source={deep} remoteImages={false} />)).not.toThrow()
    expect(screen.getByText(/couldn’t be shown as formatted text/)).toBeInTheDocument()
    vi.restoreAllMocks()
  })

  it.each(['[x](#note:%zz)', '[sale](#note:50%off)', '[x](#note:%E0%A4)'])(
    'shows a malformed note link (%s) instead of crashing',
    (source) => {
      const opened: string[] = []
      expect(() =>
        render(<MarkdownPreview source={source} onOpenNote={(t) => opened.push(t)} />),
      ).not.toThrow()
      fireEvent.click(screen.getByRole('link'))
      expect(opened).toHaveLength(1)
    },
  )
})

describe('footnotes and other in-page links', () => {
  const source = 'A claim[^1].\n\n[^1]: Source.'

  it('jump within the preview instead of opening a new tab', () => {
    const scroll = vi.spyOn(Element.prototype, 'scrollIntoView')
    render(<MarkdownPreview source={source} />)
    const ref = screen.getByRole('link', { name: '1' })
    expect(ref).not.toHaveAttribute('target')
    const footnote = document.getElementById(ref.getAttribute('href')!.slice(1))
    expect(footnote).not.toBeNull()
    fireEvent.click(ref)
    expect(scroll.mock.contexts).toContain(footnote)
    // The address bar's # belongs to the app (share links live there).
    expect(location.hash).toBe('')
    scroll.mockRestore()
  })

  it('take the focus along, and the back link returns to the reference', () => {
    render(<MarkdownPreview source={source} />)
    const ref = screen.getByRole('link', { name: '1' })
    fireEvent.click(ref)
    const footnote = document.activeElement as HTMLElement
    expect(footnote).toHaveTextContent('Source.')
    fireEvent.click(within(footnote).getByRole('link', { name: /back to reference/i }))
    expect(document.activeElement).toBe(ref)
  })

  it('keep the sanitizer’s id prefix, once, so a note can’t clobber page globals', () => {
    const { container } = render(<MarkdownPreview source={source} />)
    const ids = [...container.querySelectorAll('[id]')].map((e) => e.id)
    expect(ids.length).toBeGreaterThan(0)
    for (const id of ids) expect(id).toMatch(/^user-content-(?!user-content-)/)
  })

  it('work as plain anchors in an exported page', async () => {
    const html = await noteToHtml({
      ...newNoteDraft(1, DEFAULT_SETTINGS),
      mode: 'markdown',
      content: source,
    })
    const page = new DOMParser().parseFromString(html, 'text/html')
    const links = [...page.querySelectorAll('a[href^="#"]')]
    expect(links).toHaveLength(2)
    for (const a of links) {
      expect(a.getAttribute('target')).toBeNull()
      expect(page.getElementById(a.getAttribute('href')!.slice(1))).not.toBeNull()
    }
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
