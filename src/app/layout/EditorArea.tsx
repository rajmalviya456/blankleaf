import { Plus } from 'lucide-react'
import { Editor } from '../../features/editor/Editor'
import { getStore, useAppStore } from '../../store/store'

/** Fills all remaining space with the active note's editor, or an empty state. */
export function EditorArea() {
  const activeId = useAppStore((s) => s.session.activeTabId)
  return (
    <main className="relative flex min-h-0 min-w-0 flex-1 flex-col bg-bg">
      {activeId ? (
        <Editor key={activeId} noteId={activeId} />
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
