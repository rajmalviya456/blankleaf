import { act, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { DEFAULT_SETTINGS, newNoteDraft } from '../../domain/defaults'
import { createAppStore, initStore } from '../../store/store'
import { readAllJournals, scrubJournals, writeJournal } from '../../store/journal'
import { startMemoryJournal } from '../../store/memoryJournal'
import { importFileList } from '../backup/actions'
import { parseBackup } from '../backup/backup'
import { importStore } from '../backup/importStore'
import { cleanDiagramSvg, withoutOutsideImages } from '../editor/diagramSvg'
import { MarkdownPreview } from '../editor/MarkdownPreview'
import { noteToHtml } from '../export/noteHtml'
import { resolveConflict } from '../sync/sync'

const locked = {
  v: 1,
  salt: 'AAAA',
  iv: 'AAAA',
  data: 'AAAA',
  iterations: 1000,
  origin: 'a',
} as const
const note = (patch = {}) => ({ ...newNoteDraft(1, DEFAULT_SETTINGS), ...patch })

afterEach(() => {
  localStorage.clear()
  act(() => importStore.getState().close())
})

describe('no plain copy survives locking', () => {
  it('an edit from another window doesn’t become an unlocked copy', () => {
    const store = initStore(createAppStore())
    const id = store.getState().newNote({ content: 'secret' })
    const local = { ...store.getState().notes[id], content: 'secret and more' }
    const current = { ...local, content: '', locked, title: 'Locked note', rev: 5 }
    resolveConflict(store, local, current)
    const notes = Object.values(store.getState().notes)
    expect(notes).toHaveLength(1)
    expect(JSON.stringify(notes)).not.toContain('secret')
  })

  it('journals from earlier sessions forget the note', () => {
    const secret = note({ id: 'a', content: 'secret' })
    const other = note({ id: 'b', content: 'keep me' })
    writeJournal(
      { at: 1, notes: [secret, other], settings: DEFAULT_SETTINGS },
      'blankleaf:unsaved:w',
    )
    scrubJournals('a')
    const text = JSON.stringify(readAllJournals())
    expect(text).not.toContain('secret')
    expect(text).toContain('keep me')
  })

  it('without storage, the memory journal keeps locked notes', () => {
    const store = initStore(createAppStore())
    const id = store.getState().newNote({ title: null, content: '', locked })
    const stop = startMemoryJournal(store)
    window.dispatchEvent(new Event('pagehide'))
    stop()
    const saved = readAllJournals().flatMap((j) => j.journal.notes)
    expect(saved.map((n) => n.id)).toContain(id)
  })
})

describe('backup files', () => {
  it('skips a record whose lock is damaged, so it can’t replace a real locked note', () => {
    const b = parseBackup(
      JSON.stringify({
        app: 'blankleaf',
        schemaVersion: 1,
        notes: [
          { id: 'bad', content: '', updatedAt: 99, locked: { v: 1, data: 'broken' } },
          { id: 'good', content: 'x' },
        ],
      }),
    )
    expect(b.notes.map((n) => n.id)).toEqual(['good'])
  })

  it('reads a huge list of versions quickly', () => {
    const versions = Array.from({ length: 80_000 }, (_, i) => ({
      noteId: 'a',
      at: i,
      content: 'x',
    }))
    const text = JSON.stringify({
      app: 'blankleaf',
      schemaVersion: 1,
      notes: [{ id: 'a', content: 'x' }],
      versions,
    })
    const start = performance.now()
    expect(parseBackup(text).versions).toHaveLength(50)
    expect(performance.now() - start).toBeLessThan(2000)
  })

  it('a backup over 50 MB can still be restored; other big files are refused', async () => {
    initStore(createAppStore())
    const body = JSON.stringify({ app: 'blankleaf', schemaVersion: 1, notes: [] })
    const big = new File([body], 'backup.json')
    Object.defineProperty(big, 'size', { value: 60 * 1024 * 1024 })
    await importFileList([big], { tombstoneIds: new Set() })
    expect(importStore.getState().open).toBe(true)
    expect(importStore.getState().error).toBeNull()
  })
})

describe('notes can’t contact other sites', () => {
  it('drawings lose outside addresses and keep their own references', () => {
    const svg = cleanDiagramSvg(
      `<svg xmlns="http://www.w3.org/2000/svg"><style>@import "https://evil.test/a.css"; .a{fill:url(https://evil.test/x)} .b{background:u\\72l(https://evil.test/y)} .c{fill:url(#ok)}</style><image href="https://evil.test/z"/><rect fill="url(#ok)"/><text>Label</text></svg>`,
    )
    expect(svg).not.toContain('evil.test')
    expect(svg).toContain('url(#ok)')
    expect(svg).toContain('Label')
  })

  it('image shapes are removed before a diagram is drawn', () => {
    expect(withoutOutsideImages('A@{ img: "https://evil.test/c.png", label: "Start" } --> B')).toBe(
      'A@{ label: "Start" } --> B',
    )
    expect(withoutOutsideImages('A["img: keep this text"] --> B')).toBe(
      'A["img: keep this text"] --> B',
    )
  })

  it('a shared note’s images aren’t loaded, and show as a link instead', () => {
    const { container } = render(
      <MarkdownPreview source={'![cat](https://evil.test/c.png)'} remoteImages={false} />,
    )
    expect(container.querySelector('img')).toBeNull()
    expect(screen.getByRole('link', { name: /cat/ })).toHaveAttribute(
      'href',
      'https://evil.test/c.png',
    )
  })

  it('your own notes still show images', () => {
    const { container } = render(<MarkdownPreview source={'![cat](https://example.com/c.png)'} />)
    expect(container.querySelector('img')).not.toBeNull()
  })

  it('exported pages load nothing from outside', async () => {
    const html = await noteToHtml(
      note({ mode: 'markdown', content: '![x](https://evil.test/a.png)' }),
    )
    expect(html).not.toMatch(/<img[^>]+evil\.test/)
    const csp = /http-equiv="Content-Security-Policy" content="([^"]+)"/.exec(html)![1]
    expect(csp).toContain("default-src 'none'")
    expect(csp).toContain('img-src data:')
  })
})
