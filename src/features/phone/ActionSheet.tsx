import * as Dialog from '@radix-ui/react-dialog'
import type { LucideIcon } from 'lucide-react'
import { DialogSurface } from '../../ui/DialogSurface'

export interface ActionItem {
  label: string
  icon?: LucideIcon
  danger?: boolean
  disabled?: boolean
  onSelect(): void
}

const SHEET = 'fixed left-1/2 top-1/3 w-80 -translate-x-1/2 px-2 pb-3'

/** A list of 48px actions in a bottom sheet. Choosing one closes the sheet first. */
export function ActionSheet({
  title,
  items,
  open,
  onClose,
}: {
  title: string
  items: ActionItem[]
  open: boolean
  onClose(): void
}) {
  return (
    <Dialog.Root open={open} onOpenChange={(o) => !o && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="np-overlay fixed inset-0 z-40" />
        <DialogSurface aria-describedby={undefined} className={SHEET}>
          <Dialog.Title className="truncate px-3 pb-1 pt-1 text-[12px] font-medium text-fg-muted">
            {title}
          </Dialog.Title>
          <ul>
            {items.map(({ label, icon: Icon, danger, disabled, onSelect }) => (
              <li key={label}>
                <button
                  type="button"
                  disabled={disabled}
                  onClick={() => {
                    onClose()
                    onSelect()
                  }}
                  className={[
                    'flex h-12 w-full items-center gap-3 rounded-lg px-3 text-left text-[15px] active:bg-bg-hover disabled:opacity-40',
                    danger ? 'text-danger' : 'text-fg',
                  ].join(' ')}
                >
                  {Icon && <Icon size={18} className="shrink-0 opacity-80" aria-hidden />}
                  {label}
                </button>
              </li>
            ))}
          </ul>
        </DialogSurface>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
