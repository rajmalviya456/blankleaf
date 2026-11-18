import { afterEach, describe, expect, it, vi } from 'vitest'
import { createAppStore, initStore } from '../../store/store'
import { openLaunchedFiles, sharedNoteFrom, takeSharedNote } from './launch'

const params = (o: Record<string, string>) => new URLSearchParams(o)

afterEach(() => {
  vi.unstubAllGlobals()
  history.replaceState(null, '', '/')
})

describe('text shared from another app', () => {
  it('becomes a note with its title, text and link', () => {
    expect(
      sharedNoteFrom(
        params({ title: 'Recipe', text: 'Great soup', url: 'https://a.test/s' }),
        true,
      ),
    ).toEqual({ title: 'Recipe', content: 'Great soup\n\nhttps://a.test/s' })
  })

  it('doesn’t repeat a link already in the text', () => {
    const note = sharedNoteFrom(
      params({ text: 'See https://a.test/s', url: 'https://a.test/s' }),
      true,
    )
    expect(note?.content).toBe('See https://a.test/s')
  })

  it('ignores an empty share', () => {
    expect(sharedNoteFrom(params({ title: 'Only a title', text: '  ' }), true)).toBeNull()
  })

  it('is refused outside the installed app, so websites can’t add notes by linking here', () => {
    expect(sharedNoteFrom(params({ text: 'spam' }), false)).toBeNull()
  })

  it('leaves the address bar clean', () => {
    vi.stubGlobal('matchMedia', () => ({ matches: true }))
    history.replaceState(null, '', '/?text=hello&keep=1')
    expect(takeSharedNote()?.content).toBe('hello')
    expect(location.search).toBe('?keep=1')
    expect(takeSharedNote()).toBeNull()
  })
})

describe('opening files with the app', () => {
  function launch(files: File[]) {
    let consumer: (p: { files: { getFile(): Promise<File> }[] }) => Promise<void> = async () => {}
    vi.stubGlobal('launchQueue', { setConsumer: (c: typeof consumer) => (consumer = c) })
    openLaunchedFiles()
    return consumer({ files: files.map((f) => ({ getFile: async () => f })) })
  }

  it('opens each file as a note and replaces the untouched blank page', async () => {
    const store = initStore(createAppStore())
    const blank = store.getState().newNote()
    await launch([new File(['# Plan'], 'plan.md'), new File(['hello'], 'todo.txt')])
    const s = store.getState()
    expect(s.notes[blank]).toBeUndefined()
    expect(s.session.openTabIds).toHaveLength(2)
    expect(Object.values(s.notes).map((n) => n.content)).toEqual(['# Plan', 'hello'])
  })

  it('keeps the note you were writing', async () => {
    const store = initStore(createAppStore())
    const id = store.getState().newNote({ content: 'in progress' })
    await launch([new File(['hello'], 'todo.txt')])
    expect(store.getState().session.openTabIds).toContain(id)
  })
})
