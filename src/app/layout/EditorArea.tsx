import { Plus, X } from 'lucide-react'
import { displayTitle } from '../../domain/title'
import { useIsWide } from '../../lib/media'
import { lazy, Suspense, useCallback, useDeferredValue } from 'react'
import { toggleTaskAt } from '../../features/checklist/taskToggle'
import { Editor } from '../../features/editor/Editor'
import { Toolbar } from '../../features/toolbar/Toolbar'
import { getStore, useAppStore } from '../../store/store'

// Markdown rendering is only needed for markdown notes in split/preview, so load it on demand.
const MarkdownPreview = lazy(() =>
  import('../../features/editor/MarkdownPreview').then((m) => ({ default: m.MarkdownPreview })),
)

function Preview({ source, noteId }: { source: string; noteId: string }) {
  // A tick applies to the note's latest text, so quick ticks in a row all count. If typing has
  // moved the item, nothing matches at that offset and the text is left alone.
  const onToggleTask = useCallback(
    (offset: number) => {
      const s = getStore().getState()
      const content = s.notes[noteId]?.content
      if (content === undefined) return
      const next = toggleTaskAt(content, offset)
      if (next !== content) s.updateContent(noteId, next)
    },
    [noteId],
  )
  return (
    <Suspense fallback={<div className="p-6 text-[12px] text-fg-faint">Rendering…</div>}>
      <MarkdownPreview source={source} onToggleTask={onToggleTask} />
    </Suspense>
  )
}

function NoteView({ noteId, viewOverride }: { noteId: string; viewOverride?: 'edit' | 'preview' }) {
  const markdown = useAppStore((s) => s.notes[noteId]?.mode === 'markdown')
  const saved = useAppStore((s) =>
    markdown ? (s.session.perTab[noteId]?.previewMode ?? 'edit') : 'edit',
  )
  // Phones pass their own Edit/Preview choice; it never changes the saved (laptop) view.
  const view = markdown && viewOverride ? viewOverride : saved
  const content = useAppStore((s) => s.notes[noteId]?.content ?? '')
  const deferred = useDeferredValue(content)

  if (view === 'edit') return <Editor noteId={noteId} />
  if (view === 'preview')
    return (
      <div className="min-h-0 flex-1 overflow-y-auto">
        <Preview source={deferred} noteId={noteId} />
      </div>
    )
  return (
    <div className="grid min-h-0 flex-1 grid-cols-2">
      <div className="flex min-h-0 min-w-0 flex-col border-r border-border">
        <Editor noteId={noteId} />
      </div>
      <div className="min-h-0 min-w-0 overflow-y-auto bg-bg">
        <Preview source={deferred} noteId={noteId} />
      </div>
    </div>
  )
}

/** A second note beside the active one, on screens wide enough for two. */
function SideNote({ activeId }: { activeId: string }) {
  const wide = useIsWide()
  const zen = useAppStore((s) => s.session.zen)
  const note = useAppStore((s) => {
    const id = s.session.splitNoteId
    return id && id !== activeId ? s.notes[id] : undefined
  })
  if (!wide || zen || !note || note.deletedAt !== null) return null
  const title = displayTitle(note)
  return (
    <section
      aria-label={`Side note: ${title}`}
      className="flex min-h-0 min-w-0 flex-1 flex-col border-l border-border"
    >
      <div className="flex h-8 shrink-0 items-center gap-2 border-b border-border bg-bg-sunken pl-3 pr-1 text-[12.5px] text-fg-muted">
        <span className="min-w-0 flex-1 truncate">{title}</span>
        <button
          type="button"
          aria-label="Close side note"
          title="Close side note"
          onClick={() => getStore().getState().setSplitNote(null)}
          className="grid size-6 place-items-center rounded hover:bg-bg-hover hover:text-fg"
        >
          <X size={14} />
        </button>
      </div>
      <Editor key={note.id} noteId={note.id} side />
    </section>
  )
}

/**
 * Fills all remaining space with the active note's editor, or an empty state. Phones render
 * the toolbar themselves (above the keyboard) and pass their own Edit/Preview view.
 */
export function EditorArea({
  viewOverride,
  showToolbar = true,
}: {
  viewOverride?: 'edit' | 'preview'
  showToolbar?: boolean
} = {}) {
  const activeId = useAppStore((s) => s.session.activeTabId)
  const toolbar = useAppStore((s) => s.settings.showToolbar && !s.session.zen)
  return (
    <main className="relative flex min-h-0 min-w-0 flex-1 flex-col bg-bg">
      {activeId && toolbar && showToolbar && <Toolbar noteId={activeId} />}
      {activeId ? (
        <div className="flex min-h-0 flex-1">
          <div className="flex min-h-0 min-w-0 flex-1 flex-col">
            <NoteView key={activeId} noteId={activeId} viewOverride={viewOverride} />
          </div>
          {!viewOverride && <SideNote activeId={activeId} />}
        </div>
      ) : (
        <div className="grid flex-1 place-items-center">
          <button
            type="button"
            onClick={() => getStore().getState().newNote()}
            className="flex items-center gap-2 rounded-md px-3 py-2 text-fg-muted hover:bg-bg-hover hover:text-fg"
          >
            <Plus size={15} />
            New note
          </button>
        </div>
      )}
    </main>
  )
}
