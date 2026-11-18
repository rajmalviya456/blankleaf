import * as Dialog from '@radix-ui/react-dialog'
import * as DropdownMenu from '@radix-ui/react-dropdown-menu'
import { act, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { stubMedia } from '../../tests/media'
import { DialogSurface } from './DialogSurface'
import { toast, toastStore } from './toast'
import { Toaster } from './Toaster'

let media: ReturnType<typeof stubMedia>
afterEach(() => {
  media?.restore()
  act(() => toastStore.setState({ toasts: [] }))
})

function Sheet() {
  return (
    <Dialog.Root defaultOpen>
      <Dialog.Portal>
        <DialogSurface aria-describedby={undefined} className="fixed">
          <Dialog.Title>Settings</Dialog.Title>
        </DialogSurface>
      </Dialog.Portal>
    </Dialog.Root>
  )
}

describe.each([
  ['laptop', false],
  ['phone', true],
])('toasts over dialogs (%s)', (_, phone) => {
  it('tapping a toast’s Undo keeps the dialog open', async () => {
    media = stubMedia({ phone })
    render(
      <>
        <Sheet />
        <Toaster />
      </>,
    )
    act(() => void toast('Moved to Trash', { action: { label: 'Undo', run: () => {} } }))
    const undo = screen.getByText('Undo')
    await act(() => new Promise((r) => setTimeout(r, 0))) // Radix listens from the next tick
    fireEvent.pointerDown(undo)
    fireEvent.click(undo) // dismisses the toast: the button is gone by the time Radix looks
    expect(screen.getByRole('dialog', { name: 'Settings' })).toBeTruthy()
  })

  it('screen readers still reach the toasts while a dialog is open', () => {
    media = stubMedia({ phone })
    render(
      <>
        <Toaster />
        <Sheet />
      </>,
    )
    act(() => void toast('Moved to Trash', { action: { label: 'Undo', run: () => {} } }))
    const toaster = document.querySelector('[data-toaster]')!
    expect(toaster.closest('[aria-hidden="true"]')).toBeNull()
  })
})

it('on laptops, clicking a toast closes an open menu like any outside click', async () => {
  media = stubMedia({ phone: false })
  render(
    <>
      <DropdownMenu.Root defaultOpen modal={false}>
        <DropdownMenu.Trigger>Menu</DropdownMenu.Trigger>
        <DropdownMenu.Portal>
          <DropdownMenu.Content>
            <DropdownMenu.Item>Rename</DropdownMenu.Item>
          </DropdownMenu.Content>
        </DropdownMenu.Portal>
      </DropdownMenu.Root>
      <Toaster />
    </>,
  )
  act(() => void toast('Saved'))
  expect(screen.getByRole('menu')).toBeTruthy()
  await act(() => new Promise((r) => setTimeout(r, 0))) // Radix listens from the next tick
  fireEvent.pointerDown(screen.getByText('Saved'))
  expect(screen.queryByRole('menu')).toBeNull()
})
