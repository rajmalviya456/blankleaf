import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { openDb, type BlankleafDB } from '../../db/db'
import { listVersions, saveVersion, VERSIONS_KEPT } from '../../db/versionsRepo'
import { DEFAULT_SETTINGS, newNoteDraft } from '../../domain/defaults'
import { registerStorage } from '../../store/dataReset'
import { createAppStore, initStore } from '../../store/store'
import { toastStore } from '../../ui/toast'
import { applyImport, exportAll } from './actions'
import { backupText, buildBackup, parseBackup, planImport } from './backup'
import * as download from './download'

let db: BlankleafDB
beforeEach(() => {
  db = openDb(`backup-versions-${Math.random()}`)
  registerStorage(db, null)
})
afterEach(async () => {
  vi.restoreAllMocks()
  registerStorage(null, null)
  db.close()
  await db.delete()
})

const note = (id: string) => ({ ...newNoteDraft(1, DEFAULT_SETTINGS, id), content: 'now' })
const v = (noteId: string, at: number, content = `v${at}`) => ({ noteId, at, content })

describe('version history in backups', () => {
  it('a full backup includes every note’s versions', async () => {
    const store = initStore(createAppStore())
    const id = store.getState().newNote({ content: 'now' })
    await saveVersion(db, id, 'earlier', 100)
    const save = vi.spyOn(download, 'downloadText').mockImplementation(() => {})
    await exportAll(1000, 'plain')
    const backup = parseBackup(save.mock.calls[0][2])
    expect(backup.versions).toEqual([{ noteId: id, at: 100, content: 'earlier' }])
  })

  it('stays readable by older versions of the app', () => {
    const b = buildBackup([note('a')], DEFAULT_SETTINGS, 1, [v('a', 5)])
    expect(b.schemaVersion).toBe(1)
    expect(buildBackup([note('a')], DEFAULT_SETTINGS, 1)).not.toHaveProperty('versions')
  })

  it('reads old backups that have no versions', () => {
    const text = JSON.stringify(buildBackup([note('a')], DEFAULT_SETTINGS, 1))
    expect(parseBackup(text).versions).toBeUndefined()
  })

  it('ignores damaged entries, unknown notes and more versions than are kept', () => {
    const many = Array.from({ length: VERSIONS_KEPT + 3 }, (_, i) => v('a', i))
    const text = JSON.stringify({
      ...buildBackup([note('a')], DEFAULT_SETTINGS, 1),
      versions: [...many, v('ghost', 1), { noteId: 'a', at: 'x', content: 'y' }, 7, null],
    })
    const got = parseBackup(text).versions!
    expect(got).toHaveLength(VERSIONS_KEPT)
    expect(got.every((x) => x.noteId === 'a')).toBe(true)
    expect(Math.min(...got.map((x) => x.at))).toBe(3) // the newest are kept
  })

  it('importing restores versions and doesn’t duplicate ones already here', async () => {
    initStore(createAppStore())
    await saveVersion(db, 'a', 'v5', 5)
    const backup = parseBackup(
      JSON.stringify(buildBackup([note('a')], DEFAULT_SETTINGS, 1, [v('a', 5), v('a', 9)])),
    )
    await applyImport(planImport({}, new Set(), backup), false)
    expect((await listVersions(db, 'a')).map((x) => x.at)).toEqual([9, 5])
  })

  it('doesn’t restore versions of a deleted note that isn’t being restored', async () => {
    initStore(createAppStore())
    const backup = parseBackup(
      JSON.stringify(buildBackup([note('a')], DEFAULT_SETTINGS, 1, [v('a', 5)])),
    )
    await applyImport(planImport({}, new Set(['a']), backup), false)
    expect(await listVersions(db, 'a')).toEqual([])
  })

  it('leaves versions out rather than make a backup too big to import', () => {
    const big = backupText([note('a')], DEFAULT_SETTINGS, 1, [v('a', 5, 'x'.repeat(500))], 300)
    expect(big.withVersions).toBe(false)
    expect(parseBackup(big.text).versions).toBeUndefined()
    const small = backupText([note('a')], DEFAULT_SETTINGS, 1, [v('a', 5)], 100_000)
    expect(small.withVersions).toBe(true)
  })

  it('still saves the backup if versions can’t be read', async () => {
    const store = initStore(createAppStore())
    store.getState().newNote({ content: 'now' })
    vi.spyOn(db.versions, 'toArray').mockRejectedValue(new Error('nope'))
    const save = vi.spyOn(download, 'downloadText').mockImplementation(() => {})
    await exportAll(1000, 'plain')
    expect(save).toHaveBeenCalledOnce()
    expect(toastStore.getState().toasts.at(-1)?.msg).toMatch(/without version history/)
  })
})

describe('applying an import later', () => {
  it('never replaces text typed after the import was planned', async () => {
    let t = 1000
    const store = initStore(createAppStore(undefined, () => ++t))
    const id = store.getState().newNote({ content: 'old' })
    const backupCopy = { ...store.getState().notes[id], content: 'from backup', updatedAt: 5000 }
    const plan = planImport(store.getState().notes, new Set(), {
      schemaVersion: 1,
      exportedAt: 5000,
      notes: [backupCopy],
      settings: DEFAULT_SETTINGS,
    } as never)
    expect(plan.update).toHaveLength(1)
    t = 9000
    store.getState().updateContent(id, 'typed while the dialog was open')
    await applyImport(plan, false)
    expect(store.getState().notes[id].content).toBe('typed while the dialog was open')
  })
})

describe('importing a locked copy of a note', () => {
  it('removes the readable versions this browser kept of it', async () => {
    const store = initStore(createAppStore())
    const id = store.getState().newNote({ content: 'secret plans' })
    await saveVersion(db, id, 'secret plans', 100)
    const lockedCopy = {
      ...store.getState().notes[id],
      content: '',
      updatedAt: Date.now() + 60_000,
      locked: { v: 1, salt: 's', iv: 'i', data: 'd', iterations: 1, origin: id },
    }
    const plan = planImport(store.getState().notes, new Set(), {
      schemaVersion: 1,
      exportedAt: lockedCopy.updatedAt,
      notes: [lockedCopy],
      settings: DEFAULT_SETTINGS,
    } as never)
    await applyImport(plan, false)
    expect(store.getState().notes[id].locked).toBeTruthy()
    expect(await listVersions(db, id)).toEqual([])
  })
})
