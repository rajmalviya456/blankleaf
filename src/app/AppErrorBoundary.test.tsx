import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import * as actions from '../features/backup/actions'
import { AppErrorBoundary } from './AppErrorBoundary'

afterEach(() => vi.restoreAllMocks())

function Boom(): never {
  throw new Error('boom')
}

describe('AppErrorBoundary', () => {
  it('shows a way out instead of a blank page when the app crashes', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    const save = vi.spyOn(actions, 'exportAll').mockResolvedValue(undefined)
    render(
      <AppErrorBoundary>
        <Boom />
      </AppErrorBoundary>,
    )
    const alert = screen.getByRole('alert')
    expect(alert).toHaveTextContent('Something went wrong')
    await userEvent.setup().click(screen.getByRole('button', { name: 'Download a backup' }))
    // No dialogs can open now, so the backup is saved as it is (encrypted if a password is set).
    expect(save).toHaveBeenCalledWith(expect.any(Number), 'plain')
    expect(screen.getByRole('button', { name: 'Reload' })).toBeInTheDocument()
  })

  it('shows the app when nothing goes wrong', () => {
    render(
      <AppErrorBoundary>
        <p>all good</p>
      </AppErrorBoundary>,
    )
    expect(screen.getByText('all good')).toBeInTheDocument()
  })
})
