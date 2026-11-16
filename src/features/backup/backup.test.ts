import { DEFAULT_SETTINGS, newNoteDraft } from '../../domain/defaults'
import type { Note } from '../../domain/types'
import { backupFileName, buildBackup, parseBackup, planImport } from './backup'

let n = 0
const note = (patch: Partial<Note> = {}): Note => ({
  ...newNoteDraft(1000 + n++, DEFAULT_SETTINGS),
  content: 'x',
  ...patch,
})

describe('backup round-trip', () => {
  it('buildBackup → JSON → parseBackup round-trips equal', () => {
    const notes = [note({ title: 'A', language: 'python' }), note({ deletedAt: 5 })]
    const b = buildBackup(notes, DEFAULT_SETTINGS, 99)
    expect(b).toMatchObject({ app: 'notepadz', schemaVersion: 1, exportedAt: 99 })
    expect(parseBackup(JSON.stringify(b))).toEqual(b)
  })

  it('names the file by local date', () => {
    expect(backupFileName(new Date(2026, 10, 16, 23, 30).getTime())).toBe(
      'notepadz-backup-2026-11-16.json',
    )
  })
})

describe('parseBackup', () => {
  it('parseBackup rejects foreign json', () => {
    expect(() => parseBackup('abc')).toThrow(expect.objectContaining({ kind: 'not-json' }))
    expect(() => parseBackup('{"foo":1}')).toThrow(
      expect.objectContaining({ kind: 'not-notepadz' }),
    )
    expect(() => parseBackup('{"app":"notepadz","schemaVersion":1,"notes":"nope"}')).toThrow(
      expect.objectContaining({ kind: 'bad-schema' }),
    )
  })

  it('rejects backups from a newer app version', () => {
    expect(() => parseBackup('{"app":"notepadz","schemaVersion":99,"notes":[]}')).toThrow(
      expect.objectContaining({ kind: 'too-new' }),
    )
  })

  it('cleans up untrusted note fields', () => {
    const raw = {
      app: 'notepadz',
      schemaVersion: 1,
      exportedAt: 1,
      settings: { tabSize: 4, accent: 'red;}' },
      notes: [
        {
          id: 'a',
          content: 'hi',
          title: 5,
          mode: 'evil',
          language: 'cobol',
          pinned: 'yes',
          createdAt: 1,
          updatedAt: 2,
          deletedAt: null,
          rev: 3,
          extra: 1,
        },
        { id: 7, content: 'bad id' },
        { id: 'b', content: null },
      ],
    }
    const b = parseBackup(JSON.stringify(raw))
    expect(b.notes).toHaveLength(1)
    expect(b.notes[0]).toEqual({
      id: 'a',
      title: null,
      content: 'hi',
      mode: 'plain',
      language: 'auto',
      wrap: true,
      pinned: false,
      createdAt: 1,
      updatedAt: 2,
      deletedAt: null,
      rev: 0,
    })
    expect(b.settings.tabSize).toBe(4)
  })
})

describe('planImport', () => {
  it('newer updatedAt → update, older → olderSkipped, equal → unchanged, unknown id → add', () => {
    const base = note({ updatedAt: 100 })
    const older = note({ updatedAt: 100 })
    const same = note({ updatedAt: 100 })
    const existing = { [base.id]: base, [older.id]: older, [same.id]: same }
    const fresh = note()
    const backup = buildBackup(
      [{ ...base, content: 'new', updatedAt: 200 }, { ...older, updatedAt: 50 }, same, fresh],
      DEFAULT_SETTINGS,
      1,
    )
    const plan = planImport(existing, new Set(), backup)
    expect(plan.update.map((x) => x.id)).toEqual([base.id])
    expect(plan.olderSkipped).toBe(1)
    expect(plan.unchanged).toBe(1)
    expect(plan.add.map((x) => x.id)).toEqual([fresh.id])
    expect(plan.deletedRestorable).toEqual([])
  })

  it('planImport: tombstoned ids go to deletedRestorable, not add', () => {
    const gone = note()
    const plan = planImport({}, new Set([gone.id]), buildBackup([gone], DEFAULT_SETTINGS, 1))
    expect(plan.add).toEqual([])
    expect(plan.deletedRestorable.map((x) => x.id)).toEqual([gone.id])
  })
})
