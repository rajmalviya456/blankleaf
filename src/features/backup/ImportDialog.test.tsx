import { act, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { DEFAULT_SETTINGS, newNoteDraft } from '../../domain/defaults'
import { createAppStore, initStore } from '../../store/store'
import { toastStore } from '../../ui/toast'
import { exportAll, exportNote, importFileList } from './actions'
import { buildBackup } from './backup'
import { ImportDialog } from './ImportDialog'

function setup() {
  const store = initStore(createAppStore())
  const s = () => store.getState()
  const a = s().newNote()
  s().updateContent(a, 'existing note')
  render(<ImportDialog />)
  return { s, a, user: userEvent.setup() }
}

const file = (name: string, text: string) => new File([text], name, { type: 'text/plain' })

describe('importing files', () => {
  beforeEach(() => toastStore.getState().clear())

  it('import of invalid file leaves db unchanged', async () => {
    const { s } = setup()
    const before = Object.keys(s().notes).length
    await act(() =>
      importFileList([file('broken.json', '{"app":"blankleaf","schemaVersion":1,"notes":"x"}')]),
    )
    const dialog = await screen.findByRole('dialog', { name: /import/i })
    expect(dialog).toHaveTextContent(/damaged/i)
    expect(Object.keys(s().notes)).toHaveLength(before)
  })

  it('shows a summary for a backup and applies it', async () => {
    const { s, a, user } = setup()
    const newer = {
      ...s().notes[a],
      content: 'from backup',
      updatedAt: s().notes[a].updatedAt + 1000,
    }
    const extra = { ...newNoteDraft(5, DEFAULT_SETTINGS), content: 'brand new' }
    const backup = buildBackup([newer, extra], DEFAULT_SETTINGS, 1)
    await act(() => importFileList([file('blankleaf-backup.json', JSON.stringify(backup))]))
    const dialog = await screen.findByRole('dialog', { name: /import/i })
    expect(dialog).toHaveTextContent('1 new')
    expect(dialog).toHaveTextContent('1 updated')
    await user.click(within(dialog).getByRole('button', { name: /^import$/i }))
    expect(s().notes[a].content).toBe('from backup')
    expect(s().notes[extra.id].content).toBe('brand new')
    expect(screen.queryByRole('dialog')).toBeNull()
  })

  it('only restores notes deleted here when asked', async () => {
    const { s, user } = setup()
    const gone = { ...newNoteDraft(5, DEFAULT_SETTINGS), content: 'deleted here' }
    const backup = buildBackup([gone], DEFAULT_SETTINGS, 1)
    await act(() =>
      importFileList([file('b.json', JSON.stringify(backup))], {
        tombstoneIds: new Set([gone.id]),
      }),
    )
    const dialog = await screen.findByRole('dialog', { name: /import/i })
    await user.click(within(dialog).getByRole('checkbox', { name: /also restore 1 note/i }))
    await user.click(within(dialog).getByRole('button', { name: /^import$/i }))
    expect(s().notes[gone.id]?.content).toBe('deleted here')
  })

  it('recognises a backup by its content even without a .json name', async () => {
    setup()
    const backup = buildBackup(
      [{ ...newNoteDraft(5, DEFAULT_SETTINGS), content: 'x' }],
      DEFAULT_SETTINGS,
      1,
    )
    await act(() => importFileList([file('backup-copy', JSON.stringify(backup))]))
    expect(await screen.findByRole('dialog', { name: /import/i })).toHaveTextContent('1 new')
  })

  it('plain text files become notes and open as tabs', async () => {
    const { s } = setup()
    await act(() => importFileList([file('todo.md', '# Todo'), file('run.sh', 'echo hi')]))
    const titles = s().session.openTabIds.map((id) => s().notes[id].title)
    expect(titles).toEqual(expect.arrayContaining(['todo', 'run']))
    expect(Object.values(s().notes).find((n) => n.title === 'run')?.language).toBe('shell')
  })

  it('refuses binary files with a message', async () => {
    const { s } = setup()
    const before = Object.keys(s().notes).length
    await act(() => importFileList([file('img.png', 'PNG\0\0\0')]))
    expect(Object.keys(s().notes)).toHaveLength(before)
    expect(toastStore.getState().toasts.at(-1)?.msg).toMatch(/img\.png/)
  })
})

describe('exporting', () => {
  it('exports everything and a single note as downloads', async () => {
    const { s, a } = setup()
    const created: Blob[] = []
    const names: string[] = []
    URL.createObjectURL = vi.fn((b: Blob) => {
      created.push(b)
      return 'blob:x'
    }) as typeof URL.createObjectURL
    URL.revokeObjectURL = vi.fn()
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (
      this: HTMLAnchorElement,
    ) {
      names.push(this.download)
    })
    await exportAll(Date.now(), 'plain')
    expect(names[0]).toMatch(/^blankleaf-backup-\d{4}-\d{2}-\d{2}\.json$/)
    const json = JSON.parse(await created[0].text())
    expect(json.notes.map((n: { id: string }) => n.id)).toContain(a)
    exportNote(a)
    expect(names[1]).toBe('existing note.txt')
    expect(s().notes[a]).toBeDefined()
    vi.restoreAllMocks()
  })
})
