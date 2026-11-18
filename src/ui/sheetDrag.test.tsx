import * as Dialog from '@radix-ui/react-dialog'
import * as DropdownMenu from '@radix-ui/react-dropdown-menu'
import { act, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { stubMedia } from '../../tests/media'
import { DialogSurface } from './DialogSurface'

let media: ReturnType<typeof stubMedia>
afterEach(() => media?.restore())
const tick = () => act(() => new Promise((r) => setTimeout(r, 20)))

function Sheet({ className = 'fixed w-80', menu = false }: { className?: string; menu?: boolean }) {
  return (
    <Dialog.Root defaultOpen>
      <Dialog.Portal>
        <DialogSurface aria-describedby={undefined} className={className}>
          <Dialog.Title>Settings</Dialog.Title>
          {menu && (
            <DropdownMenu.Root modal={false}>
              <DropdownMenu.Trigger>Theme</DropdownMenu.Trigger>
              <DropdownMenu.Portal>
                {/* Stays open through the drag, as on touch screens (Radix waits for a click
                    before closing on an outside tap, and a drag never clicks). */}
                <DropdownMenu.Content onPointerDownOutside={(e) => e.preventDefault()}>
                  <DropdownMenu.Item>Dark</DropdownMenu.Item>
                </DropdownMenu.Content>
              </DropdownMenu.Portal>
            </DropdownMenu.Root>
          )}
        </DialogSurface>
      </Dialog.Portal>
    </Dialog.Root>
  )
}

const sheet = () => document.querySelector<HTMLElement>('[data-surface="sheet"]')!
const handle = () => screen.getByTestId('sheet-handle')

describe('dragging a sheet', () => {
  it('follows the finger with no transition, and springs back after', () => {
    media = stubMedia({ phone: true })
    render(<Sheet />)
    fireEvent.pointerDown(handle(), { clientY: 100, pointerId: 1 })
    fireEvent.pointerMove(handle(), { clientY: 130, pointerId: 1 })
    expect(sheet().style.transform).toBe('translateY(30px)')
    expect(sheet().style.transition).toBe('none')
    fireEvent.pointerUp(handle(), { clientY: 130, pointerId: 1 })
    expect(sheet().style.transform).toBe('')
    expect(sheet().style.transition).toBe('')
  })

  it('closes the sheet even when a popup inside it is open', async () => {
    media = stubMedia({ phone: true })
    render(<Sheet menu />)
    await tick()
    fireEvent.keyDown(screen.getByRole('button', { name: 'Theme' }), { key: 'Enter' })
    await tick()
    expect(screen.getByRole('menu')).toBeTruthy()
    fireEvent.pointerDown(handle(), { clientY: 100, pointerId: 1 })
    expect(screen.getByRole('menu')).toBeTruthy()
    fireEvent.pointerMove(handle(), { clientY: 300, pointerId: 1 })
    fireEvent.pointerUp(handle(), { clientY: 300, pointerId: 1 })
    await tick()
    expect(screen.queryByRole('dialog', { name: 'Settings' })).toBeNull()
  })

  it('drops z-[…] placement classes on the sheet', () => {
    media = stubMedia({ phone: true })
    render(<Sheet className="fixed z-[60] w-80" />)
    expect(sheet().className).not.toContain('z-[60]')
  })
})
