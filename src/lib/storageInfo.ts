export interface StorageInfo {
  usage: number | null
  quota: number | null
  persisted: boolean | 'unsupported'
}

/** How much this site stores and whether the browser promised not to evict it. */
export async function getStorageInfo(nav: Navigator = navigator): Promise<StorageInfo> {
  const storage = nav.storage
  if (!storage) return { usage: null, quota: null, persisted: 'unsupported' }
  let usage: number | null = null
  let quota: number | null = null
  try {
    const est = await storage.estimate?.()
    usage = est?.usage ?? null
    quota = est?.quota ?? null
  } catch {
    // keep nulls
  }
  let persisted: StorageInfo['persisted'] = 'unsupported'
  try {
    if (storage.persisted) persisted = await storage.persisted()
  } catch {
    persisted = false
  }
  return { usage, quota, persisted }
}

export function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`
  const units = ['KB', 'MB', 'GB']
  let v = n / 1024
  let i = 0
  while (v >= 1024 && i < units.length - 1) {
    v /= 1024
    i++
  }
  return `${v.toFixed(1)} ${units[i]}`
}
