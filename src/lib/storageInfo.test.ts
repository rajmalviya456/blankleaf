import { formatBytes, getStorageInfo } from './storageInfo'

describe('getStorageInfo', () => {
  it('getStorageInfo handles missing navigator.storage', async () => {
    expect(await getStorageInfo({} as Navigator)).toEqual({
      usage: null,
      quota: null,
      persisted: 'unsupported',
    })
  })

  it('reports usage, quota and persistence', async () => {
    const nav = {
      storage: {
        estimate: async () => ({ usage: 2048, quota: 1_000_000 }),
        persisted: async () => true,
      },
    } as unknown as Navigator
    expect(await getStorageInfo(nav)).toEqual({ usage: 2048, quota: 1_000_000, persisted: true })
  })

  it('survives a throwing estimate()', async () => {
    const nav = {
      storage: {
        estimate: async () => {
          throw new Error('no')
        },
        persisted: async () => false,
      },
    } as unknown as Navigator
    expect(await getStorageInfo(nav)).toEqual({ usage: null, quota: null, persisted: false })
  })
})

describe('formatBytes', () => {
  it('formats human-readable sizes', () => {
    expect(formatBytes(0)).toBe('0 B')
    expect(formatBytes(2048)).toBe('2.0 KB')
    expect(formatBytes(5_500_000)).toBe('5.2 MB')
  })
})
