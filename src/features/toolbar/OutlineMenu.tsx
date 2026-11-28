import * as DropdownMenu from '@radix-ui/react-dropdown-menu'
import { ChevronDown, ListTree } from 'lucide-react'
import { useState } from 'react'
import { outline } from '../../domain/outline'
import { PHONE_QUERY } from '../../lib/media'
import { getStore, useAppStore } from '../../store/store'
import { phoneStore } from '../phone/phoneStore'
import { keepMovedFocus } from './toolbarStyles'

/** Show the heading at `from` in the editor, leaving preview-only so the jump is visible. */
function jumpTo(noteId: string, from: number) {
  const s = getStore().getState()
  const phone = typeof window.matchMedia === 'function' && window.matchMedia(PHONE_QUERY).matches
  if (phone) phoneStore.getState().setPreview(noteId, false)
  else if (s.session.perTab[noteId]?.previewMode === 'preview')
    s.setViewState(noteId, { previewMode: 'split' })
  s.reveal(noteId, from, from)
}

/** The note's headings, indented by level; pick one to jump there. */
export function OutlineMenu({
  noteId,
  className,
  disabled,
}: {
  noteId: string
  className: string
  disabled?: boolean
}) {
  const [open, setOpen] = useState(false)
  const pinned = useAppStore((st) => st.settings.showOutline)
  const phone = typeof window.matchMedia === 'function' && window.matchMedia(PHONE_QUERY).matches
  // Read when the menu opens: no need to re-parse the note on every keystroke.
  const headings = open ? outline(getStore().getState().notes[noteId]?.content ?? '') : []
  return (
    <DropdownMenu.Root modal={false} open={open} onOpenChange={setOpen}>
      <DropdownMenu.Trigger
        aria-label="Outline"
        title="Outline"
        disabled={disabled}
        className={className}
      >
        <ListTree size={15} strokeWidth={1.75} />
        <ChevronDown size={11} />
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content
          align="start"
          sideOffset={4}
          collisionPadding={8}
          // The jump puts the cursor in the note: it stays there.
          onCloseAutoFocus={keepMovedFocus}
          className="z-50 max-h-[min(420px,var(--radix-dropdown-menu-content-available-height))] min-w-48 max-w-[min(360px,calc(100vw-16px))] overflow-y-auto rounded-md border border-border bg-bg-elev p-1 shadow-lg"
        >
          {headings.length === 0 ? (
            <p className="px-2 py-1.5 text-[12.5px] text-fg-faint">
              No headings yet. Start a line with # to add one.
            </p>
          ) : (
            headings.map((h) => (
              <DropdownMenu.Item
                key={h.from}
                onSelect={() => jumpTo(noteId, h.from)}
                style={{ paddingLeft: `${8 + (h.level - 1) * 12}px` }}
                className={`flex min-h-8 cursor-default items-center truncate rounded py-1 pr-2 text-[12.5px] outline-none data-[highlighted]:bg-bg-hover ${
                  h.level === 1 ? 'font-medium text-fg' : 'text-fg-muted'
                }`}
              >
                {h.text}
              </DropdownMenu.Item>
            ))
          )}
          {!phone && (
            <>
              <DropdownMenu.Separator className="my-1 h-px bg-border" />
              <DropdownMenu.CheckboxItem
                checked={pinned}
                onCheckedChange={() =>
                  getStore().getState().updateSettings({ showOutline: !pinned })
                }
                className="flex min-h-8 cursor-default items-center gap-2 rounded px-2 py-1 text-[12.5px] text-fg-muted outline-none data-[highlighted]:bg-bg-hover data-[highlighted]:text-fg"
              >
                <span aria-hidden className="w-3">
                  {pinned ? '✓' : ''}
                </span>
                Keep open beside the note
              </DropdownMenu.CheckboxItem>
            </>
          )}
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  )
}
