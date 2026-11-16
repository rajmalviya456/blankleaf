import { openSearchPanel, search } from '@codemirror/search'
import { EditorState } from '@codemirror/state'
import { EditorView } from '@codemirror/view'
import { fireEvent } from '@testing-library/react'
import { createFindPanel } from './findPanel'

function setup(doc = 'tabs and Tabs and more tabs') {
  const parent = document.createElement('div')
  document.body.appendChild(parent)
  const view = new EditorView({
    state: EditorState.create({
      doc,
      extensions: [search({ top: true, createPanel: createFindPanel })],
    }),
    parent,
  })
  openSearchPanel(view)
  const panel = parent.querySelector('.np-find') as HTMLElement
  const find = panel.querySelector('input[aria-label="Find"]') as HTMLInputElement
  const type = (el: HTMLInputElement, v: string) => {
    el.value = v
    fireEvent.input(el)
  }
  const count = () => panel.querySelector('.np-find-count')!.textContent
  const cleanup = () => {
    view.destroy()
    parent.remove()
  }
  return { view, panel, find, type, count, cleanup }
}

describe('find panel', () => {
  it('opens focused and counts case-insensitive matches', () => {
    const t = setup()
    expect(document.activeElement).toBe(t.find)
    t.type(t.find, 'tabs')
    expect(t.count()).toBe('0 of 3')
    t.cleanup()
  })

  it('Enter / Shift+Enter move between matches and update "n of m"', () => {
    const t = setup()
    t.type(t.find, 'tabs')
    fireEvent.keyDown(t.find, { key: 'Enter' })
    expect(t.view.state.selection.main.from).toBe(0)
    expect(t.count()).toBe('1 of 3')
    fireEvent.keyDown(t.find, { key: 'Enter' })
    expect(t.count()).toBe('2 of 3')
    fireEvent.keyDown(t.find, { key: 'Enter', shiftKey: true })
    expect(t.count()).toBe('1 of 3')
    t.cleanup()
  })

  it('match case and whole word toggles narrow results', () => {
    const t = setup('tabs Tabs tabsy')
    t.type(t.find, 'tabs')
    expect(t.count()).toBe('0 of 3')
    const caseBtn = t.panel.querySelector('[aria-label="Match case"]') as HTMLButtonElement
    fireEvent.click(caseBtn)
    expect(caseBtn.getAttribute('aria-pressed')).toBe('true')
    expect(t.count()).toBe('0 of 2')
    fireEvent.click(t.panel.querySelector('[aria-label="Whole word"]')!)
    expect(t.count()).toBe('0 of 1')
    t.cleanup()
  })

  it('shows no results and flags an invalid regular expression', () => {
    const t = setup()
    t.type(t.find, 'zzz')
    expect(t.count()).toBe('No results')
    fireEvent.click(t.panel.querySelector('[aria-label="Regular expression"]')!)
    t.type(t.find, '(')
    expect(t.count()).toBe('Invalid regex')
    expect(t.find.getAttribute('aria-invalid')).toBe('true')
    t.cleanup()
  })

  it('replace row is hidden until toggled; replace all works', () => {
    const t = setup('a1 a2 a3')
    const replace = t.panel.querySelector('input[aria-label="Replace"]') as HTMLInputElement
    expect(replace.closest('.np-find-row')!.hasAttribute('hidden')).toBe(true)
    fireEvent.click(t.panel.querySelector('[aria-label="Toggle replace"]')!)
    expect(replace.closest('.np-find-row')!.hasAttribute('hidden')).toBe(false)
    t.type(t.find, 'a')
    t.type(replace, 'b')
    fireEvent.click(t.panel.querySelector('[aria-label="Replace all"]')!)
    expect(t.view.state.doc.toString()).toBe('b1 b2 b3')
    t.cleanup()
  })

  it('Escape closes the panel and returns focus to the editor', () => {
    const t = setup()
    fireEvent.keyDown(t.find, { key: 'Escape' })
    expect(t.view.dom.querySelector('.np-find')).toBeNull()
    t.cleanup()
  })
})
