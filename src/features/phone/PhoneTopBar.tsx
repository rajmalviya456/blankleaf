import { ChevronDown, Eye, Menu as MenuIcon, MoreHorizontal, PencilLine } from 'lucide-react'
import { displayTitle } from '../../domain/title'
import { useAppStore } from '../../store/store'
import { toast } from '../../ui/toast'
import { useActiveShares } from '../share/useActiveShares'
import { phoneStore, usePhone } from './phoneStore'
import { phoneViewFor } from './phoneView'

const iconBtn =
  'relative grid size-11 shrink-0 place-items-center rounded-lg text-fg-muted active:bg-bg-hover'

function Dot() {
  return <span aria-hidden className="absolute right-2 top-2 size-2 rounded-full bg-accent" />
}

/**
 * Saving… / Not saved, beside the title: its own button (tap to hear why), never inside the
 * title button, and announced to screen readers as it changes.
 */
function SaveState() {
  const status = useAppStore((s) => s.ui.saveStatus)
  const error = useAppStore((s) => s.ui.saveError)
  return (
    <span role="status" aria-label="Save status" className="contents">
      {status === 'saving' && (
        <span className="shrink-0 px-1 text-[11px] text-fg-faint">Saving…</span>
      )}
      {status === 'error' && (
        <button
          type="button"
          className="h-11 shrink-0 px-1.5 text-[11px] text-danger underline-offset-2 active:underline"
          onClick={() =>
            toast(error ?? 'Your latest changes could not be saved.', { tone: 'error' })
          }
        >
          Not saved
        </button>
      )}
    </span>
  )
}

/** Phone top bar: Library · title (opens tabs) · Preview/Edit · note menu. */
export function PhoneTopBar() {
  const activeId = useAppStore((s) => s.session.activeTabId)
  const note = useAppStore((s) => (activeId ? s.notes[activeId] : undefined))
  const saved = useAppStore((s) => (activeId ? s.session.perTab[activeId]?.previewMode : undefined))
  const previewByTab = usePhone((p) => p.previewByTab)
  const sharing = useActiveShares().length > 0
  const title = note ? displayTitle(note) : 'Blankleaf'
  const markdown = note?.mode === 'markdown'
  const locked = useAppStore((s) => !!(activeId && s.notes[activeId]?.locked))
  const view = activeId ? phoneViewFor(previewByTab, activeId, saved) : 'edit'
  const open = phoneStore.getState().open

  return (
    <header
      aria-label="Note bar"
      className="flex h-12 shrink-0 items-center gap-1 border-b border-border bg-bg-sunken px-1"
    >
      <button
        type="button"
        aria-label={sharing ? 'Library · sharing' : 'Library'}
        onClick={() => open('library')}
        className={iconBtn}
      >
        <MenuIcon size={20} strokeWidth={1.75} />
        {sharing && <Dot />}
      </button>
      <button
        type="button"
        aria-label={`Open tabs: ${title}`}
        onClick={() => open('tabs')}
        className="flex h-11 min-w-0 flex-1 items-center gap-1 rounded-lg px-2 text-left active:bg-bg-hover"
      >
        <span className="truncate text-[15px] font-semibold text-fg">{title}</span>
        <ChevronDown size={15} className="shrink-0 text-fg-muted" aria-hidden />
      </button>
      <SaveState />
      {markdown && !locked && activeId && (
        <button
          type="button"
          aria-label={view === 'preview' ? 'Edit' : 'Preview'}
          onClick={() => phoneStore.getState().setPreview(activeId, view !== 'preview')}
          className={iconBtn}
        >
          {view === 'preview' ? <PencilLine size={19} /> : <Eye size={19} />}
        </button>
      )}
      <button
        type="button"
        aria-label={sharing ? 'Note menu · sharing' : 'Note menu'}
        onClick={() => open('menu')}
        className={iconBtn}
      >
        <MoreHorizontal size={20} />
        {sharing && <Dot />}
      </button>
    </header>
  )
}
