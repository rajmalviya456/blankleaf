import { act, renderHook, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { createAppStore, initStore } from '../../store/store'
import { phoneStore } from './phoneStore'
import { useBackToClose } from './useBackToClose'

const st = () => phoneStore.getState()
/** Wait for the browser's next popstate (jsdom fires it a moment after history.back()). */
const popped = () => new Promise((r) => window.addEventListener('popstate', r, { once: true }))
const back = async () => {
  await act(async () => {
    const done = popped()
    history.back()
    await done
  })
}

beforeEach(() => phoneStore.setState({ stack: [], librarySection: 'notes', previewByTab: {} }))
afterEach(() => phoneStore.setState({ stack: [] }))

describe('phone overlays', () => {
  it('open pushes one history entry per overlay and Back closes only the top one', async () => {
    renderHook(() => useBackToClose())
    const start = history.length
    act(() => st().open('library'))
    act(() => st().open({ kind: 'noteActions', noteId: 'n1' }))
    expect(history.length).toBe(start + 2)
    await back()
    expect(st().stack).toEqual(['library'])
    await back()
    expect(st().stack).toEqual([])
  })

  it('closing with ✕ pops its own history entry', async () => {
    renderHook(() => useBackToClose())
    const before = history.state
    act(() => st().open('tabs'))
    act(() => st().close())
    expect(st().stack).toEqual([])
    // Under load the browser's history can take a while to catch up: wait for it, not a guess.
    await waitFor(() => expect(history.state).toEqual(before))
  })

  it('Back with no overlay open is not intercepted', async () => {
    renderHook(() => useBackToClose())
    history.pushState({ app: 'page' }, '')
    history.pushState({ app: 'page2' }, '')
    await back()
    expect(history.state).toEqual({ app: 'page' })
    expect(st().stack).toEqual([])
  })

  it('unmounting (layout switch to laptop) closes all and removes pushed entries', async () => {
    const hook = renderHook(() => useBackToClose())
    history.pushState({ app: 'base' }, '')
    act(() => st().open('library'))
    act(() => st().open('menu'))
    act(() => hook.unmount())
    expect(st().stack).toEqual([])
    await waitFor(() => expect(history.state).toEqual({ app: 'base' }))
  })

  it('setPreview stores per tab and never touches the app session', () => {
    const app = initStore(createAppStore())
    const id = app.getState().newNote()
    const before = app.getState().session
    st().setPreview(id, true)
    expect(st().previewByTab[id]).toBe(true)
    expect(app.getState().session).toBe(before)
  })
})
