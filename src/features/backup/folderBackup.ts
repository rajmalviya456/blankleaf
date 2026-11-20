/**
 * Automatic backup: keeps a backup file up to date in a folder the user picks, so notes survive
 * cleared browser data. Offered wherever the browser has the File System Access API.
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
import { backupFileName, looksLikeBackup } from './backup'
import {
  backupSalt,
  decryptBackup,
  encryptBackup,
  isEncryptedBackup,
  type BackupKey,
} from './backupCrypto'
import { getBackupKey, onBackupKeyChange } from './backupKey'
import { backupPasswordStore } from './backupPasswordStore'
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
    const { text: plain } = await buildBackupFile(now)
    const key = await getBackupKey()
    const text = key ? await encryptBackup(plain, key) : plain
    await writeFile(target, LATEST_FILE, text)
    await writeFile(target, dailyName(now), text)
    await pruneDailyCopies(target)
    // Another window changed the backup password during this save: save again with the new one.
    const after = await getBackupKey()
    if ((after?.salt ?? null) !== (key?.salt ?? null)) schedule()
    await encryptLeftovers(target, after)
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

/** The folder's files this app writes (never backups exported into it by hand). */
const ownFile = (name: string) =>
  name === LATEST_FILE || name === PREVIOUS_FILE || DAILY_FILE.test(name)

/**
 * Rewrite this app's backups in the folder for the backup key `to` (unencrypted for null):
 * files encrypted with `from` are opened with it, readable ones are encrypted. A file neither
 * key opens (an older password) is left as it is. Returns how many files couldn't be rewritten.
 */
async function recryptFiles(
  target: BackupFolder,
  from: BackupKey | null,
  to: BackupKey | null,
): Promise<number> {
  let failed = 0
  const names: string[] = []
  for await (const name of target.keys()) if (ownFile(name)) names.push(name)
  for (const name of names) {
    try {
      const now = await (
        await (await target.getFileHandle(name, { create: false })).getFile()
      ).text()
      let plain: string | null = null
      if (isEncryptedBackup(now)) {
        if (to && backupSalt(now) === to.salt) continue // already right
        plain = from ? await decryptBackup(now, from).catch(() => null) : null
      } else if (looksLikeBackup(now)) {
        if (!to) continue // already right
        plain = now
      }
      if (plain === null) continue
      await writeFile(target, name, to ? await encryptBackup(plain, to) : plain)
    } catch (e) {
      console.error(`Blankleaf: could not re-encrypt ${name}`, e)
      failed++
    }
  }
  return failed
}

/** The key the folder's files were last checked against (once per key, not on every save). */
let checkedFor: string | null | undefined

/** After a save: any readable backup left in the folder (older copies) gets encrypted too. */
async function encryptLeftovers(target: BackupFolder, key: BackupKey | null): Promise<void> {
  const salt = key?.salt ?? null
  if (!key || checkedFor === salt) return
  if ((await recryptFiles(target, null, key)) === 0) checkedFor = salt
}

/** The backup password was set, changed or removed: redo the saved backups, after any save. */
function onKeyChange(from: BackupKey | null, to: BackupKey | null): Promise<void> {
  const target = folder
  if (!target) return Promise.resolve()
  const run = async () => {
    const failed = await recryptFiles(target, from, to).catch(() => 1)
    // Otherwise the next save tries the leftovers again (paused folder, a locked file…).
    checkedFor = failed ? undefined : (to?.salt ?? null)
    if (failed)
      toast(
        `${failed === 1 ? 'A backup' : `${failed} backups`} in “${target.name}” couldn’t be re-encrypted. Back up now to replace ${failed === 1 ? 'it' : 'them'}.`,
        { tone: 'warn', action: { label: 'Back up now', run: () => void backupToFolderNow() } },
      )
  }
  writing = (writing ?? Promise.resolve()).then(run)
  return writing
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
  checkedFor = undefined
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
  const stopRecrypt = onBackupKeyChange(onKeyChange)
  channel = typeof BroadcastChannel === 'undefined' ? null : new BroadcastChannel(FOLDER_CHANNEL)
  if (channel) channel.onmessage = () => void followRememberedFolder()
  const stop = () => {
    stopRecrypt()
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
  // Asked after the folder is picked: the browser shows its picker only straight after a click.
  if (!(await getBackupKey()) && (await backupPasswordStore.getState().ask('folder')) === 'cancel')
    return
  const existing = await existingBackup(chosen)
  folder = chosen
  checkedFor = undefined // a new folder may hold readable backups from before
  await memory?.save(chosen)
  announce()
  set({ status: 'on', folderName: chosen.name })
  // Kept aside first, so later automatic saves can't replace it before the user decides.
  const kept = existing ? await existing.text() : null
  if (kept !== null) {
    const key = await getBackupKey()
    const readable = key && !isEncryptedBackup(kept) && looksLikeBackup(kept)
    await writeFile(chosen, PREVIOUS_FILE, readable ? await encryptBackup(kept, key) : kept)
  }
  if (existing && kept !== null && !hasSomethingToSave()) {
    // Most likely a new browser or cleared data: offer the backup instead of replacing it.
    const copy = new File([kept], existing.name, { type: 'application/json' })
    toast('This folder already has a backup. Restore your notes from it?', {
      durationMs: 0,
      action: { label: 'Restore', run: () => void importFileList([copy]) },
    })
    return
  }
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
