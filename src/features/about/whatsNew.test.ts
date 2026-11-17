import { describe, expect, it } from 'vitest'
import { releaseNotes, seenVersionCheck } from './whatsNew'

const CHANGELOG = `# Changelog

## [1.1.0](https://x/compare/v1.0.0...v1.1.0) (2026-12-01)

### Features

* **toolbar:** add tables

## [1.0.0](https://x) (2026-11-17)

First public release.
`

function memoryStorage(): Pick<Storage, 'getItem' | 'setItem'> {
  const m = new Map<string, string>()
  return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => void m.set(k, v) }
}

describe('releaseNotes', () => {
  it('drops the file title and keeps every release, newest first', () => {
    const notes = releaseNotes(CHANGELOG)
    expect(notes.startsWith('## [1.1.0]')).toBe(true)
    expect(notes).toContain('## [1.0.0]')
    expect(notes).not.toContain('# Changelog')
  })
})

describe('seenVersionCheck', () => {
  it('says nothing on the very first visit, but remembers the version', () => {
    const store = memoryStorage()
    expect(seenVersionCheck('1.0.0', store)).toBeNull()
    expect(seenVersionCheck('1.0.0', store)).toBeNull()
  })

  it('reports an update once, after the version changes', () => {
    const store = memoryStorage()
    seenVersionCheck('1.0.0', store)
    expect(seenVersionCheck('1.1.0', store)).toEqual({ from: '1.0.0', to: '1.1.0' })
    expect(seenVersionCheck('1.1.0', store)).toBeNull()
  })

  it('stays quiet when storage is unavailable', () => {
    const broken = {
      getItem: () => {
        throw new Error('blocked')
      },
      setItem: () => {
        throw new Error('blocked')
      },
    }
    expect(seenVersionCheck('1.0.0', broken)).toBeNull()
  })
})
