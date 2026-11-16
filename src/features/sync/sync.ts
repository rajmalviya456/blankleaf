/**
 * Keeps several open Notepadz windows/tabs consistent via BroadcastChannel.
 *
 * - After any successful write, persistence tells us; we announce it to other windows.
 * - A window that receives a note change reloads it from IndexedDB — unless it has unsaved
 *   edits to that note, in which case its next save hits a rev conflict instead.
 * - A rev conflict never drops text: the other window's version stays in the note and this
 *   window's text is saved as a new "(conflict copy)" note.
 */
import type { StoreApi } from 'zustand'
import type { NotepadzDB } from '../../db/db'
import { mergeSettings } from '../../domain/defaults'
import { displayTitle } from '../../domain/title'
import type { Note, Settings } from '../../domain/types'
import type { Persistence, WriteEvent } from '../../store/persistence'
import type { AppStore } from '../../store/store'
import { toast } from '../../ui/toast'

export type SyncMsg = WriteEvent & { from: string }

/** The slice of BroadcastChannel we use (lets tests pass an in-memory stand-in). */
export interface SyncChannel {
  onmessage: ((e: MessageEvent) => void) | null
  postMessage(data: unknown): void
  close(): void
}

export const CHANNEL_NAME = 'notepadz'

/** Keep the other window's text in the note and save ours as a new note next to it. */
export function resolveConflict(
  store: StoreApi<AppStore>,
  local: Note,
  current: Note,
  _now: number = Date.now(),
): string {
  const s = store.getState()
  s.applyRemoteNote(current)
  if (s.session.openTabIds.includes(current.id)) s.setActive(current.id)
  const copyId = store.getState().newNote({
    title: `${displayTitle(current)} (conflict copy)`,
    content: local.content,
    mode: local.mode,
    language: local.language,
    wrap: local.wrap,
    pinned: false,
  })
  toast('Edited in another window — your version was saved as a copy.', { tone: 'warn' })
  return copyId
}

function sameSettings(a: Settings, b: Settings): boolean {
  return JSON.stringify(a) === JSON.stringify(b)
}

export function startSync(
  store: StoreApi<AppStore>,
  db: NotepadzDB,
  persistence: Persistence,
  channel: SyncChannel = new BroadcastChannel(CHANNEL_NAME),
): { stop(): void } {
  const self = crypto.randomUUID()
  let stopped = false
  const s = () => store.getState()

  const offWrite = persistence.onWrite((e) => {
    if (!stopped) channel.postMessage({ ...e, from: self } satisfies SyncMsg)
  })

  const offConflict = persistence.onConflict((local, current) => {
    persistence.markSynced(current.id, current.rev)
    resolveConflict(store, local, current)
  })

  const applyNote = async (id: string) => {
    if (persistence.hasPendingFor(id)) return
    const stored = await db.notes.get(id)
    if (!stored || persistence.hasPendingFor(id)) return
    const local = s().notes[id]
    if (local && local.rev >= stored.rev) return
    persistence.markSynced(id, stored.rev)
    s().applyRemoteNote(stored)
  }

  const applyDelete = (id: string) => {
    if (!s().notes[id] || persistence.hasPendingFor(id)) return
    persistence.markSynced(id, 0)
    s().removeRemoteNote(id)
  }

  const applySettings = async () => {
    const row = await db.kv.get('settings')
    const next = mergeSettings(row?.value as Partial<Settings> | undefined)
    if (!sameSettings(next, s().settings)) s().updateSettings(next)
  }

  channel.onmessage = (e: MessageEvent) => {
    const msg = e.data as SyncMsg
    if (stopped || !msg || msg.from === self) return
    if (msg.t === 'note') void applyNote(msg.id)
    else if (msg.t === 'deleted') applyDelete(msg.id)
    else if (msg.t === 'settings') void applySettings()
  }

  return {
    stop() {
      stopped = true
      offWrite()
      offConflict()
      channel.onmessage = null
      channel.close()
    },
  }
}
