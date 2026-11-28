import { Search, X } from 'lucide-react'
import { composing } from '../../lib/ime'
import { useDeferredValue, useEffect, useMemo, useRef, useState } from 'react'
import { getStore, useAppStore } from '../../store/store'
import { PanelHeader } from './panelParts'
import { rowClass } from './rowClass'
import { searchAll, type SearchResult } from './search'

function Highlighted({ text, ranges }: { text: string; ranges: [number, number][] }) {
  const parts: React.ReactNode[] = []
  let last = 0
  ranges.forEach(([from, to], i) => {
    if (from > last) parts.push(text.slice(last, from))
    parts.push(
      <mark key={i} className="rounded-sm bg-accent-soft px-px text-fg">
        {text.slice(from, to)}
      </mark>,
    )
    last = to
  })
  parts.push(text.slice(last))
  return <>{parts}</>
}

/** Search across all notes. `onOpened` runs after a result is opened (phone Library closes). */
export function SearchPanel({ onOpened }: { onOpened?: () => void } = {}) {
  const [query, setQuery] = useState('')
  const deferred = useDeferredValue(query)
  const notes = useAppStore((s) => s.notes)
  const { results, total } = useMemo(
    () => searchAll(Object.values(notes), deferred),
    [notes, deferred],
  )
  const input = useRef<HTMLInputElement>(null)

  const focusSearch = useAppStore((s) => s.ui.focusSearch)
  useEffect(() => {
    input.current?.focus()
    input.current?.select()
  }, [focusSearch])

  const open = (r: SearchResult) => {
    const s = getStore().getState()
    s.openNote(r.id)
    if (r.firstMatch >= 0) s.reveal(r.id, r.firstMatch, r.firstMatch + deferred.trim().length)
    onOpened?.()
  }

  return (
    <>
      <PanelHeader title="Search" count={deferred.trim() ? total : undefined} />
      <div className="px-2 pb-2">
        <label className="flex h-8 items-center gap-2 rounded-md border border-border bg-bg pl-2 pr-1 transition-colors focus-within:border-accent focus-within:shadow-[0_0_0_3px_var(--accent-soft)]">
          <Search size={13} className="shrink-0 text-fg-faint" />
          <input
            ref={input}
            type="search"
            aria-label="Search all notes"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && results[0] && !composing(e)) open(results[0])
              if (e.key === 'Escape' && query) {
                e.preventDefault()
                setQuery('')
              }
            }}
            placeholder="Search all notes"
            className="h-full min-w-0 flex-1 bg-transparent text-[12.5px] text-fg outline-none placeholder:text-fg-faint"
          />
          {query && (
            <button
              type="button"
              aria-label="Clear search"
              title="Clear (Esc)"
              onClick={() => {
                setQuery('')
                input.current?.focus()
              }}
              className="grid size-5 shrink-0 place-items-center rounded text-fg-faint hover:bg-bg-hover hover:text-fg"
            >
              <X size={12} strokeWidth={2} />
            </button>
          )}
        </label>
      </div>
      {/* Screen readers hear how a search went without leaving the search box. */}
      <p role="status" className="sr-only">
        {deferred.trim()
          ? total
            ? `${total} ${total === 1 ? 'note' : 'notes'} found`
            : 'No notes found'
          : ''}
      </p>
      <ul aria-label="Search results" className="flex-1 overflow-y-auto px-1.5 pb-2">
        {results.map((r) => (
          <li key={r.id}>
            <button type="button" onClick={() => open(r)} className={rowClass(false)}>
              <span className="flex items-center gap-2">
                <span className="min-w-0 flex-1 truncate text-fg">{r.title}</span>
                {r.count > 0 && (
                  <span className="shrink-0 text-[10.5px] tabular-nums text-fg-faint">
                    {r.count}
                  </span>
                )}
              </span>
              {r.snippet && (
                <span className="line-clamp-2 text-[11.5px] leading-snug text-fg-muted">
                  <Highlighted text={r.snippet} ranges={r.matchRanges} />
                </span>
              )}
            </button>
          </li>
        ))}
        {total > results.length && (
          <li className="px-2 py-3 text-center text-[11.5px] text-fg-faint">
            Showing the first {results.length} of {total}. Add a word to narrow it down.
          </li>
        )}
        {deferred.trim() && results.length === 0 && (
          <li className="px-2 py-6 text-center text-[12px] text-fg-faint">No matches.</li>
        )}
      </ul>
    </>
  )
}
