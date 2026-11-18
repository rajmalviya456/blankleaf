import { Plus } from 'lucide-react'
import { lazy, Suspense, useDeferredValue } from 'react'
import { Editor } from '../../features/editor/Editor'
import { Toolbar } from '../../features/toolbar/Toolbar'
import { getStore, useAppStore } from '../../store/store'

// Markdown rendering is only needed for markdown notes in split/preview, so load it on demand.
const MarkdownPreview = lazy(() =>
  import('../../features/editor/MarkdownPreview').then((m) => ({ default: m.MarkdownPreview })),
)

function Preview({ source }: { source: string }) {
  return (
    <Suspense fallback={<div className="p-6 text-[12px] text-fg-faint">Rendering…</div>}>
      <MarkdownPreview source={source} />
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
        <Preview source={deferred} />
      </div>
    )
  return (
    <div className="grid min-h-0 flex-1 grid-cols-2">
      <div className="flex min-h-0 min-w-0 flex-col border-r border-border">
        <Editor noteId={noteId} />
      </div>
      <div className="min-h-0 min-w-0 overflow-y-auto bg-bg">
        <Preview source={deferred} />
      </div>
    </div>
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
        <NoteView key={activeId} noteId={activeId} viewOverride={viewOverride} />
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
