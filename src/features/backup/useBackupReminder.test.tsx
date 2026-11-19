import { act, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { createAppStore, initStore } from '../../store/store'
import { toastStore } from '../../ui/toast'
import { useBackupReminder } from './useBackupReminder'

beforeEach(() => vi.useFakeTimers())
afterEach(() => vi.useRealTimers())

const reminders = () =>
  toastStore.getState().toasts.filter((t) => /live only in this browser/.test(t.msg))

it('waits until zen mode is over before asking for a backup', () => {
  const store = initStore(createAppStore())
  store.getState().updateContent(store.getState().newNote(), 'my own words')
  act(() => store.getState().toggleZen())
  renderHook(() => useBackupReminder())
  act(() => void vi.advanceTimersByTime(6000))
  expect(reminders()).toHaveLength(0)
  act(() => store.getState().toggleZen())
  act(() => void vi.advanceTimersByTime(6000))
  expect(reminders()).toHaveLength(1)
})
