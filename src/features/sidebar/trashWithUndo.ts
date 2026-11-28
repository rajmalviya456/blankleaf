/**
 * Move a note to Trash from anywhere (toolbar, tab menu, notes list, palette, phone menus) and
 * offer an Undo that puts everything back as it was: the note, its pin, and its tab, in the
 * same place, active again if it was the one being worked on.
 */
import { displayTitle } from '../../domain/title'
import { getStore } from '../../store/store'
import { toast } from '../../ui/toast'

export function trashWithUndo(id: string): void {
  const s = getStore().getState()
  const note = s.notes[id]
  if (!note || note.deletedAt !== null) return
  const { openTabIds, activeTabId } = s.session
  const before = {
    at: openTabIds.indexOf(id),
    active: activeTabId,
    pinned: note.pinned,
  }
  s.trashNote(id)
  toast(`Moved “${displayTitle(note)}” to Trash`, {
    action: { label: 'Undo', run: () => undoTrash(id, before) },
  })
}

function undoTrash(id: string, before: { at: number; active: string | null; pinned: boolean }) {
  const s = () => getStore().getState()
  // Deleted for good meanwhile, or already restored: nothing to undo.
  if (s().notes[id]?.deletedAt == null) return
  s().restoreNote(id)
  // Trash unpins; a pinned note always has its tab, so pinning it again reopens that too.
  if (before.pinned) s().togglePin(id)
  if (before.at < 0) return
  s().openNote(id)
  const now = s().session.openTabIds.indexOf(id)
  if (now >= 0 && now !== before.at) s().moveTab(now, before.at)
  if (before.active && before.active !== id && s().session.openTabIds.includes(before.active))
    s().setActive(before.active)
}
