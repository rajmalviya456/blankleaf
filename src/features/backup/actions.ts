import { OPENABLE_EXTENSIONS } from '../../domain/languages'
/** User-facing backup actions: export all, export one note, import files. */
import { importVersions } from '../../db/versionsRepo'
import { getActiveDb } from '../../store/dataReset'
import { getStore } from '../../store/store'
import { toast } from '../../ui/toast'
import {
  BackupError,
  backupFileName,
  backupText,
  looksLikeBackup,
  parseBackup,
  planImport,
  type BackupVersion,
  type ImportPlan,
} from './backup'
import { backupSalt, decryptBackup, encryptBackup, isEncryptedBackup } from './backupCrypto'
import { getBackupKey } from './backupKey'
import { backupPasswordStore } from './backupPasswordStore'
import { downloadText } from './download'
import { fileToNote, isProbablyBinary, noteExportFile } from './importFiles'
import { importStore } from './importStore'
import { markBackedUp } from './meta'

const MAX_FILE_BYTES = 50 * 1024 * 1024
const MAX_BACKUP_BYTES = 500 * 1024 * 1024

/** The text of a full backup, and whether it managed to include version history. */
export async function buildBackupFile(
  now: number,
): Promise<{ text: string; noteCount: number; hasHistory: boolean }> {
  const s = getStore().getState()
  const notes = Object.values(s.notes)
  const { versions, complete } = await versionsForBackup(
    notes.filter((n) => !n.locked).map((n) => n.id),
  )
  const { text, withVersions } = backupText(notes, s.settings, now, versions)
  return {
    text,
    noteCount: notes.length,
    hasHistory: complete && (withVersions || !versions.length),
  }
}

/**
 * Download a backup of everything, encrypted with the backup password. Without one yet, it asks
 * for one first (or, if the person chooses, saves without: `plain`).
 */
export async function exportAll(
  now: number = Date.now(),
  how: 'ask' | 'plain' = 'ask',
): Promise<void> {
  const key = await getBackupKey()
  if (!key && how === 'ask') {
    const answer = await backupPasswordStore.getState().ask('export')
    if (answer === 'set') return exportAll(now)
    if (answer === 'plain') return exportAll(now, 'plain')
    return
  }
  const { text, noteCount, hasHistory } = await buildBackupFile(now)
  const out = key ? await encryptBackup(text, key) : text
  downloadText(backupFileName(now), 'application/json', out)
  await markBackedUp(now)
  const what = key ? 'Encrypted backup saved' : 'Backup saved'
  if (hasHistory) toast(`${what} (${noteCount} notes). Keep it somewhere safe.`)
  else toast(`${what} (${noteCount} notes), without version history.`, { tone: 'warn' })
}

/** Every saved version of these notes. A problem reading them never blocks the backup. */
async function versionsForBackup(
  noteIds: string[],
): Promise<{ versions: BackupVersion[]; complete: boolean }> {
  const db = getActiveDb()
  if (!db) return { versions: [], complete: true }
  try {
    const ids = new Set(noteIds)
    const rows = await db.versions.toArray()
    const versions = rows
      .filter((v) => ids.has(v.noteId))
      .map(({ noteId, at, content }) => ({ noteId, at, content }))
    return { versions, complete: true }
  } catch (e) {
    console.error('Blankleaf: could not read version history for the backup', e)
    return { versions: [], complete: false }
  }
}

export function exportNote(id: string): void {
  const note = getStore().getState().notes[id]
  if (!note) return
  const f = noteExportFile(note)
  downloadText(f.name, f.mime, f.text)
}

async function tombstoneIdsFromDb(): Promise<Set<string>> {
  const db = getActiveDb()
  if (!db) return new Set()
  return new Set(await db.tombstones.toCollection().primaryKeys())
}

/**
 * Import picked or dropped files. A Blankleaf backup opens the merge dialog; any other text
 * file becomes a new note in the matching format; binary files are refused.
 */
export async function importFileList(
  files: File[],
  opts: { tombstoneIds?: Set<string> } = {},
): Promise<void> {
  const s = getStore().getState()
  const opened: string[] = []
  const skipped: string[] = []

  for (const file of files) {
    // Backups can be larger than other files: their start says what they are.
    const limit = looksLikeBackup(await file.slice(0, 2000).text())
      ? MAX_BACKUP_BYTES
      : MAX_FILE_BYTES
    if (file.size > limit) {
      skipped.push(file.name)
      continue
    }
    const text = await file.text()
    if (isProbablyBinary(text)) {
      skipped.push(file.name)
      continue
    }
    // A backup is recognised by its content, so renamed or extension-less files still work.
    if (looksLikeBackup(text)) {
      if (isEncryptedBackup(text)) {
        // This device's own backups open by themselves; others ask for the password.
        const key = await getBackupKey()
        const opened =
          key && backupSalt(text) === key.salt
            ? await decryptBackup(text, key).catch(() => null)
            : null
        if (opened === null) {
          pendingTombstones = opts.tombstoneIds
          importStore.getState().show({ fileName: file.name, encrypted: text })
          continue
        }
        await showImportPlan(file.name, opened, opts.tombstoneIds)
        continue
      }
      await showImportPlan(file.name, text, opts.tombstoneIds)
      continue
    }
    const note = fileToNote(file.name, text, Date.now(), s.settings)
    opened.push(getStore().getState().newNote(note))
  }

  if (skipped.length)
    toast(`Skipped ${skipped.join(', ')} — not a text file (or larger than 50 MB).`, {
      tone: 'warn',
    })
  if (opened.length > 1) toast(`Opened ${opened.length} files as notes.`)
}

/** Read a backup's text and show what importing it would change (or why it can't). */
async function showImportPlan(fileName: string, text: string, tombstoneIds?: Set<string>) {
  try {
    const backup = parseBackup(text)
    const tombs = tombstoneIds ?? (await tombstoneIdsFromDb())
    importStore.getState().show({
      fileName,
      plan: planImport(getStore().getState().notes, tombs, backup),
    })
  } catch (e) {
    importStore.getState().show({
      fileName,
      error: e instanceof BackupError ? e.message : 'This file could not be read.',
    })
  }
}

/**
 * Open the encrypted backup waiting in the import dialog. Returns false for a wrong password
 * (the dialog stays open to try again).
 */
export async function unlockImport(password: string): Promise<boolean> {
  const { encrypted, fileName } = importStore.getState()
  if (!encrypted) return false
  let text: string
  try {
    text = await decryptBackup(encrypted, password)
  } catch (e) {
    if (!(e instanceof BackupError)) return false
    importStore.getState().show({ fileName, error: e.message })
    return true
  }
  // Closed (or another file opened) while the password was being checked: leave it closed.
  const now = importStore.getState()
  if (!now.open || now.encrypted !== encrypted) return true
  await showImportPlan(fileName, text, pendingTombstones)
  return true
}

/** Tombstones handed to importFileList, kept for the backup waiting for its password. */
let pendingTombstones: Set<string> | undefined

/** Apply a confirmed import plan to the store; persistence writes it to IndexedDB. */
export async function applyImport(plan: ImportPlan, restoreDeleted: boolean): Promise<number> {
  const planned = [...plan.add, ...plan.update, ...(restoreDeleted ? plan.deletedRestorable : [])]
  // The dialog may have stayed open while notes were edited: never replace newer text.
  const now = getStore().getState().notes
  const incoming = planned.filter((n) => !now[n.id] || n.updatedAt > now[n.id].updatedAt)
  getStore().getState().importNotes(incoming)
  if (restoreDeleted && plan.deletedRestorable.length) {
    await getActiveDb()?.tombstones.bulkDelete(plan.deletedRestorable.map((n) => n.id))
  }
  const db = getActiveDb()
  if (db && plan.versions) {
    // Versions of a permanently deleted note come back only if the note itself does.
    const skipped = new Set(restoreDeleted ? [] : plan.deletedRestorable.map((n) => n.id))
    // A locked note's earlier versions were deleted on purpose: plain text must not return.
    const notes = getStore().getState().notes
    await importVersions(
      db,
      plan.versions.filter((v) => !skipped.has(v.noteId) && !notes[v.noteId]?.locked),
    )
  }
  return incoming.length
}

/** Open the OS file picker for import. */
export function pickFilesToImport(): void {
  const input = document.createElement('input')
  input.type = 'file'
  input.multiple = true
  input.accept = [...OPENABLE_EXTENSIONS, 'text/*', 'application/json'].join(',')
  input.onchange = () => void importFileList([...(input.files ?? [])])
  input.click()
}
