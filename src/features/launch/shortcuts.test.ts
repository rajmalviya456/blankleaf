import { afterEach, describe, expect, it } from 'vitest'
import { createAppStore, initStore } from '../../store/store'
import { openToday } from '../templates/templates'
import { runLaunchShortcut, takeLaunchShortcut } from './launch'

afterEach(() => history.replaceState(null, '', '/'))

describe('app icon shortcuts', () => {
  it('reads the shortcut once and takes it out of the address bar', () => {
    history.replaceState(null, '', '/?shortcut=today&x=1')
    expect(takeLaunchShortcut()).toBe('today')
    expect(location.search).toBe('?x=1')
    expect(takeLaunchShortcut()).toBeNull()
  })

  it('ignores unknown shortcuts', () => {
    history.replaceState(null, '', '/?shortcut=delete-everything')
    expect(takeLaunchShortcut()).toBeNull()
  })

  it('New note opens a new empty note, reusing an empty one already open', () => {
    const store = initStore(createAppStore())
    const s = () => store.getState()
    s().updateContent(s().newNote(), 'written')
    runLaunchShortcut('new', store)
    const first = s().session.activeTabId!
    expect(s().notes[first].content).toBe('')
    runLaunchShortcut('new', store)
    expect(s().session.activeTabId).toBe(first)
  })

  it('Search notes opens the search', () => {
    const store = initStore(createAppStore())
    runLaunchShortcut('search', store)
    expect(store.getState().session.sidebar).toMatchObject({ open: true, panel: 'search' })
  })
})

describe("Today's note", () => {
  it('opens today’s journal, the same one all day', () => {
    const store = initStore(createAppStore())
    const now = new Date(2026, 10, 20, 9).getTime()
    const id = openToday(store, now)
    expect(store.getState().notes[id].content).toMatch(/^# Journal: /)
    expect(openToday(store, now + 3 * 3600_000)).toBe(id)
    expect(openToday(store, now + 24 * 3600_000)).not.toBe(id)
  })
})
