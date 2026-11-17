import { useSyncExternalStore } from 'react'
import type { ShareRow } from '../../db/db'
import { getShareHost } from './shareStore'

const EMPTY: ShareRow[] = []

/** Active shares from the host, re-rendering whenever they change. */
export function useActiveShares(): ShareRow[] {
  return useSyncExternalStore(
    (cb) => getShareHost()?.subscribe(cb) ?? (() => {}),
    () => getShareHost()?.active() ?? EMPTY,
  )
}
