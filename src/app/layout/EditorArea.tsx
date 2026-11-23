import { Plus, X } from 'lucide-react'
import { displayTitle } from '../../domain/title'
import { useIsWide } from '../../lib/media'
import { lazy, Suspense, useCallback } from 'react'
import { useCalmValue } from '../../lib/useCalmValue'
import { canChunk } from '../../features/editor/previewChunks'
import { toggleTaskAt } from '../../features/checklist/taskToggle'
import { DetectChip } from '../../features/editor/DetectChip'
import { openLink } from '../../features/links/openLink'
import { Editor } from '../../features/editor/Editor'
import { Toolbar } from '../../features/toolbar/Toolbar'
import { ReadabilityPanel } from '../../features/readability/ReadabilityPanel'
import { OutlinePanel } from '../../features/outline/OutlinePanel'
import { SampleHint } from '../../features/sample/SampleHint'
import { VoiceStatus } from '../../features/voice/VoiceStatus'
import { useNoteFontSize } from '../../features/editor/useNoteFontSize'
import { getStore, useAppStore } from '../../store/store'

// Markdown rendering is only needed for markdown notes in split/preview, so load it on demand.
const LockedNote = lazy(() =>
  import('../../features/lock/LockedNote').then((m) => ({ default: m.LockedNote })),
)
const MarkdownPreview = lazy(() =>
  import('../../features/editor/MarkdownPreview').then((m) => ({ default: m.MarkdownPreview })),
)
const ChunkedPreview = lazy(() =>
  import('../../features/editor/MarkdownPreview').then((m) => ({ default: m.ChunkedPreview })),
)
/** Above this size the preview is drawn in chunks (see previewChunks). */
const CHUNKED_CHARS = 20_000

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
  const fontSize = useNoteFontSize(noteId)
  return (
    <Suspense fallback={<div className="p-6 text-[12px] text-fg-faint">Rendering…</div>}>
      <div style={{ '--editor-font-size': `${fontSize}px` } as React.CSSProperties}>
        {source.length > CHUNKED_CHARS && canChunk(source) ? (
          <ChunkedPreview source={source} onToggleTask={onToggleTask} onOpenNote={openLink} />
        ) : (
          <MarkdownPreview source={source} onToggleTask={onToggleTask} onOpenNote={openLink} />
        )}
      </div>
    </Suspense>
  )
}

function NoteView(props: { noteId: string; viewOverride?: 'edit' | 'preview' }) {
  const locked = useAppStore((s) => !!s.notes[props.noteId]?.locked)
  if (!locked) return <OpenNote {...props} />
  return (
    <Suspense fallback={null}>
      <LockedNote noteId={props.noteId} />
    </Suspense>
  )
}

function OpenNote({
  noteId,
  viewOverride,
  side = false,
}: {
  noteId: string
  viewOverride?: 'edit' | 'preview'
  side?: boolean
}) {
  const markdown = useAppStore((s) => s.notes[noteId]?.mode === 'markdown')
  const saved = useAppStore((s) =>
    markdown ? (s.session.perTab[noteId]?.previewMode ?? 'edit') : 'edit',
  )
  // Phones pass their own Edit/Preview choice; it never changes the saved (laptop) view.
  const zen = useAppStore((s) => s.session.zen)
  const chosen = markdown && viewOverride ? viewOverride : saved
  // Zen shows the text alone, not beside its preview.
  const view = zen && chosen === 'split' ? 'edit' : chosen
  const content = useAppStore((s) => s.notes[noteId]?.content ?? '')
  // A big note's preview is rebuilt when typing pauses, not on every keystroke.
  const deferred = useCalmValue(content)

  if (view === 'edit') return <Editor noteId={noteId} side={side} />
  if (view === 'preview')
    return (
      <div className="np-preview-pane min-h-0 flex-1 overflow-y-auto">
        <Preview source={deferred} noteId={noteId} />
      </div>
    )
  return (
    <div className="grid min-h-0 flex-1 grid-cols-2">
      <div className="flex min-h-0 min-w-0 flex-col border-r border-border">
        <Editor noteId={noteId} side={side} />
      </div>
      <div className="np-preview-pane min-h-0 min-w-0 overflow-y-auto bg-bg">
        <Preview source={deferred} noteId={noteId} />
      </div>
    </div>
  )
}

/** The outline beside a Markdown note being edited, while the setting is on. */
function Outline({ noteId }: { noteId: string }) {
  const show = useAppStore((s) => {
    const note = s.notes[noteId]
    const view = s.session.perTab[noteId]?.previewMode ?? 'edit'
    return (
      s.settings.showOutline &&
      !s.session.zen &&
      !!note &&
      note.mode === 'markdown' &&
      !note.locked &&
      view !== 'preview'
    )
  })
  return show ? <OutlinePanel noteId={noteId} /> : null
}

/** A second note beside the active one, on screens wide enough for two. */
function SideNote({ activeId }: { activeId: string }) {
  const wide = useIsWide()
  const zen = useAppStore((s) => s.session.zen)
  // The toolbar acts on this note while it has the cursor: say so in its header.
  const editing = useAppStore((s) => s.ui.sideFocused)
  const note = useAppStore((s) => {
    const id = s.session.splitNoteId
    return id && id !== activeId ? s.notes[id] : undefined
  })
  if (!wide || zen || !note || note.deletedAt !== null) return null
  const title = displayTitle(note)
  return (
    <section
      aria-label={`Side note: ${title}`}
      data-editing={editing || undefined}
      className="flex min-h-0 min-w-0 flex-1 flex-col border-l border-border"
    >
      <div
        className={`flex h-8 shrink-0 items-center gap-2 border-b bg-bg-sunken pl-3 pr-1 text-[12.5px] ${
          editing ? 'border-b-accent text-fg' : 'border-border text-fg-muted'
        }`}
      >
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
      {note.locked ? (
        <p className="grid flex-1 place-items-center p-4 text-center text-[12.5px] text-fg-muted">
          This note is locked. Open its tab to unlock it.
        </p>
      ) : (
        // The side note gets its own Edit/Split/Preview view, format chip and readability panel.
        <div className="relative flex min-h-0 min-w-0 flex-1 flex-col">
          <OpenNote key={note.id} noteId={note.id} side />
          <VoiceStatus noteId={note.id} />
          <DetectChip noteId={note.id} />
          <ReadabilityPanel key={`readability-${note.id}`} noteId={note.id} />
        </div>
      )}
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
  const zen = useAppStore((s) => s.session.zen)
  const activeId = useAppStore((s) => s.session.activeTabId)
  const sideNote = useAppStore((s) => (s.ui.sideFocused ? s.session.splitNoteId : null))
  const toolbarNote = sideNote ?? activeId
  // Whether the toolbar's own note is locked (the main one may be, while the side one isn't).
  const locked = useAppStore((s) => !!(toolbarNote && s.notes[toolbarNote]?.locked))
  const toolbar = useAppStore((s) => s.settings.showToolbar && !s.session.zen) && !locked
  return (
    <main className={`relative flex min-h-0 min-w-0 flex-1 flex-col bg-bg${zen ? ' np-zen' : ''}`}>
      {/* The page's top heading, for screen-reader users who jump by headings. */}
      <h1 className="sr-only">Blankleaf</h1>
      {activeId && toolbar && showToolbar && <Toolbar key={toolbarNote} noteId={toolbarNote!} />}
      {activeId ? (
        <div className="flex min-h-0 flex-1">
          <div className="relative flex min-h-0 min-w-0 flex-1 flex-col">
            <NoteView key={activeId} noteId={activeId} viewOverride={viewOverride} />
            <VoiceStatus noteId={activeId} />
            {!zen && <SampleHint noteId={activeId} />}
            {!zen && <DetectChip noteId={activeId} />}
            {!zen && <ReadabilityPanel key={`readability-${activeId}`} noteId={activeId} />}
          </div>
          {!viewOverride && <Outline noteId={activeId} />}
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
