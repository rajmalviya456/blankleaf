/**
 * Automatic backup: keeps a backup file up to date in a folder the user picks, so notes survive
 * cleared browser data. Needs the File System Access API (Chrome and Edge on a computer).
 *
 * Writes blankleaf-backup-latest.json, plus one dated copy per day (the newest seven are kept),
 * so a mistake today can't overwrite yesterday's safety net.
 */
import type { StoreApi } from 'zustand'
import { createStore } from 'zustand/vanilla'
import type { BlankleafDB } from '../../db/db'
import { putKv } from '../../db/notesRepo'
import { getStore, type AppStore } from '../../store/store'
import { toast } from '../../ui/toast'
import { buildBackupFile } from './actions'
import { backupFileName } from './backup'
import { getLastBackupAt, markBackedUp } from './meta'

export const LATEST_FILE = 'blankleaf-backup-latest.json'
export const DAILY_COPIES = 7
export const SAVE_DELAY_MS = 30_000
const DAILY_FILE = /^blankleaf-backup-\d{4}-\d{2}-\d{2}\.json$/

type Permission = 'granted' | 'denied' | 'prompt'
interface Writable {
  write(text: string): Promise<void>
  close(): Promise<void>
}
export interface BackupFolder {
  name: string
  queryPermission(o: { mode: 'readwrite' }): Promise<Permission>
  requestPermission(o: { mode: 'readwrite' }): Promise<Permission>
  getFileHandle(
    name: string,
    o: { create: boolean },
  ): Promise<{ createWritable(): Promise<Writable> }>
  removeEntry(name: string): Promise<void>
  keys(): AsyncIterable<string>
}

export type FolderStatus = 'unsupported' | 'off' | 'on' | 'paused'

interface FolderBackupState {
  status: FolderStatus
  folderName: string | null
  savedAt: number | null
}

const picker = () =>
  (
    window as unknown as {
      showDirectoryPicker?(o: { mode: 'readwrite'; id: string }): Promise<BackupFolder>
    }
  ).showDirectoryPicker

export const folderBackupStore = createStore<FolderBackupState>()(() => ({
  status: 'off',
  folderName: null,
  savedAt: null,
}))

/** Where the chosen folder is remembered. Replaceable in tests. */
export interface FolderMemory {
  load(): Promise<BackupFolder | null>
  save(folder: BackupFolder | null): Promise<void>
}

const dbMemory = (db: BlankleafDB): FolderMemory => ({
  load: async () => ((await db.kv.get('backupFolder'))?.value as BackupFolder | undefined) ?? null,
  save: async (folder) => {
    if (folder) await putKv(db, 'backupFolder', folder)
    else await db.kv.delete('backupFolder')
  },
})

let memory: FolderMemory | null = null
let folder: BackupFolder | null = null
let timer: ReturnType<typeof setTimeout> | undefined
let dirty = false
let delay = SAVE_DELAY_MS
let writing: Promise<void> | null = null

const set = (patch: Partial<FolderBackupState>) => folderBackupStore.setState(patch)

async function writeFile(target: BackupFolder, name: string, text: string): Promise<void> {
  const file = await target.getFileHandle(name, { create: true })
  const out = await file.createWritable()
  await out.write(text) // The browser swaps the file in only when it closes.
  await out.close()
}

async function pruneDailyCopies(target: BackupFolder): Promise<void> {
  const daily: string[] = []
  for await (const name of target.keys()) if (DAILY_FILE.test(name)) daily.push(name)
  const old = daily.sort().slice(0, Math.max(0, daily.length - DAILY_COPIES))
  await Promise.all(old.map((name) => target.removeEntry(name)))
}

/** An empty app must never replace a good backup. */
const hasSomethingToSave = () =>
  Object.values(getStore().getState().notes).some((n) => n.content.trim() || n.locked)

function pause(problem: string) {
  clearTimeout(timer)
  timer = undefined
  set({ status: 'paused' })
  toast(problem, {
    tone: 'warn',
    durationMs: 0,
    action: { label: 'Resume', run: () => void resumeFolderBackup() },
  })
}

async function writeNow(now: number): Promise<void> {
  const target = folder
  if (!target || folderBackupStore.getState().status !== 'on' || !hasSomethingToSave()) return
  dirty = false
  try {
    const { text } = await buildBackupFile(now)
    await writeFile(target, LATEST_FILE, text)
    await writeFile(target, backupFileName(now), text)
    await pruneDailyCopies(target)
    await markBackedUp(now)
    set({ savedAt: now })
  } catch (e) {
    dirty = true
    const name = e instanceof DOMException ? e.name : ''
    console.error('Blankleaf: automatic backup failed', e)
    if (name === 'NotFoundError') pause('Your backup folder was moved or deleted. Choose it again.')
    else if (name === 'NotAllowedError' || name === 'SecurityError')
      pause('Automatic backup needs your permission again.')
    else toast('Automatic backup couldn’t save. It will try again.', { tone: 'warn' })
  }
}

/** Save now, or once more after the save already running. */
export function backupToFolderNow(now: number = Date.now()): Promise<void> {
  clearTimeout(timer)
  timer = undefined
  writing = (writing ?? Promise.resolve()).then(() => writeNow(now))
  return writing
}

function schedule() {
  dirty = true
  if (timer !== undefined || folderBackupStore.getState().status !== 'on') return
  timer = setTimeout(() => {
    timer = undefined
    void backupToFolderNow()
  }, delay)
}

/** Load the remembered folder and keep it up to date. Returns a function that stops watching. */
export async function startFolderBackup(
  store: StoreApi<AppStore>,
  db: BlankleafDB,
  mem: FolderMemory = dbMemory(db),
  saveDelay: number = SAVE_DELAY_MS,
): Promise<() => void> {
  delay = saveDelay
  memory = mem
  folder = null
  dirty = false
  writing = null
  set({ savedAt: getLastBackupAt(), folderName: null, status: picker() ? 'off' : 'unsupported' })
  const stopWatching = store.subscribe((s, prev) => {
    if (s.notes !== prev.notes) schedule()
  })
  const onHide = () => {
    if (document.visibilityState === 'hidden' && dirty) void backupToFolderNow()
  }
  document.addEventListener('visibilitychange', onHide)
  const stop = () => {
    stopWatching()
    document.removeEventListener('visibilitychange', onHide)
    clearTimeout(timer)
    timer = undefined
  }
  if (!picker()) return stop

  const saved = await mem.load().catch(() => null)
  if (!saved) return stop
  folder = saved
  set({ folderName: saved.name })
  if ((await saved.queryPermission({ mode: 'readwrite' }).catch(() => 'denied')) === 'granted') {
    set({ status: 'on' })
    schedule()
  } else pause('Automatic backup is paused until you allow it again.')
  return stop
}

export async function chooseBackupFolder(): Promise<void> {
  const pick = picker()
  if (!pick) return
  let chosen: BackupFolder
  try {
    chosen = await pick.call(window, { mode: 'readwrite', id: 'blankleaf-backup' })
  } catch (e) {
    if (e instanceof DOMException && e.name === 'AbortError') return // the picker was closed
    throw e
  }
  folder = chosen
  await memory?.save(chosen)
  set({ status: 'on', folderName: chosen.name })
  await backupToFolderNow()
  toast(`Automatic backup is on. Saving to “${chosen.name}”.`)
}

/** Must run from a click: browsers only show the permission prompt after one. */
export async function resumeFolderBackup(): Promise<void> {
  if (!folder) return chooseBackupFolder()
  const granted = (await folder.requestPermission({ mode: 'readwrite' })) === 'granted'
  if (!granted) return
  set({ status: 'on' })
  await backupToFolderNow()
}

export async function turnOffFolderBackup(): Promise<void> {
  clearTimeout(timer)
  timer = undefined
  folder = null
  await memory?.save(null)
  set({ status: 'off', folderName: null })
}
