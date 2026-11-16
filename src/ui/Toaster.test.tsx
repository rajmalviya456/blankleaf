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
})
