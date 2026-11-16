import * as AlertDialog from '@radix-ui/react-alert-dialog'
import type { ReactNode } from 'react'

interface Props {
  open: boolean
  onOpenChange(open: boolean): void
  title: ReactNode
  description: ReactNode
  confirmLabel: string
  onConfirm(): void
  danger?: boolean
}

/** Small yes/no dialog for destructive or surprising actions. */
export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel,
  onConfirm,
  danger = false,
}: Props) {
  return (
    <AlertDialog.Root open={open} onOpenChange={onOpenChange}>
      <AlertDialog.Portal>
        <AlertDialog.Overlay className="np-overlay fixed inset-0 z-40" />
        <AlertDialog.Content className="fixed left-1/2 top-1/3 z-50 w-[min(340px,calc(100vw-32px))] -translate-x-1/2 rounded-lg border border-border bg-bg-elev p-4 shadow-xl">
          <AlertDialog.Title className="text-sm font-medium text-fg">{title}</AlertDialog.Title>
          <AlertDialog.Description className="mt-1.5 text-[12.5px] leading-snug text-fg-muted">
            {description}
          </AlertDialog.Description>
          <div className="mt-4 flex justify-end gap-2">
            <AlertDialog.Cancel className="rounded-md px-3 py-1.5 text-[12.5px] text-fg-muted hover:bg-bg-hover">
              Cancel
            </AlertDialog.Cancel>
            <AlertDialog.Action
              onClick={onConfirm}
              className={[
                'rounded-md px-3 py-1.5 text-[12.5px]',
                danger ? 'bg-danger text-white' : 'bg-accent text-accent-fg',
              ].join(' ')}
            >
              {confirmLabel}
            </AlertDialog.Action>
          </div>
        </AlertDialog.Content>
      </AlertDialog.Portal>
    </AlertDialog.Root>
  )
}
