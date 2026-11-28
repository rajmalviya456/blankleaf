import {
  ArrowDown,
  ArrowUp,
  Copy,
  CopyPlus,
  Download,
  Pencil,
  Pin,
  PinOff,
  Share2,
  Trash2,
  X,
  XCircle,
} from 'lucide-react'
import { exportNote } from '../backup/actions'
import { shareStore } from '../share/shareStore'
import { trashWithUndo } from '../sidebar/trashWithUndo'
import { requestCloseTab } from '../tabs/requestCloseTab'
import { getStore } from '../../store/store'
import { toast } from '../../ui/toast'
import type { ActionItem } from './ActionSheet'

/** Everything the laptop's tab context menu offers, plus Move up/down for reordering by tap. */
export function tabActionItems(noteId: string): ActionItem[] {
  const s = getStore().getState()
  const note = s.notes[noteId]
  if (!note) return []
  const ids = s.session.openTabIds
  const at = ids.indexOf(noteId)
  return [
    { label: 'Rename', icon: Pencil, onSelect: () => s.setUi({ renamingId: noteId }) },
    {
      label: note.pinned ? 'Unpin' : 'Pin',
      icon: note.pinned ? PinOff : Pin,
      onSelect: () => getStore().getState().togglePin(noteId),
    },
    ...(note.locked
      ? []
      : [
          {
            label: 'Duplicate',
            icon: CopyPlus,
            onSelect: () => getStore().getState().duplicateNote(noteId),
          },
        ]),
    ...(note.locked
      ? []
      : [{ label: 'Share…', icon: Share2, onSelect: () => shareStore.getState().open(noteId) }]),
    ...(note.locked
      ? []
      : [
          {
            label: 'Copy text',
            icon: Copy,
            onSelect: () =>
              void navigator.clipboard
                ?.writeText(note.content)
                .then(() => toast('Copied note text'))
                .catch(() =>
                  toast('Couldn’t copy — your browser blocked clipboard access.', { tone: 'warn' }),
                ),
          },
        ]),
    ...(note.locked
      ? []
      : [{ label: 'Download', icon: Download, onSelect: () => exportNote(noteId) }]),
    { label: 'Close', icon: X, onSelect: () => requestCloseTab(noteId) },
    {
      label: 'Close others',
      icon: XCircle,
      onSelect: () => getStore().getState().closeOthers(noteId),
    },
    {
      label: 'Close tabs below',
      icon: XCircle,
      disabled: at === ids.length - 1,
      onSelect: () => getStore().getState().closeToRight(noteId),
    },
    {
      label: 'Move up',
      icon: ArrowUp,
      disabled: at <= 0,
      onSelect: () =>
        getStore()
          .getState()
          .moveTab(at, at - 1),
    },
    {
      label: 'Move down',
      icon: ArrowDown,
      disabled: at === ids.length - 1,
      onSelect: () =>
        getStore()
          .getState()
          .moveTab(at, at + 1),
    },
    {
      label: 'Move to Trash',
      icon: Trash2,
      danger: true,
      onSelect: () => trashWithUndo(noteId),
    },
  ]
}
