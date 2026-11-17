import * as AlertDialog from '@radix-ui/react-alert-dialog'
import * as Dialog from '@radix-ui/react-dialog'
import { fireEvent, render, screen } from '@testing-library/react'
import { useState } from 'react'
import { afterEach, describe, expect, it } from 'vitest'
import { stubMedia } from '../../tests/media'
import { DialogSurface } from './DialogSurface'

let media: ReturnType<typeof stubMedia>
afterEach(() => media?.restore())

function Demo({ alert = false }: { alert?: boolean }) {
  const [open, setOpen] = useState(true)
  if (alert)
    return (
      <AlertDialog.Root open={open} onOpenChange={setOpen}>
        <AlertDialog.Portal>
          <DialogSurface kind="alert" className="fixed left-1/2 top-1/3 w-80 p-4">
            <AlertDialog.Title>Sure?</AlertDialog.Title>
            <AlertDialog.Description>Gone for good.</AlertDialog.Description>
            <AlertDialog.Cancel>Cancel</AlertDialog.Cancel>
          </DialogSurface>
        </AlertDialog.Portal>
      </AlertDialog.Root>
    )
  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Portal>
        <DialogSurface
          aria-describedby={undefined}
          className="fixed left-1/2 top-[8vh] w-[min(560px,calc(100vw-32px))] -translate-x-1/2 p-4 shadow-2xl"
        >
          <Dialog.Title>Settings</Dialog.Title>
          <p>Body</p>
        </DialogSurface>
      </Dialog.Portal>
    </Dialog.Root>
  )
}

const drag = (handle: Element, dy: number) => {
  fireEvent.pointerDown(handle, { clientY: 100, pointerId: 1 })
  fireEvent.pointerMove(handle, { clientY: 100 + dy, pointerId: 1 })
  fireEvent.pointerUp(handle, { clientY: 100 + dy, pointerId: 1 })
}

describe('DialogSurface', () => {
  it('is a centred dialog on laptop, with the given classes and no handle', () => {
    media = stubMedia({ phone: false })
    render(<Demo />)
    const dialog = screen.getByRole('dialog', { name: 'Settings' })
    expect(dialog).toHaveAttribute('data-surface', 'dialog')
    expect(dialog.className).toContain('top-[8vh]')
    expect(screen.queryByTestId('sheet-handle')).toBeNull()
  })

  it('is a bottom sheet on phone: keeps padding, drops centring, adds a handle', () => {
    media = stubMedia({ phone: true })
    render(<Demo />)
    const dialog = screen.getByRole('dialog', { name: 'Settings' })
    expect(dialog).toHaveAttribute('data-surface', 'sheet')
    expect(dialog.className).toContain('p-4')
    expect(dialog.className).not.toMatch(/top-\[8vh\]|left-1\/2|-translate-x-1\/2|w-\[min/)
    expect(dialog.className).toContain('bottom-0')
    expect(screen.getByTestId('sheet-handle')).toBeInTheDocument()
  })

  it('dragging the handle down 100px closes it; 30px springs back', () => {
    media = stubMedia({ phone: true })
    render(<Demo />)
    drag(screen.getByTestId('sheet-handle'), 30)
    expect(screen.getByRole('dialog', { name: 'Settings' })).toBeInTheDocument()
    drag(screen.getByTestId('sheet-handle'), 100)
    expect(screen.queryByRole('dialog', { name: 'Settings' })).toBeNull()
  })

  it('works for alert dialogs too', () => {
    media = stubMedia({ phone: true })
    render(<Demo alert />)
    expect(screen.getByRole('alertdialog', { name: 'Sure?' })).toHaveAttribute(
      'data-surface',
      'sheet',
    )
    drag(screen.getByTestId('sheet-handle'), 120)
    expect(screen.queryByRole('alertdialog')).toBeNull()
  })
})
