/**
 * Every note as a normal file (.md, .py, .json, ...) in one .zip, so notes can be opened by any
 * other app. Unlike the JSON backup it can't be imported back with settings and history.
 */
import type { Note } from '../../domain/types'
import { getStore } from '../../store/store'
import { toast } from '../../ui/toast'
import { downloadBlob } from '../backup/download'
import { noteExportFile } from '../backup/importFiles'

/** "Todo.txt", then "Todo (2).txt": names compared ignoring case, as Mac and Windows do. */
function uniqueName(name: string, taken: Set<string>): string {
  const dot = name.lastIndexOf('.')
  const [base, ext] = dot > 0 ? [name.slice(0, dot), name.slice(dot)] : [name, '']
  let candidate = name
  for (let n = 2; taken.has(candidate.toLowerCase()); n++) candidate = `${base} (${n})${ext}`
  taken.add(candidate.toLowerCase())
  return candidate
}

export async function buildNotesZip(
  notes: Note[],
): Promise<{ blob: Blob; count: number; locked: number }> {
  const { default: JSZip } = await import('jszip')
  const zip = new JSZip()
  const taken = new Set<string>()
  let count = 0
  let locked = 0
  for (const note of notes) {
    if (note.deletedAt !== null) continue
    if (note.locked) {
      locked++
      continue
    }
    if (!note.content) continue
    const file = noteExportFile(note)
    zip.file(uniqueName(file.name, taken), file.text, { date: new Date(note.updatedAt) })
    count++
  }
  const blob = await zip.generateAsync({ type: 'blob', compression: 'DEFLATE' })
  return { blob, count, locked }
}

const pad = (n: number) => String(n).padStart(2, '0')

export function zipFileName(now: number): string {
  const d = new Date(now)
  return `blankleaf-notes-${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}.zip`
}

/** Download every note as a file in one .zip, and say what was left out. */
export async function downloadAllAsFiles(now: number = Date.now()): Promise<void> {
  const { blob, count, locked } = await buildNotesZip(Object.values(getStore().getState().notes))
  if (!count && !locked) return void toast('There are no notes with text to download yet.')
  downloadBlob(zipFileName(now), blob)
  const lockedNote = locked
    ? ` ${locked === 1 ? 'A locked note isn’t' : `${locked} locked notes aren’t`} included: export a backup to keep ${locked === 1 ? 'it' : 'them'}, still encrypted.`
    : ''
  toast(`Downloaded ${count} ${count === 1 ? 'note' : 'notes'} as files.${lockedNote}`)
}
