import { act, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Toaster } from './Toaster'
import { toast, toastStore } from './toast'

beforeEach(() => toastStore.getState().clear())

describe('Toaster', () => {
  it('shows a toast and runs its action', async () => {
    const run = vi.fn()
    render(<Toaster />)
    act(() => void toast('Saved a copy', { action: { label: 'Undo', run } }))
    expect(screen.getByText('Saved a copy')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Undo' }))
    expect(run).toHaveBeenCalled()
    expect(screen.queryByText('Saved a copy')).toBeNull()
  })

  it('error toasts use role alert and keep at most 4', () => {
    render(<Toaster />)
    act(() => {
      for (let i = 0; i < 6; i++) toast(`msg ${i}`, { tone: 'error', durationMs: 0 })
    })
    expect(screen.getAllByRole('alert')).toHaveLength(4)
    expect(screen.queryByText('msg 0')).toBeNull()
  })

  it('waits while the pointer or keyboard focus is on a toast, then times out as usual', () => {
    vi.useFakeTimers()
    try {
      render(<Toaster />)
      act(() => void toast('Moved to Trash', { action: { label: 'Undo', run: () => {} } }))
      const undo = screen.getByRole('button', { name: 'Undo' })
      act(() => undo.focus())
      act(() => vi.advanceTimersByTime(20_000))
      // Still there, with focus still on Undo.
      expect(screen.getByText('Moved to Trash')).toBeInTheDocument()
      expect(undo).toHaveFocus()
      act(() => undo.blur())
      act(() => vi.advanceTimersByTime(20_000))
      expect(screen.queryByText('Moved to Trash')).toBeNull()

      act(() => void toast('Copied', { durationMs: 4000 }))
      const box = screen.getByText('Copied').closest('[role=status]')!
      act(() => void box.dispatchEvent(new MouseEvent('mouseover', { bubbles: true })))
      act(() => vi.advanceTimersByTime(10_000))
      expect(screen.getByText('Copied')).toBeInTheDocument()
      act(() => void box.dispatchEvent(new MouseEvent('mouseout', { bubbles: true })))
      act(() => vi.advanceTimersByTime(4000))
      expect(screen.queryByText('Copied')).toBeNull()
    } finally {
      vi.useRealTimers()
    }
  })

  it('has a Dismiss button big enough to tap on phones', () => {
    render(<Toaster />)
    act(() => void toast('Hello', { durationMs: 0 }))
    expect(screen.getByRole('button', { name: 'Dismiss' })).toHaveClass('max-sm:size-11')
  })
})
