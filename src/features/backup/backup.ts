/**
 * Whole-app backup files: build, parse (defensively — the file is untrusted input) and plan
 * how an import merges with what's already here.
 */
import { mergeSettings } from '../../domain/defaults'
import { LANGUAGES } from '../../domain/languages'
import type { LanguageId, Note, Settings } from '../../domain/types'

export const BACKUP_SCHEMA_VERSION = 1
/** Backups made before the rename say "notepadz"; they import the same way. */
const BACKUP_APPS: readonly unknown[] = ['blankleaf', 'notepadz']

/** Cheap check on a file's start: is this (probably) one of our backups? */
export function looksLikeBackup(text: string): boolean {
  return /^\s*\{/.test(text) && /"app"\s*:\s*"(blankleaf|notepadz)"/.test(text.slice(0, 2000))
}

export interface Backup {
  app: 'blankleaf'
  schemaVersion: number
  exportedAt: number
  notes: Note[]
  settings: Settings
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

export function buildBackup(notes: Note[], settings: Settings, now: number): Backup {
  return {
    app: 'blankleaf',
    schemaVersion: BACKUP_SCHEMA_VERSION,
    exportedAt: now,
    notes,
    settings,
  }
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
  return {
    id: r.id,
    title: typeof r.title === 'string' && r.title.trim() ? r.title : null,
    content: r.content,
    mode: r.mode === 'markdown' ? 'markdown' : 'plain',
    language: (typeof r.language === 'string' && LANGUAGE_IDS.has(r.language)
      ? r.language
      : 'auto') as LanguageId,
    wrap: typeof r.wrap === 'boolean' ? r.wrap : true,
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
  return {
    app: 'blankleaf',
    schemaVersion: d.schemaVersion,
    exportedAt: num(d.exportedAt, now),
    notes,
    settings: mergeSettings(d.settings as Partial<Settings> | undefined),
  }
}

export interface ImportPlan {
  add: Note[]
  update: Note[]
  unchanged: number
  olderSkipped: number
  /** Notes in the backup that were permanently deleted here; only restored on request. */
  deletedRestorable: Note[]
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
