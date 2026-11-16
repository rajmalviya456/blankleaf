/** Result of navigator.storage.persist(), shown in Settings → Data. */
export type PersistentStorageStatus = boolean | 'unsupported' | 'pending'

let status: PersistentStorageStatus = 'pending'

export function setPersistentStorageStatus(s: PersistentStorageStatus): void {
  status = s
}

export function getPersistentStorageStatus(): PersistentStorageStatus {
  return status
}
