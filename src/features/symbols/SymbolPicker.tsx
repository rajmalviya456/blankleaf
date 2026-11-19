import * as Popover from '@radix-ui/react-popover'
import { Omega } from 'lucide-react'
import { useState } from 'react'
import { useStore } from 'zustand'
import { getActiveView } from '../editor/activeView'
import { insertText } from '../toolbar/editCommands'
import { SYMBOL_GROUPS, findSymbols, type Sym } from './symbols'
import { symbolStore } from './symbolStore'

/** Toolbar button and popup: pick a symbol or emoji to type it at the cursor. */
export function SymbolPicker({ className, disabled }: { className: string; disabled?: boolean }) {
  const open = useStore(symbolStore, (s) => s.open)
  const setOpen = symbolStore.getState().setOpen
  const [tab, setTab] = useState(SYMBOL_GROUPS[0].id)
  const [query, setQuery] = useState('')
  const shown: Sym[] = query.trim()
    ? findSymbols(query)
    : (SYMBOL_GROUPS.find((g) => g.id === tab)?.items ?? [])

  const pick = (char: string) => {
    const view = getActiveView()
    if (view) {
      insertText(view, char)
      view.focus()
    }
    setOpen(false)
    setQuery('')
  }

  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <Popover.Trigger
        aria-label="Insert symbol or emoji"
        title="Insert symbol or emoji"
        disabled={disabled}
        onMouseDown={(e) => e.preventDefault()}
        className={className}
      >
        <Omega size={15} strokeWidth={1.75} />
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          align="start"
          sideOffset={4}
          collisionPadding={8}
          onCloseAutoFocus={(e) => e.preventDefault()}
          className="z-50 flex w-[min(320px,calc(100vw-16px))] flex-col gap-2 rounded-md border border-border bg-bg-elev p-2 shadow-lg"
        >
          <input
            type="search"
            autoFocus
            aria-label="Find a symbol"
            placeholder="Find a symbol: arrow, euro, check…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="h-8 rounded border border-border bg-bg px-2 text-[13px] text-fg outline-none focus:border-accent"
          />
          {!query.trim() && (
            <div role="tablist" aria-label="Symbol groups" className="flex flex-wrap gap-1">
              {SYMBOL_GROUPS.map((g) => (
                <button
                  key={g.id}
                  type="button"
                  role="tab"
                  aria-selected={tab === g.id}
                  onClick={() => setTab(g.id)}
                  className="rounded px-2 py-0.5 text-[12px] text-fg-muted hover:bg-bg-hover aria-selected:bg-accent-soft aria-selected:text-accent"
                >
                  {g.label}
                </button>
              ))}
            </div>
          )}
          <div className="grid max-h-56 grid-cols-8 gap-0.5 overflow-y-auto">
            {shown.map((s) => (
              <button
                key={s.char + s.name}
                type="button"
                aria-label={s.name}
                title={s.name}
                onClick={() => pick(s.char)}
                className="grid h-9 place-items-center rounded text-[18px] text-fg hover:bg-bg-hover"
              >
                {s.char}
              </button>
            ))}
          </div>
          {query.trim() && !shown.length && (
            <p className="px-1 text-[12px] text-fg-faint">Nothing called “{query.trim()}”.</p>
          )}
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  )
}
