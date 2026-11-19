/**
 * Getting text into Blankleaf from outside: the phone's Share menu and opening files from the
 * computer. Both work once Blankleaf is installed as an app.
 */
import type { StoreApi } from 'zustand'
import { COMMANDS } from '../../commands/registry'
import type { Note } from '../../domain/types'
import type { AppStore } from '../../store/store'
import { openToday } from '../templates/templates'
import { isFreshVisit } from '../../store/freshStart'
import { getStore } from '../../store/store'
import { importFileList } from '../backup/actions'

const SHARE_PARAMS = ['title', 'text', 'url']
const MAX_SHARED_CHARS = 1_000_000
const MAX_TITLE_CHARS = 120

/**
 * The note shared with the app, if any. Only the installed app accepts these: otherwise any
 * website could add notes to your list just by linking to Blankleaf.
 */
export function sharedNoteFrom(params: URLSearchParams, installed: boolean): Partial<Note> | null {
  if (!installed) return null
  const title = params.get('title')?.trim().slice(0, MAX_TITLE_CHARS) || null
  const text = params.get('text')?.trim() ?? ''
  const url = params.get('url')?.trim() ?? ''
  const content = [text, text.includes(url) ? '' : url]
    .filter(Boolean)
    .join('\n\n')
    .slice(0, MAX_SHARED_CHARS)
  return content ? { title, content } : null
}

/** Read what was shared with this launch, and take it out of the address bar. */
export function takeSharedNote(): Partial<Note> | null {
  const url = new URL(location.href)
  if (!SHARE_PARAMS.some((p) => url.searchParams.has(p))) return null
  const installed = matchMedia('(display-mode: standalone)').matches
  const note = sharedNoteFrom(url.searchParams, installed)
  SHARE_PARAMS.forEach((p) => url.searchParams.delete(p))
  history.replaceState(history.state, '', url.pathname + url.search)
  return note
}

interface LaunchParams {
  files?: readonly { getFile(): Promise<File> }[]
}
interface LaunchQueue {
  setConsumer(consumer: (params: LaunchParams) => void | Promise<void>): void
}

/** Open the files the app was launched with (double-click, or "Open with Blankleaf"). */
export function openLaunchedFiles(): void {
  const queue = (window as unknown as { launchQueue?: LaunchQueue }).launchQueue
  queue?.setConsumer(async ({ files }) => {
    // Browsers hand the same files over again on reload: they're already notes by then.
    if (!files?.length || !isFreshVisit()) return
    const before = getStore().getState()
    const active = before.session.activeTabId
    const note = active ? before.notes[active] : undefined
    const startedBlank = !!note && note.title === null && !note.content.trim() && !note.locked
    await importFileList(await Promise.all(files.map((f) => f.getFile())))
    // The blank page was only waiting for something to open.
    const now = getStore().getState()
    if (startedBlank && active && now.session.activeTabId !== active) now.closeTab(active)
  })
}

/** The installed app's icon menu: New note, Today's note, Search notes. */
export type LaunchShortcut = 'new' | 'today' | 'search'
const SHORTCUTS: readonly LaunchShortcut[] = ['new', 'today', 'search']

/** The icon shortcut this launch came from, if any; taken out of the address bar once read. */
export function takeLaunchShortcut(): LaunchShortcut | null {
  const url = new URL(location.href)
  const value = url.searchParams.get('shortcut')
  if (value === null) return null
  url.searchParams.delete('shortcut')
  history.replaceState(history.state, '', url.pathname + url.search + url.hash)
  return (SHORTCUTS as readonly string[]).includes(value) ? (value as LaunchShortcut) : null
}

export function runLaunchShortcut(shortcut: LaunchShortcut, store: StoreApi<AppStore>): void {
  const s = store.getState()
  if (shortcut === 'today') return void openToday(store)
  if (shortcut === 'search') return COMMANDS.find((c) => c.id === 'view.search')?.run({ store })
  const active = s.session.activeTabId ? s.notes[s.session.activeTabId] : undefined
  if (!active || active.content || active.locked) s.newNote()
}
