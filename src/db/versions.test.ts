import { DEFAULT_SETTINGS, newNoteDraft } from '../domain/defaults'
import type { Note } from '../domain/types'
import { openDb, type BlankleafDB } from './db'
import { hardDeleteNote, purgeExpiredTrash, purgeNote, saveNote } from './notesRepo'
import { listVersions, saveVersion, SNAPSHOT_EVERY_MS, VERSIONS_KEPT } from './versionsRepo'

const MIN = 60_000
let db: BlankleafDB
beforeEach(() => {
  db = openDb(`versions-${Math.random()}`)
})
afterEach(async () => {
  db.close()
  await db.delete()
})

const note = (patch: Partial<Note> = {}): Note => ({
  ...newNoteDraft(1000, DEFAULT_SETTINGS),
  content: 'v1',
  updatedAt: 1000,
  ...patch,
})

/** Save successive contents of one note at the given times. */
async function edits(n: Note, steps: [content: string, at: number][]) {
  let rev = 0
  for (const [content, at] of steps) {
    const r = await saveNote(db, { ...n, content, updatedAt: at }, rev)
    if (!r.ok) throw new Error('conflict')
    rev = r.rev
  }
}

describe('version snapshots', () => {
  it('keeps a first version, then at most one every 5 minutes while the text changes', async () => {
    expect(SNAPSHOT_EVERY_MS).toBe(5 * MIN)
    const n = note()
    await edits(n, [
      ['v1', 0],
      ['v2', 1 * MIN], // too soon
      ['v3', 5 * MIN], // due
      ['v3', 11 * MIN], // unchanged: no new version
      ['v4', 12 * MIN], // due (5+ min since the last version)
    ])
    const v = await listVersions(db, n.id)
    expect(v.map((x) => x.content)).toEqual(['v4', 'v3', 'v1']) // newest first
    expect(v.map((x) => x.at)).toEqual([12 * MIN, 5 * MIN, 0])
  })

  it('skips empty notes', async () => {
    const n = note({ content: '' })
    await edits(n, [['', 0]])
    expect(await listVersions(db, n.id)).toEqual([])
  })

  it(`keeps only the newest ${VERSIONS_KEPT} versions per note`, async () => {
    const n = note()
    await edits(
      n,
      Array.from({ length: VERSIONS_KEPT + 5 }, (_, i) => [`v${i}`, i * SNAPSHOT_EVERY_MS]),
    )
    const v = await listVersions(db, n.id)
    expect(v).toHaveLength(VERSIONS_KEPT)
    expect(v[0].content).toBe(`v${VERSIONS_KEPT + 4}`)
  })

  it('a forced version is saved even if one was just made', async () => {
    const n = note()
    await edits(n, [['v1', 0]])
    await saveVersion(db, n.id, 'v1 edited', 1000, { force: true })
    expect((await listVersions(db, n.id)).map((x) => x.content)).toEqual(['v1 edited', 'v1'])
  })

  it('deleting a note for good deletes its versions', async () => {
    const a = note()
    const b = note()
    const c = note({ deletedAt: 0 })
    await edits(a, [['a', 0]])
    await edits(b, [['b', 0]])
    await edits(c, [['c', 0]])
    await hardDeleteNote(db, a.id)
    await purgeNote(db, b.id, 1)
    await purgeExpiredTrash(db, 400 * 86_400_000)
    expect(await db.versions.count()).toBe(0)
  })
})
