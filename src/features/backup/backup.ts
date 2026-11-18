/**
 * Whole-app backup files: build, parse (defensively — the file is untrusted input) and plan
 * how an import merges with what's already here.
 */
import { VERSIONS_KEPT } from '../../db/versionsRepo'
import { mergeSettings } from '../../domain/defaults'
import { LANGUAGES } from '../../domain/languages'
import { cleanLocked } from '../../domain/locked'
import { cleanTags } from '../../domain/tags'
import type { LanguageId, Note, Settings } from '../../domain/types'

export const BACKUP_SCHEMA_VERSION = 1
/** Backups made before the rename say "notepadz"; they import the same way. */
const BACKUP_APPS: readonly unknown[] = ['blankleaf', 'notepadz']

/** Cheap check on a file's start: is this (probably) one of our backups? */
export function looksLikeBackup(text: string): boolean {
  return /^\s*\{/.test(text) && /"app"\s*:\s*"(blankleaf|notepadz)"/.test(text.slice(0, 2000))
}

/** Importing refuses files over 50 MB, so a backup must stay safely under that. */
export const BACKUP_MAX_BYTES = 45 * 1024 * 1024

/** An earlier state of a note (see db/versionsRepo). */
export interface BackupVersion {
  noteId: string
  at: number
  content: string
}

export interface Backup {
  app: 'blankleaf'
  schemaVersion: number
  exportedAt: number
  notes: Note[]
  settings: Settings
  /** Optional, so backups stay readable by builds from before version history. */
  versions?: BackupVersion[]
}

export type BackupErrorKind = 'not-json' | 'not-blankleaf' | 'bad-schema' | 'too-new'

export class BackupError extends Error {
  readonly kind: BackupErrorKind

  constructor(kind: BackupErrorKind) {
    super(
      {
        'not-json': 'This file isn’t valid JSON.',
        'not-blankleaf': 'This file isn’t a Blankleaf backup.',
        'bad-schema': 'This backup is damaged and can’t be read.',
        'too-new': 'This backup was made by a newer version of Blankleaf.',
      }[kind],
    )
    this.kind = kind
  }
}

export function buildBackup(
  notes: Note[],
  settings: Settings,
  now: number,
  versions: BackupVersion[] = [],
): Backup {
  return {
    app: 'blankleaf',
    schemaVersion: BACKUP_SCHEMA_VERSION,
    exportedAt: now,
    notes,
    settings,
    ...(versions.length ? { versions } : {}),
  }
}

/**
 * The backup file's text. Version history is left out if including it would make the file too
 * big to import again: the notes themselves matter more.
 */
export function backupText(
  notes: Note[],
  settings: Settings,
  now: number,
  versions: BackupVersion[],
  maxBytes: number = BACKUP_MAX_BYTES,
): { text: string; withVersions: boolean } {
  const text = JSON.stringify(buildBackup(notes, settings, now, versions), null, 2)
  if (!versions.length || new Blob([text]).size <= maxBytes)
    return { text, withVersions: versions.length > 0 }
  return { text: JSON.stringify(buildBackup(notes, settings, now), null, 2), withVersions: false }
}

/** Keep valid versions of the backup's own notes, newest `VERSIONS_KEPT` per note. */
function cleanVersions(raw: unknown, notes: Note[]): BackupVersion[] {
  if (!Array.isArray(raw)) return []
  const ids = new Set(notes.map((n) => n.id))
  const perNote = new Map<string, BackupVersion[]>()
  for (const v of raw as Partial<BackupVersion>[]) {
    if (!v || typeof v !== 'object') continue
    const { noteId, at, content } = v
    if (typeof noteId !== 'string' || !ids.has(noteId)) continue
    if (typeof at !== 'number' || !Number.isFinite(at)) continue
    if (typeof content !== 'string' || !content) continue
    perNote.set(noteId, [...(perNote.get(noteId) ?? []), { noteId, at, content }])
  }
  return [...perNote.values()].flatMap((list) =>
    list.sort((a, b) => b.at - a.at).slice(0, VERSIONS_KEPT),
  )
}

function pad(n: number): string {
  return String(n).padStart(2, '0')
}

export function backupFileName(now: number): string {
  const d = new Date(now)
  return `blankleaf-backup-${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}.json`
}

const LANGUAGE_IDS = new Set<string>(['auto', ...LANGUAGES.map((l) => l.id)])
const num = (v: unknown, fallback: number) =>
  typeof v === 'number' && Number.isFinite(v) ? v : fallback

/** Coerce one untrusted record into a Note, or null if it has no usable id/content. */
function cleanNote(raw: unknown, now: number): Note | null {
  if (!raw || typeof raw !== 'object') return null
  const r = raw as Record<string, unknown>
  if (typeof r.id !== 'string' || !r.id || r.id.length > 200) return null
  if (typeof r.content !== 'string') return null
  const createdAt = num(r.createdAt, now)
  const tags = cleanTags(r.tags)
  const locked = cleanLocked(r.locked)
  return {
    id: r.id,
    title: typeof r.title === 'string' && r.title.trim() ? r.title : null,
    content: r.content,
    mode: r.mode === 'markdown' ? 'markdown' : 'plain',
    language: (typeof r.language === 'string' && LANGUAGE_IDS.has(r.language)
      ? r.language
      : 'auto') as LanguageId,
    wrap: typeof r.wrap === 'boolean' ? r.wrap : true,
    ...(r.spellcheck === true ? { spellcheck: true } : {}),
    ...(tags.length ? { tags } : {}),
    ...(locked ? { locked, content: '' } : {}),
    pinned: r.pinned === true,
    createdAt,
    updatedAt: num(r.updatedAt, createdAt),
    deletedAt: typeof r.deletedAt === 'number' ? r.deletedAt : null,
    // Revisions are per-database; an imported note starts fresh here.
    rev: 0,
  }
}

export function parseBackup(text: string, now: number = Date.now()): Backup {
  let data: unknown
  try {
    data = JSON.parse(text)
  } catch {
    throw new BackupError('not-json')
  }
  if (!data || typeof data !== 'object' || !BACKUP_APPS.includes((data as { app?: unknown }).app))
    throw new BackupError('not-blankleaf')
  const d = data as Record<string, unknown>
  if (typeof d.schemaVersion !== 'number' || !Array.isArray(d.notes))
    throw new BackupError('bad-schema')
  if (d.schemaVersion > BACKUP_SCHEMA_VERSION) throw new BackupError('too-new')
  const seen = new Set<string>()
  const notes: Note[] = []
  for (const raw of d.notes) {
    const n = cleanNote(raw, now)
    if (n && !seen.has(n.id)) {
      seen.add(n.id)
      notes.push(n)
    }
  }
  const versions = cleanVersions(d.versions, notes)
  return {
    app: 'blankleaf',
    schemaVersion: d.schemaVersion,
    exportedAt: num(d.exportedAt, now),
    notes,
    settings: mergeSettings(d.settings as Partial<Settings> | undefined),
    ...(versions.length ? { versions } : {}),
  }
}

export interface ImportPlan {
  add: Note[]
  update: Note[]
  unchanged: number
  olderSkipped: number
  /** Notes in the backup that were permanently deleted here; only restored on request. */
  deletedRestorable: Note[]
  /** Version history carried by the backup. */
  versions?: BackupVersion[]
}

export function planImport(
  existing: Record<string, Note>,
  tombstoneIds: Set<string>,
  backup: Backup,
): ImportPlan {
  const plan: ImportPlan = {
    add: [],
    update: [],
    unchanged: 0,
    olderSkipped: 0,
    deletedRestorable: [],
    ...(backup.versions ? { versions: backup.versions } : {}),
  }
  for (const n of backup.notes) {
    const current = existing[n.id]
    if (!current) {
      if (tombstoneIds.has(n.id)) plan.deletedRestorable.push(n)
      else plan.add.push(n)
    } else if (n.updatedAt > current.updatedAt) plan.update.push(n)
    else if (n.updatedAt < current.updatedAt) plan.olderSkipped++
    else plan.unchanged++
  }
  return plan
}
