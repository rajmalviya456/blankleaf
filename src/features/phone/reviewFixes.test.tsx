import { act, fireEvent, render, screen, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { stubMedia } from '../../../tests/media'
import { App } from '../../app/App'
import { COMMANDS } from '../../commands/registry'
import { createAppStore, initStore } from '../../store/store'
import { ConfirmDialog } from '../../ui/ConfirmDialog'
import { getActiveView } from '../editor/activeView'
import { shareStore } from '../share/shareStore'
import { phoneStore } from './phoneStore'

let media: ReturnType<typeof stubMedia>
beforeEach(() => phoneStore.setState({ stack: [], previewByTab: {}, librarySection: 'notes' }))
afterEach(() => {
  media?.restore()
  Object.defineProperty(window, 'visualViewport', { configurable: true, value: undefined })
})
const back = async () =>
  act(async () => {
    history.back()
    await new Promise((r) => setTimeout(r, 30))
  })

function setup() {
  media = stubMedia({ phone: true, touch: true })
  const store = initStore(createAppStore())
  const s = () => store.getState()
  const id = s().newNote()
  s().updateContent(id, 'alpha')
  render(<App />)
  return { s, id, store }
}

describe('Back closes app dialogs on phones', () => {
  it('Settings opened from the Library: Back closes Settings and stays in the app', async () => {
    const { s } = setup()
    act(() => s().setUi({ settingsOpen: true }))
    await screen.findByRole('dialog', { name: /settings/i })
    expect(phoneStore.getState().stack).toEqual([{ kind: 'app', id: 'settings' }])
    await back()
    expect(s().ui.settingsOpen).toBe(false)
    expect(phoneStore.getState().stack).toEqual([])
  })

  it('Share over the tabs sheet: Back closes Share first, then the sheet', async () => {
    const { id } = setup()
    act(() => phoneStore.getState().open('tabs'))
    await screen.findByRole('dialog', { name: 'Open tabs' })
    act(() => shareStore.getState().open(id))
    await back()
    expect(shareStore.getState().dialogNoteId).toBeNull()
    expect(phoneStore.getState().stack).toEqual(['tabs'])
  })

  it('closing a dialog itself removes it from the Back stack', async () => {
    const { s } = setup()
    act(() => s().setUi({ aboutOpen: true }))
    await screen.findByRole('dialog', { name: /about notepadz/i })
    act(() => s().setUi({ aboutOpen: false }))
    expect(phoneStore.getState().stack).toEqual([])
  })
})

describe('typing with the keyboard open', () => {
  it('keeps the caret in view when the keyboard opens, and pins the page to the top', () => {
    const vv = { height: 800, offsetTop: 0, l: new Set<() => void>() }
    Object.defineProperty(window, 'innerHeight', { configurable: true, value: 800 })
    Object.defineProperty(window, 'visualViewport', {
      configurable: true,
      value: {
        get height() {
          return vv.height
        },
        get offsetTop() {
          return vv.offsetTop
        },
        addEventListener: (_: string, cb: () => void) => vv.l.add(cb),
        removeEventListener: (_: string, cb: () => void) => vv.l.delete(cb),
      },
    })
    setup()
    const view = getActiveView()!
    const dispatch = vi.spyOn(view, 'dispatch')
    const scrollTo = vi.spyOn(window, 'scrollTo').mockImplementation(() => {})
    Object.defineProperty(window, 'scrollY', { configurable: true, value: 120 })
    act(() => {
      vv.height = 450
      vv.offsetTop = 120
      vv.l.forEach((cb) => cb())
    })
    expect(dispatch).toHaveBeenCalledWith(expect.objectContaining({ effects: expect.anything() }))
    expect(scrollTo).toHaveBeenCalledWith(0, 0)
    scrollTo.mockRestore()
    Object.defineProperty(window, 'scrollY', { configurable: true, value: 0 })
  })

  it('sheets sit above the keyboard', async () => {
    const { s } = setup()
    act(() => s().setUi({ settingsOpen: true }))
    const sheet = await screen.findByRole('dialog', { name: /settings/i })
    expect(sheet.className).toContain('bottom-[var(--kb,0px)]')
    expect(sheet.className).toContain('max-h-[calc(92dvh-var(--kb,0px))]')
  })
})

describe('long-press on a tab row', () => {
  it('opening the same overlay twice keeps one entry', () => {
    act(() => phoneStore.getState().open({ kind: 'tabActions', noteId: 'x' }))
    act(() => phoneStore.getState().open({ kind: 'tabActions', noteId: 'x' }))
    expect(phoneStore.getState().stack).toHaveLength(1)
  })

  it('a long-press opens the actions once and the lift does not switch tabs', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
    try {
      const { s } = setup()
      const other = s().newNote()
      act(() => s().updateContent(other, 'beta'))
      const active = s().session.activeTabId
      act(() => phoneStore.getState().open('tabs'))
      const sheet = await screen.findByRole('dialog', { name: 'Open tabs' })
      const row = within(sheet).getByRole('button', { name: 'alpha' })
      fireEvent.pointerDown(row)
      act(() => void vi.advanceTimersByTime(600))
      fireEvent.contextMenu(row)
      fireEvent.pointerUp(row)
      fireEvent.click(row)
      const actions = phoneStore.getState().stack.filter((o) => typeof o === 'object')
      expect(actions).toHaveLength(1)
      expect(s().session.activeTabId).toBe(active)
    } finally {
      vi.useRealTimers()
    }
  })
})

describe('palette search and trash on phones', () => {
  it('open the Library section instead of the hidden laptop sidebar', () => {
    const { store, s } = setup()
    const before = s().session.sidebar
    act(() => COMMANDS.find((c) => c.id === 'view.search')!.run({ store }))
    expect(phoneStore.getState().stack).toEqual(['library'])
    expect(phoneStore.getState().librarySection).toBe('search')
    act(() => phoneStore.getState().closeAll())
    act(() => COMMANDS.find((c) => c.id === 'view.trash')!.run({ store }))
    expect(phoneStore.getState().librarySection).toBe('trash')
    expect(s().session.sidebar).toEqual(before)
  })
})

describe('confirm buttons on phones', () => {
  it('are 44px targets', () => {
    media = stubMedia({ phone: true })
    render(
      <ConfirmDialog
        open
        onOpenChange={() => {}}
        title="Delete forever?"
        description="Gone."
        confirmLabel="Delete permanently"
        onConfirm={() => {}}
      />,
    )
    for (const name of ['Cancel', 'Delete permanently'])
      expect(screen.getByRole('button', { name }).className).toContain('max-sm:min-h-11')
  })
})
