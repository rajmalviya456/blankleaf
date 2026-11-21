import * as Dialog from '@radix-ui/react-dialog'
import { Command, useCommandState } from 'cmdk'
import { paletteScore } from './paletteScore'
import { ChevronLeft, FileText } from 'lucide-react'
import { useState, type ReactNode } from 'react'
import { useShallow } from 'zustand/react/shallow'
import {
  COMMANDS,
  commandEnabled,
  commandTitle,
  type CommandSection,
} from '../../commands/registry'
import { detectLanguage } from '../../domain/detectLanguage'
import { LANGUAGES } from '../../domain/languages'
import { displayTitle } from '../../domain/title'
import type { LanguageId } from '../../domain/types'
import { platform } from '../../lib/platform'
import { formatShortcut } from '../../lib/shortcuts'
import { liveNotesSorted } from '../../store/selectors'
import { getStore, useAppStore } from '../../store/store'
import { DialogSurface } from '../../ui/DialogSurface'

const SECTIONS: CommandSection[] = ['Note', 'Tabs', 'View', 'Data', 'App']

const itemClass =
  'flex h-8 cursor-default select-none items-center gap-2.5 rounded-md px-2.5 text-[13px] text-fg data-[selected=true]:bg-accent-soft'
const groupClass =
  '[&_[cmdk-group-heading]]:px-2.5 [&_[cmdk-group-heading]]:pb-1 [&_[cmdk-group-heading]]:pt-2 [&_[cmdk-group-heading]]:text-[10.5px] [&_[cmdk-group-heading]]:font-semibold [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-wider [&_[cmdk-group-heading]]:text-fg-faint'

function Kbd({ children }: { children: string }) {
  return (
    <kbd className="ml-auto shrink-0 rounded border border-border bg-bg-sunken px-1.5 py-px font-sans text-[10.5px] text-fg-muted">
      {children}
    </kbd>
  )
}

export function CommandPalette() {
  const open = useAppStore((s) => s.ui.paletteOpen)
  const mode = useAppStore((s) => s.ui.paletteMode)
  const state = useAppStore((s) => s)
  const notes = useAppStore(useShallow(liveNotesSorted))
  const [query, setQuery] = useState('')
  const store = getStore()
  const p = platform()

  const close = () => {
    store.getState().setUi({ paletteOpen: false, paletteMode: 'commands' })
    setQuery('')
  }
  const run = (fn: () => void) => {
    close()
    fn()
  }

  const setFormat = (lang: LanguageId) => {
    const s = store.getState()
    const id = s.session.activeTabId
    if (!id) return
    s.setLanguage(id, lang)
    if (lang === 'auto') {
      const guess = detectLanguage(s.notes[id]?.content ?? '')
      if (guess !== 'plaintext') s.setLanguage(id, guess)
    }
  }

  const visible = COMMANDS.filter((c) => c.palette !== false && commandEnabled(c, state))
  const noteItems = query.trim() ? notes : notes.slice(0, 6)

  return (
    <Dialog.Root open={open} onOpenChange={(o) => (o ? undefined : close())}>
      <Dialog.Portal>
        <Dialog.Overlay className="np-overlay fixed inset-0 z-40" />
        <DialogSurface
          aria-describedby={undefined}
          className="fixed left-1/2 top-[14vh] z-50 w-[min(560px,calc(100vw-32px))] -translate-x-1/2 overflow-hidden rounded-xl border border-border bg-bg-elev shadow-2xl outline-none"
        >
          <Dialog.Title className="sr-only">Command palette</Dialog.Title>
          <Command
            label="Command palette"
            loop
            filter={paletteScore}
            onKeyDown={(e) => {
              if (mode === 'formats' && e.key === 'Backspace' && !query) {
                e.preventDefault()
                store.getState().setUi({ paletteMode: 'commands' })
              }
            }}
          >
            <div className="flex items-center gap-2 border-b border-border px-3">
              {mode === 'formats' && (
                <button
                  type="button"
                  aria-label="Back to commands"
                  onClick={() => store.getState().setUi({ paletteMode: 'commands' })}
                  className="grid size-6 place-items-center rounded text-fg-muted hover:bg-bg-hover"
                >
                  <ChevronLeft size={14} />
                </button>
              )}
              <Command.Input
                autoFocus
                value={query}
                onValueChange={setQuery}
                placeholder={
                  mode === 'formats' ? 'Choose a format…' : 'Type a command or note title…'
                }
                className="h-11 flex-1 bg-transparent text-[14px] text-fg outline-none placeholder:text-fg-faint"
              />
            </div>
            <ResultsList>
              {mode === 'formats' ? (
                <Command.Group heading="Format" className={groupClass}>
                  <Command.Item
                    value="auto auto-detect"
                    onSelect={() => run(() => setFormat('auto'))}
                    className={itemClass}
                  >
                    Auto-detect
                  </Command.Item>
                  {LANGUAGES.map((l) => (
                    <Command.Item
                      key={l.id}
                      value={`${l.label} ${l.ext}`}
                      onSelect={() => run(() => setFormat(l.id))}
                      className={itemClass}
                    >
                      {l.label}
                      <span className="ml-auto font-mono text-[11px] text-fg-faint">.{l.ext}</span>
                    </Command.Item>
                  ))}
                </Command.Group>
              ) : (
                <>
                  {/* While searching, one list: cmdk ranks items within a group but never
                      reorders groups, so a section's weak match would sit above a strong one. */}
                  {(query.trim() ? [null] : SECTIONS).map((section) => {
                    const items = section ? visible.filter((c) => c.section === section) : visible
                    if (!items.length) return null
                    return (
                      <Command.Group
                        key={section ?? 'all'}
                        heading={section ?? 'Commands'}
                        className={groupClass}
                      >
                        {items.map((c) => (
                          <Command.Item
                            key={c.id}
                            value={`${commandTitle(c)} ${c.id}`}
                            keywords={c.keywords}
                            onSelect={() =>
                              c.id === 'note.format'
                                ? (setQuery(''), c.run({ store }))
                                : run(() => c.run({ store }))
                            }
                            className={itemClass}
                          >
                            {commandTitle(c)}
                            {c.shortcuts[0] && <Kbd>{formatShortcut(c.shortcuts[0], p)}</Kbd>}
                          </Command.Item>
                        ))}
                      </Command.Group>
                    )
                  })}
                  {noteItems.length > 0 && (
                    <Command.Group heading="Notes" className={groupClass}>
                      {noteItems.map((n) => (
                        <Command.Item
                          key={n.id}
                          value={`note ${displayTitle(n)} ${n.id}`}
                          onSelect={() => run(() => store.getState().openNote(n.id))}
                          className={itemClass}
                        >
                          <FileText size={13} className="shrink-0 text-fg-faint" />
                          <span className="truncate">{displayTitle(n)}</span>
                        </Command.Item>
                      ))}
                    </Command.Group>
                  )}
                </>
              )}
            </ResultsList>
          </Command>
        </DialogSurface>
      </Dialog.Portal>
    </Dialog.Root>
  )
}

/**
 * The results list, hidden when nothing matches: a listbox with no options confuses screen
 * readers, so "No results." is a status message beside it instead (and is read out).
 */
function ResultsList({ children }: { children: ReactNode }) {
  const empty = useCommandState((st) => st.filtered.count === 0)
  return (
    <>
      <Command.List hidden={empty} className="max-h-[min(420px,60vh)] overflow-y-auto p-1.5">
        {children}
      </Command.List>
      <p
        role="status"
        className={empty ? 'px-3 py-6 text-center text-[12.5px] text-fg-faint' : 'sr-only'}
      >
        {empty ? 'No results.' : ''}
      </p>
    </>
  )
}
