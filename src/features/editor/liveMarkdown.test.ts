import { markdown, markdownLanguage } from '@codemirror/lang-markdown'
import { forceParsing } from '@codemirror/language'
import { EditorState } from '@codemirror/state'
import { EditorView } from '@codemirror/view'
import { undo, history } from '@codemirror/commands'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { liveMarkdown, safeLinkUrl } from './liveMarkdown'

let view: EditorView | null = null
afterEach(() => {
  view?.destroy()
  view = null
})

/** An editor with the cursor at `cursor` (default: the very end). */
function editor(doc: string, cursor = doc.length) {
  view = new EditorView({
    state: EditorState.create({
      doc,
      selection: { anchor: cursor },
      extensions: [history(), markdown({ base: markdownLanguage }), liveMarkdown],
    }),
    parent: document.body,
  })
  forceParsing(view, doc.length, 1000)
  // Let the plugin see the finished tree.
  view.dispatch({})
  return view
}

const lines = (v: EditorView) => [...v.contentDOM.querySelectorAll('.cm-line')] as HTMLElement[]
const text = (v: EditorView, n: number) => lines(v)[n].textContent

describe('formatted while you type', () => {
  it('hides bold, italic, strike and code marks away from the cursor line', () => {
    const v = editor('**bold** _it_ ~~gone~~ `x`\n\nend')
    expect(text(v, 0)).toBe('bold it gone x')
    expect(lines(v)[0].querySelector('.cm-md-code')?.textContent).toBe('x')
  })

  it('shows the marks again on the line being edited', () => {
    const v = editor('**bold** here\nnext', 3)
    expect(text(v, 0)).toBe('**bold** here')
  })

  it('makes headings bigger and hides # away from the cursor', () => {
    const v = editor('# Title\n### Small\n\nend')
    expect(lines(v)[0].classList).toContain('cm-md-h1')
    expect(lines(v)[1].classList).toContain('cm-md-h3')
    expect(text(v, 0)).toBe('Title')
    v.dispatch({ selection: { anchor: 2 } })
    expect(text(v, 0)).toBe('# Title')
    expect(lines(v)[0].classList).toContain('cm-md-h1')
  })

  it('shows bullets, quotes and rules', () => {
    const v = editor('- one\n* two\n1. three\n\n> said\n\n---\n\nend')
    expect(lines(v)[0].querySelector('.cm-md-bullet')).not.toBeNull()
    expect(text(v, 0)).toBe('• one')
    expect(text(v, 2)).toBe('1. three')
    expect(lines(v)[4].classList).toContain('cm-md-quote')
    expect(text(v, 4)).toBe('said')
    expect(lines(v)[6].querySelector('.cm-md-hr')).not.toBeNull()
  })

  it('shows a link as its text, keeping the address in the note', () => {
    const v = editor('see [Blankleaf](https://example.com) now\n\nend')
    expect(text(v, 0)).toBe('see Blankleaf now')
    const link = lines(v)[0].querySelector('.cm-md-link') as HTMLElement
    expect(link.dataset.href).toBe('https://example.com')
    expect(v.state.doc.line(1).text).toBe('see [Blankleaf](https://example.com) now')
  })

  it('leaves [[note links]] alone', () => {
    const v = editor('go to [[Plans]] today\n\nend')
    expect(text(v, 0)).toBe('go to [[Plans]] today')
  })

  it('a checkbox toggles the task in the text, in one undo step', () => {
    const v = editor('- [ ] milk\n- [x] eggs\n\nend')
    const boxes = v.contentDOM.querySelectorAll<HTMLInputElement>('input.cm-md-check')
    expect(boxes).toHaveLength(2)
    expect(boxes[1].checked).toBe(true)
    expect(lines(v)[1].classList).toContain('cm-md-done')
    boxes[0].dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true }))
    expect(v.state.doc.line(1).text).toBe('- [x] milk')
    undo(v)
    expect(v.state.doc.line(1).text).toBe('- [ ] milk')
  })

  it('Ctrl/⌘-click opens http links only', () => {
    const open = vi.spyOn(window, 'open').mockReturnValue(null)
    const v = editor('[a](https://x.test) [b](javascript:alert(1))\n\nend')
    const [a, b] = lines(v)[0].querySelectorAll<HTMLElement>('.cm-md-link')
    a.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, ctrlKey: true, metaKey: true }))
    b.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, ctrlKey: true, metaKey: true }))
    expect(open).toHaveBeenCalledTimes(1)
    expect(open).toHaveBeenCalledWith('https://x.test/', '_blank', 'noopener')
    open.mockRestore()
  })

  it('safeLinkUrl accepts web and mail addresses only', () => {
    expect(safeLinkUrl('https://a.b/c')).toBe('https://a.b/c')
    expect(safeLinkUrl('mailto:me@x.test')).toBe('mailto:me@x.test')
    expect(safeLinkUrl('javascript:alert(1)')).toBeNull()
    expect(safeLinkUrl('data:text/html,hi')).toBeNull()
    expect(safeLinkUrl('not a url')).toBeNull()
  })

  it('leaves fenced code untouched', () => {
    const v = editor('```js\nconst a = `x`\n```\n\nend')
    expect(text(v, 1)).toBe('const a = `x`')
  })
})
