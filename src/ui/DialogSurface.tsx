/**
 * The surface every dialog renders on: a centred dialog on laptops (exactly the classes the
 * dialog passes), a bottom sheet on phones. The sheet keeps the dialog's own padding/layout,
 * drops its centring and width, and adds a drag handle; dragging it down closes the dialog by
 * sending Escape, so each dialog's own close logic runs.
 */
import * as AlertDialog from '@radix-ui/react-alert-dialog'
import * as Dialog from '@radix-ui/react-dialog'
import { forwardRef, useImperativeHandle, useRef, type ComponentPropsWithoutRef } from 'react'
import { useIsPhone } from '../lib/media'
import { useDragToClose } from './useDragToClose'

type Props = ComponentPropsWithoutRef<typeof Dialog.Content> & { kind?: 'dialog' | 'alert' }

/** Classes that only position/size a centred dialog; dropped on a sheet. */
const PLACEMENT =
  /^(fixed|absolute|left-\S+|right-\S+|top-\S+|bottom-\S+|-?translate-[xy]-\S+|w-\S+|max-w-\S+|max-h-\S+|h-\S+|rounded-\S+|rounded|shadow(-\S+)?|border|border-border|z-\d+)$/

const SHEET =
  'np-sheet fixed inset-x-0 bottom-[var(--kb,0px)] z-50 max-h-[calc(92dvh-var(--kb,0px))] overflow-y-auto rounded-t-2xl border-t border-border bg-bg-elev shadow-[0_-12px_40px_rgb(0_0_0/0.25)] pb-[env(safe-area-inset-bottom)] outline-none'

function sheetClasses(laptop: string): string {
  const kept = laptop
    .split(/\s+/)
    .filter((c) => c && !PLACEMENT.test(c))
    .join(' ')
  return `${SHEET} ${kept}`.trim()
}

export const DialogSurface = forwardRef<HTMLDivElement, Props>(function DialogSurface(
  { kind = 'dialog', className = '', children, ...rest },
  forwarded,
) {
  const phone = useIsPhone()
  const ref = useRef<HTMLDivElement>(null)
  useImperativeHandle(forwarded, () => ref.current as HTMLDivElement)
  const drag = useDragToClose(() =>
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })),
  )
  const Content = (kind === 'alert' ? AlertDialog.Content : Dialog.Content) as typeof Dialog.Content

  if (!phone)
    return (
      <Content ref={ref} data-surface="dialog" className={className} {...rest}>
        {children}
      </Content>
    )

  return (
    <Content ref={ref} data-surface="sheet" className={sheetClasses(className)} {...rest}>
      <div
        data-testid="sheet-handle"
        aria-hidden
        className="sticky top-0 z-10 -mb-2 flex h-6 cursor-grab touch-none items-center justify-center bg-bg-elev"
        {...drag}
      >
        <span className="h-1 w-9 rounded-full bg-fg-faint/50" />
      </div>
      {children}
    </Content>
  )
})
