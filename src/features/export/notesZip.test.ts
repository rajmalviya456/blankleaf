import JSZip from 'jszip'
import { describe, expect, it, vi } from 'vitest'
import { DEFAULT_SETTINGS, newNoteDraft } from '../../domain/defaults'
import type { Note } from '../../domain/types'
import { buildNotesZip, zipFileName } from './notesZip'

const NOW = Date.UTC(2026, 10, 19, 12)
const note = (patch: Partial<Note>): Note => ({
  ...newNoteDraft(NOW, DEFAULT_SETTINGS),
  ...patch,
})

async function open(blob: Blob) {
  const zip = await JSZip.loadAsync(await blob.arrayBuffer())
  const files: Record<string, string> = {}
  for (const f of Object.values(zip.files)) if (!f.dir) files[f.name] = await f.async('string')
  return { zip, files }
}

describe('download all notes as a zip', () => {
  it('saves each note as a normal file in its own format', async () => {
    const { blob, count } = await buildNotesZip([
      note({ title: 'Plan', content: '# Plan', mode: 'markdown', language: 'markdown' }),
      note({ title: 'script', content: 'print(1)', language: 'python' }),
      note({ title: 'data', content: '{"a":1}', language: 'json' }),
      note({ title: null, content: 'Groceries\nmilk' }),
    ])
    const { files } = await open(blob)
    expect(files).toEqual({
      'Plan.md': '# Plan',
      'script.py': 'print(1)',
      'data.json': '{"a":1}',
      'Groceries.txt': 'Groceries\nmilk',
    })
    expect(count).toBe(4)
  })

  it('numbers notes that would get the same file name', async () => {
    const { blob } = await buildNotesZip([
      note({ title: 'Todo', content: 'a' }),
      note({ title: 'Todo', content: 'b' }),
      note({ title: 'todo', content: 'c' }),
    ])
    const { files } = await open(blob)
    expect(Object.keys(files).sort()).toEqual(['Todo (2).txt', 'Todo.txt', 'todo (3).txt'])
  })

  it('leaves out empty notes, the trash and locked notes, and counts the locked ones', async () => {
    const { blob, count, locked } = await buildNotesZip([
      note({ title: 'kept', content: 'x' }),
      note({ title: 'empty', content: '' }),
      note({ title: 'binned', content: 'x', deletedAt: NOW }),
      note({
        title: 'secret',
        content: '',
        locked: { v: 1, salt: 's', iv: 'i', data: 'd', iterations: 1, origin: 'o' },
      }),
    ])
    const { files } = await open(blob)
    expect(Object.keys(files)).toEqual(['kept.txt'])
    expect(count).toBe(1)
    expect(locked).toBe(1)
  })

  it('keeps each note’s last edit time on its file', async () => {
    const edited = Date.UTC(2026, 0, 2, 3, 4)
    const { blob } = await buildNotesZip([note({ title: 'a', content: 'x', updatedAt: edited })])
    const { zip } = await open(blob)
    expect(zip.file('a.txt')!.date.getTime()).toBe(edited)
  })

  it('is named by date', () => {
    expect(zipFileName(NOW)).toBe('blankleaf-notes-2026-11-19.zip')
  })
})

describe('Download all notes as files', () => {
  it('the palette command downloads the zip', async () => {
    const { createAppStore, initStore } = await import('../../store/store')
    const { COMMANDS } = await import('../../commands/registry')
    const store = initStore(createAppStore())
    store.getState().updateContent(store.getState().newNote(), 'hello')
    const names: string[] = []
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (
      this: HTMLAnchorElement,
    ) {
      names.push(this.download)
    })
    URL.createObjectURL ??= () => 'blob:x'
    URL.revokeObjectURL ??= () => {}
    const cmd = COMMANDS.find((c) => c.id === 'data.zip')!
    expect(cmd.title).toBe('Download all notes as files (.zip)')
    cmd.run({ store })
    await vi.waitFor(() => expect(names[0]).toMatch(/^blankleaf-notes-\d{4}-\d\d-\d\d\.zip$/))
    click.mockRestore()
  })
})
