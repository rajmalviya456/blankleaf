/**
 * Automatic backup: keeps a backup file up to date in a folder the user picks, so notes survive
 * cleared browser data. Needs the File System Access API (Chrome and Edge on a computer).
 *
 * Writes blankleaf-backup-latest.json, plus one dated blankleaf-auto copy per day (the newest
 * seven are kept), so a mistake today can't overwrite yesterday's safety net.
 */
import type { StoreApi } from 'zustand'
import { createStore } from 'zustand/vanilla'
import type { BlankleafDB } from '../../db/db'
import { putKv } from '../../db/notesRepo'
import { WELCOME_CONTENT } from '../../domain/defaults'
import { getStore, type AppStore } from '../../store/store'
import { toast } from '../../ui/toast'
import { buildBackupFile, importFileList } from './actions'
import { backupFileName } from './backup'
import { getLastBackupAt, markBackedUp } from './meta'

export const LATEST_FILE = 'blankleaf-backup-latest.json'
/** A backup already in the folder when it was chosen is kept here. */
export const PREVIOUS_FILE = 'blankleaf-backup-previous.json'
export const DAILY_COPIES = 7
export const SAVE_DELAY_MS = 30_000
export const FOLDER_CHANNEL = 'blankleaf-backup-folder'
// Its own name: backups exported by hand into the same folder are never touched.
const DAILY_FILE = /^blankleaf-auto-\d{4}-\d{2}-\d{2}\.json$/
const dailyName = (now: number) =>
  backupFileName(now).replace('blankleaf-backup-', 'blankleaf-auto-')

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
  ): Promise<{ createWritable(): Promise<Writable>; getFile(): Promise<File> }>
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
let channel: BroadcastChannel | null = null

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

/** An empty app, or one showing only the Welcome note, must never replace a good backup. */
const hasSomethingToSave = () =>
  Object.values(getStore().getState().notes).some(
    (n) => n.locked || (n.content.trim() && n.content !== WELCOME_CONTENT),
  )

const announce = () => {
  channel?.postMessage('changed')
}

function pause(problem: string, action = 'Resume') {
  clearTimeout(timer)
  timer = undefined
  set({ status: 'paused' })
  toast(problem, {
    tone: 'warn',
    durationMs: 0,
    action: { label: action, run: () => void resumeFolderBackup() },
  })
}

async function writeNow(now: number): Promise<void> {
  const target = folder
  if (!target || folderBackupStore.getState().status !== 'on' || !hasSomethingToSave()) return
  dirty = false
  try {
    const { text } = await buildBackupFile(now)
    await writeFile(target, LATEST_FILE, text)
    await writeFile(target, dailyName(now), text)
    await pruneDailyCopies(target)
    await markBackedUp(now)
    set({ savedAt: now })
  } catch (e) {
    dirty = true
    const name = e instanceof DOMException ? e.name : ''
    console.error('Blankleaf: automatic backup failed', e)
    if (name === 'NotFoundError') {
      // The remembered folder is gone: the next step has to be picking a new one.
      folder = null
      await memory?.save(null)
      pause('Your backup folder was moved or deleted. Choose it again.', 'Choose folder')
    } else if (name === 'NotAllowedError' || name === 'SecurityError')
      pause('Automatic backup needs your permission again.')
    else {
      toast('Automatic backup couldn’t save. It will try again.', { tone: 'warn' })
      schedule()
    }
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
  channel = typeof BroadcastChannel === 'undefined' ? null : new BroadcastChannel(FOLDER_CHANNEL)
  if (channel) channel.onmessage = () => void followRememberedFolder()
  const stop = () => {
    channel?.close()
    channel = null
    stopWatching()
    document.removeEventListener('visibilitychange', onHide)
    clearTimeout(timer)
    timer = undefined
  }
  if (!picker()) return stop

  await followRememberedFolder()
  return stop
}

/** Follow the folder saved for this browser (at startup, or after another window changed it). */
async function followRememberedFolder(): Promise<void> {
  const saved = await memory?.load().catch(() => null)
  if (!saved) {
    clearTimeout(timer)
    timer = undefined
    folder = null
    set({ status: picker() ? 'off' : 'unsupported', folderName: null })
    return
  }
  folder = saved
  set({ folderName: saved.name })
  if ((await saved.queryPermission({ mode: 'readwrite' }).catch(() => 'denied')) === 'granted') {
    set({ status: 'on' })
    schedule()
  } else pause('Automatic backup is paused until you allow it again.')
}

/** A backup that was in the folder before this browser started using it. */
async function existingBackup(target: BackupFolder): Promise<File | null> {
  try {
    return await (await target.getFileHandle(LATEST_FILE, { create: false })).getFile()
  } catch {
    return null
  }
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
  const existing = await existingBackup(chosen)
  folder = chosen
  await memory?.save(chosen)
  announce()
  set({ status: 'on', folderName: chosen.name })
  if (existing && !hasSomethingToSave()) {
    // Most likely a new browser or cleared data: offer the backup instead of replacing it.
    toast('This folder already has a backup. Restore your notes from it?', {
      durationMs: 0,
      action: { label: 'Restore', run: () => void importFileList([existing]) },
    })
    return
  }
  if (existing) await writeFile(chosen, PREVIOUS_FILE, await existing.text())
  await backupToFolderNow()
  toast(`Automatic backup is on. Saving to “${chosen.name}”.`)
}

/** False once the remembered folder has been lost and a new one must be picked. */
export const hasBackupFolder = () => folder !== null

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
  announce()
  set({ status: 'off', folderName: null })
}
