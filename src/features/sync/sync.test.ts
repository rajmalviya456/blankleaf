import { openDb, type NotepadzDB } from '../../db/db'
import { loadAll } from '../../db/notesRepo'
import { startPersistence, type Persistence } from '../../store/persistence'
import { createAppStore } from '../../store/store'
import { startSync, type SyncChannel } from './sync'

/** In-memory stand-in for BroadcastChannel shared by "windows" in one test. */
class Hub {
  members = new Set<StubChannel>()
}
class StubChannel implements SyncChannel {
  onmessage: ((e: MessageEvent) => void) | null = null
  private hub: Hub
  constructor(hub: Hub) {
    this.hub = hub
    hub.members.add(this)
  }
  postMessage(data: unknown) {
    for (const m of this.hub.members)
      if (m !== this) queueMicrotask(() => m.onmessage?.({ data } as MessageEvent))
  }
  close() {
    this.hub.members.delete(this)
  }
}

const cleanups: (() => void)[] = []
let name: string

beforeEach(() => {
  name = `sync-${Math.random()}`
})
afterEach(async () => {
  cleanups.splice(0).forEach((f) => f())
  const db = openDb(name)
  await db.delete()
})

function openWindow(hub: Hub, opts: { focused?: () => boolean } = {}) {
  const db: NotepadzDB = openDb(name)
  const store = createAppStore()
  const persistence: Persistence = startPersistence(store, db, {
    contentDelay: 60_000,
    sessionDelay: 60_000,
    shouldPersistSession: opts.focused,
  })
  const sync = startSync(store, db, persistence, new StubChannel(hub))
  cleanups.push(() => {
    sync.stop()
    persistence.stop()
    db.close()
  })
  return { store, s: () => store.getState(), p: persistence, db }
}

async function shareNote(hub: Hub) {
  const A = openWindow(hub)
  const B = openWindow(hub)
  const id = A.s().newNote()
  A.s().updateContent(id, 'v1')
  await A.p.flush()
  await vi.waitFor(() => expect(B.s().notes[id]?.content).toBe('v1'))
  B.s().openNote(id)
  return { A, B, id }
}

describe('sync between windows', () => {
  it('save in window A updates note in window B', async () => {
    const { A, B, id } = await shareNote(new Hub())
    A.s().updateContent(id, 'v2 from A')
    await A.p.flush()
    await vi.waitFor(() => expect(B.s().notes[id].content).toBe('v2 from A'))
    expect(B.s().notes[id].rev).toBe(A.s().notes[id].rev)
    // B must not echo the change back as its own save.
    await B.p.flush()
    expect((await loadAll(B.db)).notes.find((n) => n.id === id)?.rev).toBe(2)
  })

  it('concurrent edits produce a conflict copy and lose no text', async () => {
    const { A, B, id } = await shareNote(new Hub())
    A.s().updateContent(id, 'A wins the race')
    B.s().updateContent(id, 'B typed this too')
    await A.p.flush()
    await B.p.flush()
    await vi.waitFor(async () => {
      const notes = (await loadAll(B.db)).notes
      expect(notes.find((n) => n.id === id)?.content).toBe('A wins the race')
      const copy = notes.find((n) => n.id !== id)
      expect(copy?.content).toBe('B typed this too')
      expect(copy?.title).toBe('A wins the race (conflict copy)')
    })
    expect(B.s().notes[id].content).toBe('A wins the race')
    expect(B.s().session.openTabIds).toHaveLength(2)
    expect(B.s().session.openTabIds[0]).toBe(id)
  })

  it('remote update does not overwrite a note with pending local edits', async () => {
    const { A, B, id } = await shareNote(new Hub())
    B.s().updateContent(id, 'B is mid-typing')
    A.s().updateContent(id, 'A saved')
    await A.p.flush()
    await new Promise((r) => setTimeout(r, 20))
    expect(B.s().notes[id].content).toBe('B is mid-typing')
  })

  it('trash and delete in one window reach the other', async () => {
    const { A, B, id } = await shareNote(new Hub())
    A.s().trashNote(id)
    await A.p.flush()
    await vi.waitFor(() => expect(B.s().notes[id].deletedAt).not.toBeNull())
    expect(B.s().session.openTabIds).not.toContain(id)
    A.s().purgeNote(id)
    await A.p.flush()
    await vi.waitFor(() => expect(B.s().notes[id]).toBeUndefined())
  })

  it('settings changes reach other windows without bouncing back', async () => {
    const { A, B } = await shareNote(new Hub())
    A.s().updateSettings({ editorFontSize: 19 })
    await A.p.flush()
    await vi.waitFor(() => expect(B.s().settings.editorFontSize).toBe(19))
    const before = A.s().settings
    await B.p.flush()
    await new Promise((r) => setTimeout(r, 20))
    expect(A.s().settings).toBe(before)
  })

  it('session is not persisted from an unfocused window', async () => {
    const hub = new Hub()
    const W = openWindow(hub, { focused: () => false })
    const id = W.s().newNote()
    W.s().updateContent(id, 'x')
    await W.p.flush()
    expect((await loadAll(W.db)).session).toBeUndefined()
  })
})
