import { getStore } from '../../store/store'
import { setPendingQuery, submitPendingQuery } from './pendingQuery'

/**
 * Stand-in shown for the moment the command palette's code is loading. It takes the focus away
 * from the note at once and keeps what is typed, which the real palette then picks up.
 */
export function PaletteLoading() {
  return (
    <>
      <div className="np-overlay fixed inset-0 z-40" />
      <div className="fixed left-1/2 top-[14vh] z-50 w-[min(560px,calc(100vw-32px))] -translate-x-1/2 overflow-hidden rounded-xl border border-border bg-bg-elev shadow-2xl">
        <div className="flex items-center gap-2 border-b border-border px-3">
          <input
            autoFocus
            role="combobox"
            aria-expanded={false}
            aria-label="Command palette"
            placeholder="Type a command or note title…"
            onChange={(e) => setPendingQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') submitPendingQuery()
              if (e.key === 'Escape') {
                setPendingQuery('')
                getStore().getState().setUi({ paletteOpen: false })
              }
            }}
            className="h-11 flex-1 bg-transparent text-[14px] text-fg outline-none placeholder:text-fg-faint"
          />
        </div>
      </div>
    </>
  )
}
