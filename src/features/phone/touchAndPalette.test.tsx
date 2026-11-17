import { act, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { stubMedia } from '../../../tests/media'
import { App } from '../../app/App'
import { COMMANDS, commandEnabled } from '../../commands/registry'
import { createAppStore, initStore } from '../../store/store'
import { Toaster } from '../../ui/Toaster'
import { toast } from '../../ui/toast'
import { phoneStore } from './phoneStore'

let media: ReturnType<typeof stubMedia>
beforeEach(() => phoneStore.setState({ stack: [], previewByTab: {} }))
afterEach(() => media?.restore())
const cmd = (id: string) => COMMANDS.find((c) => c.id === id)!

describe('command palette on phones', () => {
  it('hides Toggle sidebar and offers Open Library instead', () => {
    media = stubMedia({ phone: true })
    const store = initStore(createAppStore())
    const s = store.getState()
    expect(commandEnabled(cmd('view.sidebar'), s)).toBe(false)
    expect(commandEnabled(cmd('library.open'), s)).toBe(true)
    cmd('library.open').run({ store })
    expect(phoneStore.getState().stack).toEqual(['library'])
  })

  it('on laptops, Open Library is hidden and Toggle sidebar stays', () => {
    media = stubMedia({ phone: false })
    const store = initStore(createAppStore())
    expect(commandEnabled(cmd('library.open'), store.getState())).toBe(false)
    expect(commandEnabled(cmd('view.sidebar'), store.getState())).toBe(true)
  })

  it('the preview command toggles the phone view on phones and cycles split on laptops', () => {
    media = stubMedia({ phone: true })
    const store = initStore(createAppStore())
    const id = store.getState().newNote()
    store.getState().setNoteMode(id, 'markdown')
    cmd('view.preview.cycle').run({ store })
    expect(phoneStore.getState().previewByTab[id]).toBe(true)
    expect(store.getState().session.perTab[id]?.previewMode ?? 'edit').toBe('edit')
    media.set({ phone: false })
    cmd('view.preview.cycle').run({ store })
    expect(store.getState().session.perTab[id].previewMode).toBe('split')
  })
})

describe('touch fixes in the laptop layout', () => {
  it('tab close buttons are visible without hover on touch screens', () => {
    media = stubMedia({ phone: false, touch: true })
    const store = initStore(createAppStore())
    act(() => {
      store.getState().newNote()
      store.getState().newNote()
    })
    const { container } = render(<App />)
    // Close buttons sit beside each tab (tabIndex -1), so query them directly.
    const closes = container.querySelectorAll('[role="tablist"] button[aria-label^="Close "]')
    expect(closes.length).toBe(2)
    for (const b of closes) expect(b.className).not.toContain('opacity-0')
  })
})

describe('toasts on phones', () => {
  it('sit above the keyboard and the toolbar', () => {
    media = stubMedia({ phone: true })
    render(<Toaster />)
    act(() => void toast('Saved'))
    const region = screen.getByText('Saved').closest('[data-toaster]') as HTMLElement
    expect(region.className).toContain(
      'bottom-[calc(var(--kb,0px)+56px+env(safe-area-inset-bottom))]',
    )
  })
})
