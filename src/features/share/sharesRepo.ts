import type { NotepadzDB, ShareRow } from '../../db/db'

export type { ShareRow }

export async function putShare(db: NotepadzDB, row: ShareRow): Promise<void> {
  await db.shares.put(row)
}

export function getShare(db: NotepadzDB, id: string): Promise<ShareRow | undefined> {
  return db.shares.get(id)
}

/** Shares still being served: not stopped and not expired, soonest-ending first. */
export async function listActiveShares(db: NotepadzDB, now: number): Promise<ShareRow[]> {
  const rows = await db.shares.where('expiresAt').above(now).toArray()
  return rows.filter((r) => !r.stopped).sort((a, b) => a.expiresAt - b.expiresAt)
}

export async function updateShare(
  db: NotepadzDB,
  id: string,
  patch: Partial<ShareRow>,
): Promise<void> {
  await db.shares.update(id, patch)
}

export async function deleteShare(db: NotepadzDB, id: string): Promise<void> {
  await db.shares.delete(id)
}

/** Delete stopped or expired shares (with their keys). Returns the deleted ids. */
export function purgeEndedShares(db: NotepadzDB, now: number): Promise<string[]> {
  return db.transaction('rw', db.shares, async () => {
    const ended = (await db.shares.toArray())
      .filter((r) => r.stopped || r.expiresAt <= now)
      .map((r) => r.id)
    await db.shares.bulkDelete(ended)
    return ended
  })
}
