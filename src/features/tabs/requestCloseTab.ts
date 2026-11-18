import { getStore } from '../../store/store'

/** Close a tab; pinned tabs ask to be unpinned first (see UnpinPrompt). */
export function requestCloseTab(id: string): void {
  const s = getStore().getState()
  if (s.notes[id]?.pinned) s.setUi({ unpinPromptId: id })
  else s.closeTab(id)
}
