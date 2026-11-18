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
import { downloadText } from './download'
import { fileToNote, isProbablyBinary, noteExportFile } from './importFiles'
import { importStore } from './importStore'
import { markBackedUp } from './meta'

const MAX_FILE_BYTES = 50 * 1024 * 1024

export async function exportAll(now: number = Date.now()): Promise<void> {
  const s = getStore().getState()
  const notes = Object.values(s.notes)
  const { versions, complete } = await versionsForBackup(notes.map((n) => n.id))
  const { text, withVersions } = backupText(notes, s.settings, now, versions)
  downloadText(backupFileName(now), 'application/json', text)
  await markBackedUp(now)
  if (complete && (withVersions || !versions.length))
    toast(`Backup saved (${notes.length} notes). Keep it somewhere safe.`)
  else toast(`Backup saved (${notes.length} notes), without version history.`, { tone: 'warn' })
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
    if (file.size > MAX_FILE_BYTES) {
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
      try {
        const backup = parseBackup(text)
        const tombs = opts.tombstoneIds ?? (await tombstoneIdsFromDb())
        importStore.getState().show({
          fileName: file.name,
          plan: planImport(getStore().getState().notes, tombs, backup),
        })
      } catch (e) {
        importStore.getState().show({
          fileName: file.name,
          error: e instanceof BackupError ? e.message : 'This file could not be read.',
        })
      }
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

/** Apply a confirmed import plan to the store; persistence writes it to IndexedDB. */
export async function applyImport(plan: ImportPlan, restoreDeleted: boolean): Promise<number> {
  const incoming = [...plan.add, ...plan.update, ...(restoreDeleted ? plan.deletedRestorable : [])]
  getStore().getState().importNotes(incoming)
  if (restoreDeleted && plan.deletedRestorable.length) {
    await getActiveDb()?.tombstones.bulkDelete(plan.deletedRestorable.map((n) => n.id))
  }
  const db = getActiveDb()
  if (db && plan.versions) {
    // Versions of a permanently deleted note come back only if the note itself does.
    const skipped = new Set(restoreDeleted ? [] : plan.deletedRestorable.map((n) => n.id))
    await importVersions(
      db,
      plan.versions.filter((v) => !skipped.has(v.noteId)),
    )
  }
  return incoming.length
}

/** Open the OS file picker for import. */
export function pickFilesToImport(): void {
  const input = document.createElement('input')
  input.type = 'file'
  input.multiple = true
  input.accept = '.json,.txt,.md,.markdown,.log,text/*,application/json'
  input.onchange = () => void importFileList([...(input.files ?? [])])
  input.click()
}
