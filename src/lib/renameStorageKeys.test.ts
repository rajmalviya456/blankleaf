import { beforeEach, describe, expect, it } from 'vitest'
import { DB_NAME } from '../db/db'
import { looksLikeBackup, parseBackup } from '../features/backup/backup'
import { renameStorageKeys } from './renameStorageKeys'

describe('moving from the old name (Notepadz)', () => {
  beforeEach(() => localStorage.clear())

  it('moves old localStorage keys to the new prefix', () => {
    localStorage.setItem('notepadz:unsaved:w1', '{"at":1}')
    localStorage.setItem('notepadz:seen-version', '1.2.0')
    localStorage.setItem('other-app', 'x')
    renameStorageKeys()
    expect(localStorage.getItem('blankleaf:unsaved:w1')).toBe('{"at":1}')
    expect(localStorage.getItem('blankleaf:seen-version')).toBe('1.2.0')
    expect(localStorage.getItem('notepadz:unsaved:w1')).toBeNull()
    expect(localStorage.getItem('notepadz:seen-version')).toBeNull()
    expect(localStorage.getItem('other-app')).toBe('x')
  })

  it('keeps a value already saved under the new name', () => {
    localStorage.setItem('blankleaf:seen-version', '1.3.0')
    localStorage.setItem('notepadz:seen-version', '1.2.0')
    renameStorageKeys()
    expect(localStorage.getItem('blankleaf:seen-version')).toBe('1.3.0')
    expect(localStorage.getItem('notepadz:seen-version')).toBeNull()
  })

  it('keeps the database name, so saved notes are still found', () => {
    expect(DB_NAME).toBe('notepadz')
  })

  it('imports backups made before the rename', () => {
    const old = JSON.stringify({ app: 'notepadz', schemaVersion: 1, exportedAt: 1, notes: [] })
    expect(looksLikeBackup(old)).toBe(true)
    expect(parseBackup(old).app).toBe('blankleaf')
    expect(looksLikeBackup('{"app":"something-else"}')).toBe(false)
  })
})
