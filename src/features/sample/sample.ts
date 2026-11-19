/**
 * The sample note: the welcome note's Markdown tour (checklist, diagram, code, math, table),
 * opened beside its preview. First-time visitors get it automatically; anyone can reopen it.
 */
import type { StoreApi } from 'zustand'
import { WELCOME_CONTENT } from '../../domain/defaults'
import { PHONE_QUERY } from '../../lib/media'
import type { AppStore } from '../../store/store'
import { phoneStore } from '../phone/phoneStore'

export const SAMPLE_HINT_KEY = 'blankleaf:sample-hint'

export const SAMPLE_NOTE = WELCOME_CONTENT

const onPhone = () =>
  typeof window.matchMedia === 'function' && window.matchMedia(PHONE_QUERY).matches

/** Show a Markdown note rendered: beside its text on a laptop, as the preview on a phone. */
export function showRendered(store: StoreApi<AppStore>, id: string): void {
  if (onPhone()) phoneStore.getState().setPreview(id, true)
  else store.getState().setViewState(id, { previewMode: 'split', anchor: 0, head: 0 })
}

/** Open the sample as a new note, shown rendered. */
export function openSample(store: StoreApi<AppStore>): string {
  const id = store
    .getState()
    .newNote({ content: SAMPLE_NOTE, mode: 'markdown', language: 'markdown' })
  showRendered(store, id)
  return id
}

export function sampleHintHidden(): boolean {
  try {
    return localStorage.getItem(SAMPLE_HINT_KEY) === 'hidden'
  } catch {
    return false
  }
}

export function hideSampleHint(): void {
  try {
    localStorage.setItem(SAMPLE_HINT_KEY, 'hidden')
  } catch {
    // Storage blocked: the offer just comes back next time.
  }
}
