import { act, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { openDb, type BlankleafDB } from '../../db/db'
import { WELCOME_CONTENT } from '../../domain/defaults'
import { registerStorage } from '../../store/dataReset'
import { createAppStore, initStore } from '../../store/store'
import { toastStore } from '../../ui/toast'
import { parseBackup } from './backup'
import { FolderBackupRow } from './FolderBackupRow'
import {
  backupToFolderNow,
  chooseBackupFolder,
  DAILY_COPIES,
  folderBackupStore,
  FOLDER_CHANNEL,
  LATEST_FILE,
  PREVIOUS_FILE,
  resumeFolderBackup,
  startFolderBackup,
  turnOffFolderBackup,
  type BackupFolder,
  type FolderMemory,
} from './folderBackup'

function fakeFolder(permission: 'granted' | 'prompt' = 'granted') {
  const files = new Map<string, string>()
  const folder = {
    name: 'Backups',
    permission: permission as string,
    failWith: null as Error | null,
    files,
    queryPermission: vi.fn(async () => folder.permission),
    requestPermission: vi.fn(async () => (folder.permission = 'granted')),
    getFileHandle: vi.fn(async (name: string, o?: { create?: boolean }) => {
      if (!o?.create && !files.has(name)) throw new DOMException('missing', 'NotFoundError')
      return {
        getFile: async () => new File([files.get(name) ?? ''], name),
        createWritable: async () => {
          if (folder.failWith) throw folder.failWith
          let body = ''
          return {
            write: async (t: string) => void (body = t),
            close: async () => void files.set(name, body),
          }
        },
      }
    }),
    removeEntry: vi.fn(async (name: string) => void files.delete(name)),
    keys: async function* () {
      yield* files.keys()
    },
  }
  return folder
}

let db: BlankleafDB
let stop: (() => void) | undefined
let remembered: BackupFolder | null
const mem: FolderMemory = {
  load: async () => remembered,
  save: async (f) => void (remembered = f),
}
const setPicker = (fn?: unknown) =>
  Object.defineProperty(window, 'showDirectoryPicker', {
    configurable: true,
    writable: true,
    value: fn,
  })

beforeEach(() => {
  db = openDb(`folder-${Math.random()}`)
  registerStorage(db, null)
  remembered = null
})
afterEach(async () => {
  stop?.()
  setPicker(undefined)
  act(() => toastStore.setState({ toasts: [] }))
  registerStorage(null, null)
  db.close()
  await db.delete()
})

async function setup(folder = fakeFolder()) {
  setPicker(vi.fn(async () => folder))
  const store = initStore(createAppStore())
  store.getState().newNote({ content: 'my important note' })
  stop = await startFolderBackup(store, db, mem)
  return { store, s: () => store.getState(), folder }
}

describe('automatic backup to a folder', () => {
  it('saves a restorable backup as soon as a folder is chosen', async () => {
    const { folder } = await setup()
    await chooseBackupFolder()
    expect(folderBackupStore.getState()).toMatchObject({ status: 'on', folderName: 'Backups' })
    const saved = parseBackup(folder.files.get(LATEST_FILE)!)
    expect(saved.notes.map((n) => n.content)).toContain('my important note')
    expect(
      [...folder.files.keys()].some((n) => /^blankleaf-auto-\d{4}-\d\d-\d\d\.json$/.test(n)),
    ).toBe(true)
  })

  it('saves again shortly after a note changes', async () => {
    const folder = fakeFolder()
    setPicker(vi.fn(async () => folder))
    const store = initStore(createAppStore())
    store.getState().newNote({ content: 'first' })
    stop = await startFolderBackup(store, db, mem, 20)
    await chooseBackupFolder()
    store.getState().newNote({ content: 'written later' })
    expect(folder.files.get(LATEST_FILE)).not.toContain('written later')
    await waitFor(() => expect(folder.files.get(LATEST_FILE)).toContain('written later'))
  })

  it(`keeps only the newest ${DAILY_COPIES} automatic copies, and leaves your own files alone`, async () => {
    const { folder } = await setup()
    for (let d = 1; d <= DAILY_COPIES + 3; d++)
      folder.files.set(`blankleaf-auto-2026-01-${String(d).padStart(2, '0')}.json`, '{}')
    folder.files.set('blankleaf-backup-2026-01-01.json', 'exported by hand')
    folder.files.set('my-own-file.txt', 'not ours')
    await chooseBackupFolder()
    const daily = [...folder.files.keys()].filter((n) => n.startsWith('blankleaf-auto-'))
    expect(daily).toHaveLength(DAILY_COPIES)
    expect(folder.files.has('blankleaf-auto-2026-01-01.json')).toBe(false)
    expect(folder.files.get('blankleaf-backup-2026-01-01.json')).toBe('exported by hand')
    expect(folder.files.get('my-own-file.txt')).toBe('not ours')
  })

  it('a fresh browser showing only the Welcome note can’t overwrite an old backup', async () => {
    const folder = fakeFolder()
    folder.files.set(LATEST_FILE, 'the good backup')
    setPicker(vi.fn(async () => folder))
    const store = initStore(createAppStore())
    store.getState().newNote({ title: 'Welcome', content: WELCOME_CONTENT })
    stop = await startFolderBackup(store, db, mem)
    await chooseBackupFolder()
    expect(folder.files.get(LATEST_FILE)).toBe('the good backup')
    const offer = toastStore.getState().toasts.at(-1)!
    expect(offer.msg).toMatch(/already has a backup/)
    expect(offer.action?.label).toBe('Restore')
  })

  it('keeps the folder’s old backup when real notes take over', async () => {
    const { folder } = await setup()
    folder.files.set(LATEST_FILE, 'the older backup')
    await chooseBackupFolder()
    expect(folder.files.get(PREVIOUS_FILE)).toBe('the older backup')
    expect(folder.files.get(LATEST_FILE)).toContain('my important note')
  })

  it('never replaces a good backup with an empty app', async () => {
    const folder = fakeFolder()
    folder.files.set(LATEST_FILE, 'the good backup')
    setPicker(vi.fn(async () => folder))
    initStore(createAppStore())
    stop = await startFolderBackup(initStore(createAppStore()), db, mem)
    await chooseBackupFolder()
    expect(folder.files.get(LATEST_FILE)).toBe('the good backup')
  })

  it('never writes a locked note’s text', async () => {
    const { s, folder } = await setup()
    const locked = {
      v: 1,
      salt: 'AA==',
      iv: 'AA==',
      data: 'AA==',
      iterations: 1000,
      origin: 'x',
    } as const
    s().newNote({ title: 'Locked note', content: '', locked })
    await chooseBackupFolder()
    expect(parseBackup(folder.files.get(LATEST_FILE)!).notes.find((n) => n.locked)?.locked).toEqual(
      locked,
    )
  })

  it('remembers the folder after a restart', async () => {
    const folder = fakeFolder()
    remembered = folder as unknown as BackupFolder
    await setup(folder)
    expect(folderBackupStore.getState()).toMatchObject({ status: 'on', folderName: 'Backups' })
  })

  it('asks again after a restart when the browser needs permission', async () => {
    const folder = fakeFolder('prompt')
    remembered = folder as unknown as BackupFolder
    await setup(folder)
    expect(folderBackupStore.getState().status).toBe('paused')
    expect(toastStore.getState().toasts.at(-1)?.action?.label).toBe('Resume')
    await resumeFolderBackup()
    expect(folderBackupStore.getState().status).toBe('on')
    expect(folder.files.has(LATEST_FILE)).toBe(true)
  })

  it('pauses and says so if the folder disappears', async () => {
    const { folder } = await setup()
    await chooseBackupFolder()
    folder.failWith = new DOMException('gone', 'NotFoundError')
    await backupToFolderNow()
    expect(folderBackupStore.getState().status).toBe('paused')
    expect(toastStore.getState().toasts.at(-1)?.msg).toMatch(/moved or deleted/)
  })

  it('choosing again after the folder disappears opens the picker', async () => {
    const { folder } = await setup()
    await chooseBackupFolder()
    folder.failWith = new DOMException('gone', 'NotFoundError')
    await backupToFolderNow()
    const replacement = fakeFolder()
    const pick = vi.fn(async () => replacement)
    setPicker(pick)
    await resumeFolderBackup()
    expect(pick).toHaveBeenCalledOnce()
    expect(folderBackupStore.getState().status).toBe('on')
    expect(replacement.files.has(LATEST_FILE)).toBe(true)
  })

  it('tries again by itself after a failed save', async () => {
    const folder = fakeFolder()
    setPicker(vi.fn(async () => folder))
    const store = initStore(createAppStore())
    store.getState().newNote({ content: 'keep me' })
    stop = await startFolderBackup(store, db, mem, 20)
    await chooseBackupFolder()
    folder.failWith = new Error('disk busy')
    folder.files.clear()
    await backupToFolderNow()
    folder.failWith = null
    await waitFor(() => expect(folder.files.has(LATEST_FILE)).toBe(true))
  })

  it('turning it off in one window stops the others', async () => {
    const { folder } = await setup()
    await chooseBackupFolder()
    remembered = null
    act(() => {
      new BroadcastChannel(FOLDER_CHANNEL).postMessage('changed')
    })
    await waitFor(() => expect(folderBackupStore.getState().status).toBe('off'))
    folder.files.clear()
    await backupToFolderNow()
    expect(folder.files.size).toBe(0)
  })

  it('closing the folder picker changes nothing', async () => {
    await setup()
    setPicker(vi.fn().mockRejectedValue(new DOMException('closed', 'AbortError')))
    await chooseBackupFolder()
    expect(folderBackupStore.getState().status).toBe('off')
  })

  it('can be turned off, and forgets the folder', async () => {
    await setup()
    await chooseBackupFolder()
    await turnOffFolderBackup()
    expect(folderBackupStore.getState().status).toBe('off')
    expect(remembered).toBeNull()
  })
})

describe('the setting', () => {
  it('explains when the browser can’t do it', async () => {
    const store = initStore(createAppStore())
    stop = await startFolderBackup(store, db, mem)
    render(<FolderBackupRow />)
    expect(screen.getByText(/Your browser doesn’t support automatic backup/)).toBeInTheDocument()
    expect(screen.queryByRole('button')).toBeNull()
  })

  it('turns on from the button', async () => {
    await setup()
    render(<FolderBackupRow />)
    await userEvent.click(screen.getByRole('button', { name: 'Choose folder…' }))
    expect(await screen.findByText(/Saving to “Backups”/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Back up now' })).toBeInTheDocument()
  })
})
