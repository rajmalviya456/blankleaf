import * as Dialog from '@radix-ui/react-dialog'
import { Check, Search } from 'lucide-react'
import { useState } from 'react'
import { LANGUAGE_GROUPS, LANGUAGES } from '../../domain/languages'
import { useAppStore } from '../../store/store'
import { DialogSurface } from '../../ui/DialogSurface'
import { chooseFormat } from '../editor/format'
import { phoneStore } from './phoneStore'

/** Pick the active note's format on a phone: searchable, grouped list. */
export function FormatSheet({ open, onClose }: { open: boolean; onClose(): void }) {
  const noteId = useAppStore((s) => s.session.activeTabId)
  const lang = useAppStore((s) => (noteId ? s.notes[noteId]?.language : undefined))
  const [query, setQuery] = useState('')
  const q = query.trim().toLowerCase()
  const match = (label: string, ext: string) =>
    !q || label.toLowerCase().includes(q) || ext.toLowerCase().includes(q)
  const pick = (value: string) => {
    if (noteId) chooseFormat(noteId, value)
    setQuery('')
    phoneStore.getState().closeAll()
  }
  const option = (value: string, label: string, ext?: string) => (
    <button
      key={value}
      type="button"
      onClick={() => pick(value)}
      className="grid h-12 w-full grid-cols-[22px_1fr_auto] items-center gap-2 rounded-lg px-3 text-left text-[15px] text-fg active:bg-bg-hover"
    >
      <span className="text-accent">{lang === value && <Check size={16} />}</span>
      <span>{label}</span>
      {ext && <span className="font-mono text-[12px] text-fg-faint">.{ext}</span>}
    </button>
  )

  return (
    <Dialog.Root open={open && !!noteId} onOpenChange={(o) => !o && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="np-overlay fixed inset-0 z-40" />
        <DialogSurface aria-describedby={undefined} className="fixed left-1/2 top-[8vh] w-96 px-2">
          <Dialog.Title className="px-3 pb-2 text-[15px] font-semibold text-fg">
            Format
          </Dialog.Title>
          <label className="mx-1 mb-2 flex h-11 items-center gap-2 rounded-lg border border-border bg-bg px-3 focus-within:border-accent">
            <Search size={16} className="text-fg-faint" />
            <input
              type="search"
              aria-label="Find a format"
              placeholder="Find a format"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="min-w-0 flex-1 bg-transparent text-[16px] text-fg outline-none placeholder:text-fg-faint"
            />
          </label>
          {match('Auto-detect', '') && option('auto', 'Auto-detect')}
          {LANGUAGE_GROUPS.map((g) => {
            const items = LANGUAGES.filter((l) => l.group === g.id && match(l.label, l.ext))
            if (!items.length) return null
            return (
              <section key={g.id} aria-label={g.label}>
                <h3 className="px-3 pb-1 pt-3 text-[11px] font-semibold uppercase tracking-wider text-fg-faint">
                  {g.label}
                </h3>
                {items.map((l) => option(l.id, l.label, l.ext))}
              </section>
            )
          })}
        </DialogSurface>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
