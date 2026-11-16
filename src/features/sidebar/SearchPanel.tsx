import { Search } from 'lucide-react'
import { useDeferredValue, useEffect, useMemo, useRef, useState } from 'react'
import { getStore, useAppStore } from '../../store/store'
import { PanelHeader } from './panelParts'
import { rowClass } from './rowClass'
import { searchNotes, type SearchResult } from './search'

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

export function SearchPanel() {
  const [query, setQuery] = useState('')
  const deferred = useDeferredValue(query)
  const notes = useAppStore((s) => s.notes)
  const results = useMemo(() => searchNotes(Object.values(notes), deferred), [notes, deferred])
  const input = useRef<HTMLInputElement>(null)

  useEffect(() => input.current?.focus(), [])

  const open = (r: SearchResult) => {
    const s = getStore().getState()
    s.openNote(r.id)
    if (r.firstMatch >= 0) s.reveal(r.id, r.firstMatch, r.firstMatch + deferred.trim().length)
  }

  return (
    <>
      <PanelHeader title="Search" count={deferred.trim() ? results.length : undefined} />
      <div className="px-2 pb-2">
        <label className="flex items-center gap-2 rounded-md border border-border bg-bg px-2 focus-within:border-accent">
          <Search size={13} className="shrink-0 text-fg-faint" />
          <input
            ref={input}
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && results[0]) open(results[0])
            }}
            placeholder="Search all notes"
            className="h-7 min-w-0 flex-1 bg-transparent text-[12.5px] text-fg outline-none placeholder:text-fg-faint"
          />
        </label>
      </div>
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
        {deferred.trim() && results.length === 0 && (
          <li className="px-2 py-6 text-center text-[12px] text-fg-faint">No matches.</li>
        )}
      </ul>
    </>
  )
}
