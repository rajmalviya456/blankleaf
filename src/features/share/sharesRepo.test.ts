import { openDb, type BlankleafDB } from '../../db/db'
import {
  deleteShare,
  getShare,
  listActiveShares,
  purgeEndedShares,
  putShare,
  updateShare,
  type ShareRow,
} from './sharesRepo'

let db: BlankleafDB
beforeEach(() => {
  db = openDb(`shares-${Math.random()}`)
})
afterEach(async () => {
  db.close()
  await db.delete()
})

const row = (patch: Partial<ShareRow> = {}): ShareRow => ({
  id: crypto.randomUUID(),
  noteId: 'n1',
  title: 't',
  keyB64: 'k',
  exp: 2,
  peerId: 'npz-x',
  readTokenHash: 'h',
  password: null,
  iv: 'aXY',
  ciphertext: 'Y3Q',
  createdAt: 1,
  expiresAt: 1000,
  opens: 0,
  lastOpenedAt: null,
  failures: 0,
  coolDownUntil: 0,
  coolDownMs: 30_000,
  stopped: false,
  ...patch,
})

describe('shares repo', () => {
  it('stores and updates a share', async () => {
    const r = row()
    await putShare(db, r)
    await updateShare(db, r.id, { opens: 2 })
    expect((await getShare(db, r.id))?.opens).toBe(2)
    expect((await getShare(db, r.id))?.ciphertext).toBe('Y3Q')
    await deleteShare(db, r.id)
    expect(await getShare(db, r.id)).toBeUndefined()
  })

  it('listActiveShares orders by expiry and hides stopped/expired', async () => {
    const late = row({ expiresAt: 900 })
    const soon = row({ expiresAt: 600 })
    await Promise.all(
      [late, soon, row({ expiresAt: 400 }), row({ stopped: true })].map((r) => putShare(db, r)),
    )
    expect((await listActiveShares(db, 500)).map((r) => r.id)).toEqual([soon.id, late.id])
  })

  it('purgeEndedShares removes stopped and expired rows only', async () => {
    const live = row({ expiresAt: 900 })
    const expired = row({ expiresAt: 400 })
    const stopped = row({ stopped: true })
    await Promise.all([live, expired, stopped].map((r) => putShare(db, r)))
    expect((await purgeEndedShares(db, 500)).sort()).toEqual([expired.id, stopped.id].sort())
    expect(await db.shares.count()).toBe(1)
  })
})
