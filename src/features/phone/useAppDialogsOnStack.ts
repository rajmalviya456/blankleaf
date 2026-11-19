/**
 * On phones, app dialogs (Settings, Share, the palette…) join the overlay stack so the Back
 * button closes them like any sheet: opening one pushes it, Back closes it, and closing it any
 * other way takes it off the stack.
 */
import { useEffect } from 'react'
import { useStore } from 'zustand'
import { getStore, useAppStore } from '../../store/store'
import { importStore } from '../backup/importStore'
import { shareStore } from '../share/shareStore'
import { historyStore } from '../history/historyStore'
import { tagsStore } from '../tags/tagsStore'
import { lockStore } from '../lock/lockStore'
import { goalStore } from '../goal/goalStore'
import { compareStore } from '../compare/compareStore'
import { phoneStore, sameOverlay, type AppDialog, type PhoneOverlay } from './phoneStore'

const CLOSE: Record<AppDialog, () => void> = {
  settings: () => getStore().getState().setUi({ settingsOpen: false }),
  about: () => getStore().getState().setUi({ aboutOpen: false }),
  whatsNew: () => getStore().getState().setUi({ whatsNewOpen: false }),
  shortcuts: () => getStore().getState().setUi({ shortcutsOpen: false }),
  palette: () => getStore().getState().setUi({ paletteOpen: false }),
  unpin: () => getStore().getState().setUi({ unpinPromptId: null }),
  share: () => shareStore.getState().close(),
  import: () => importStore.getState().close(),
  history: () => historyStore.getState().close(),
  compare: () => compareStore.getState().close(),
  tags: () => tagsStore.getState().close(),
  lock: () => lockStore.getState().close(),
  goal: () => goalStore.getState().close(),
}

const entry = (id: AppDialog): PhoneOverlay => ({ kind: 'app', id })
const onStack = (stack: PhoneOverlay[], id: AppDialog) =>
  stack.some((o) => sameOverlay(o, entry(id)))

export function useAppDialogsOnStack(): void {
  const ui = useAppStore((s) => s.ui)
  const share = useStore(shareStore, (s) => s.dialogNoteId !== null)
  const importing = useStore(importStore, (s) => s.open)
  const history = useStore(historyStore, (s) => s.noteId !== null)
  const compare = useStore(compareStore, (s) => s.noteId !== null)
  const tags = useStore(tagsStore, (s) => s.noteId !== null)
  const lock = useStore(lockStore, (s) => s.noteId !== null)
  const goal = useStore(goalStore, (s) => s.noteId !== null)
  const open: Record<AppDialog, boolean> = {
    settings: ui.settingsOpen,
    about: ui.aboutOpen,
    whatsNew: ui.whatsNewOpen,
    shortcuts: ui.shortcutsOpen,
    palette: ui.paletteOpen,
    unpin: ui.unpinPromptId !== null,
    share,
    import: importing,
    history,
    compare,
    tags,
    lock,
    goal,
  }
  const key = Object.entries(open)
    .map(([id, on]) => `${id}:${on ? 1 : 0}`)
    .join(',')

  // Dialog opened → push it; dialog closed (✕, Escape, a button) → take it off the stack.
  useEffect(() => {
    const p = phoneStore.getState()
    for (const id of Object.keys(open) as AppDialog[]) {
      const there = onStack(phoneStore.getState().stack, id)
      if (open[id] && !there) p.open(entry(id))
      else if (!open[id] && there) {
        const stack = phoneStore.getState().stack
        if (sameOverlay(stack.at(-1)!, entry(id))) p.close()
        else phoneStore.setState({ stack: stack.filter((o) => !sameOverlay(o, entry(id))) })
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key])

  // Back popped a dialog's entry → close that dialog.
  useEffect(
    () =>
      phoneStore.subscribe((s, prev) => {
        for (const o of prev.stack)
          if (typeof o === 'object' && o.kind === 'app' && !onStack(s.stack, o.id)) CLOSE[o.id]()
      }),
    [],
  )
}
