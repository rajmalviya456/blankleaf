import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it } from 'vitest'
import { stubMedia } from '../../../tests/media'
import { App } from '../../app/App'
import { COMMANDS } from '../../commands/registry'
import {
  addTag,
  cleanTags,
  normalizeTag,
  TAG_MAX_LENGTH,
  TAGS_PER_NOTE,
  tagCounts,
} from '../../domain/tags'
import { createAppStore, initStore } from '../../store/store'
import { parseBackup } from '../backup/backup'
import { phoneStore } from '../phone/phoneStore'
import { searchNotes } from '../sidebar/search'
import { NotesList } from '../sidebar/NotesList'
import { tagsStore } from './tagsStore'

let media: ReturnType<typeof stubMedia> | undefined
afterEach(() => {
  media?.restore()
  act(() => tagsStore.getState().close())
  phoneStore.setState({ stack: [] })
})

function setup() {
  const store = initStore(createAppStore())
  const s = () => store.getState()
  const work = s().newNote({ title: 'Report', content: 'r', tags: ['Work', 'urgent'] })
  const home = s().newNote({ title: 'Groceries', content: 'g', tags: ['home'] })
  const none = s().newNote({ title: 'Loose', content: 'l' })
  return { store, s, work, home, none }
}

describe('tag rules', () => {
  it('tidies tags', () => {
    expect(normalizeTag('  ##Big   idea ')).toBe('Big idea')
    expect(normalizeTag('#')).toBe('')
    expect(normalizeTag('x'.repeat(99))).toHaveLength(TAG_MAX_LENGTH)
    // Never half an emoji at the cut.
    expect(normalizeTag('a'.repeat(TAG_MAX_LENGTH - 1) + '😀')).toBe('a'.repeat(TAG_MAX_LENGTH - 1))
  })

  it('ignores duplicates in any case, and stops at the limit', () => {
    expect(addTag(['Work'], 'work')).toEqual(['Work'])
    const full = Array.from({ length: TAGS_PER_NOTE }, (_, i) => `t${i}`)
    expect(addTag(full, 'more')).toHaveLength(TAGS_PER_NOTE)
  })

  it('counts tags across notes, ignoring case', () => {
    expect(tagCounts([{ tags: ['b', 'A'] }, { tags: ['a'] }, {}])).toEqual([
      { tag: 'A', count: 2 },
      { tag: 'b', count: 1 },
    ])
  })

  it('cleans tags from untrusted files', () => {
    expect(cleanTags(['ok', 7, null, '  ', 'OK'])).toEqual(['ok'])
    expect(cleanTags('nope')).toEqual([])
  })
})

describe('tags on notes', () => {
  it('survive duplicating and backups', () => {
    const { s, work } = setup()
    const copy = s().duplicateNote(work)
    expect(s().notes[copy].tags).toEqual(['Work', 'urgent'])
    const b = parseBackup(
      JSON.stringify({
        app: 'blankleaf',
        schemaVersion: 1,
        notes: [
          { id: 'a', content: 'x', tags: ['one', 5] },
          { id: 'b', content: 'y' },
        ],
      }),
    )
    expect(b.notes.map((n) => n.tags)).toEqual([['one'], undefined])
  })

  it('can be found by searching, with or without #', () => {
    const { s, work } = setup()
    const notes = Object.values(s().notes)
    expect(searchNotes(notes, 'urgent').map((r) => r.id)).toEqual([work])
    expect(searchNotes(notes, '#work').map((r) => r.id)).toEqual([work])
  })

  it('filter the notes list, and clear when the tag goes away', async () => {
    const { s, home } = setup()
    const user = userEvent.setup()
    render(<NotesList />)
    const list = screen.getByRole('list', { name: 'Notes' })
    expect(within(list).getAllByRole('listitem')).toHaveLength(3)
    const filter = screen.getByRole('group', { name: 'Filter by tag' })
    await user.click(within(filter).getByRole('button', { name: 'home, 1 note' }))
    expect(within(list).getAllByRole('listitem')).toHaveLength(1)
    expect(within(list).getByText('Groceries')).toBeInTheDocument()
    expect(within(filter).getByRole('button', { name: 'home, 1 note' })).toHaveAttribute(
      'aria-pressed',
      'true',
    )
    act(() => s().setNoteTags(home, []))
    expect(within(list).getAllByRole('listitem')).toHaveLength(3)
  })

  it('show nothing extra when no note has tags', () => {
    initStore(createAppStore()).getState().newNote({ title: 'Plain', content: 'p' })
    render(<NotesList />)
    expect(screen.queryByRole('group', { name: 'Filter by tag' })).toBeNull()
  })
})

describe.each([
  ['laptop', false],
  ['phone', true],
])('editing tags (%s)', (_, phone) => {
  it('adds with Enter or comma, suggests existing tags, and removes', async () => {
    media = stubMedia({ phone, touch: phone })
    const { s, none } = setup()
    const user = userEvent.setup()
    render(<App />)
    act(() => tagsStore.getState().open(none))
    const dialog = await screen.findByRole('dialog', { name: 'Tags' })
    const input = within(dialog).getByRole('textbox', { name: 'Add a tag' })
    await user.type(input, 'ideas{Enter}')
    await user.type(input, 'later,')
    expect(s().notes[none].tags).toEqual(['ideas', 'later'])
    expect(input).toHaveValue('')
    await user.click(within(dialog).getByRole('button', { name: 'Add tag home' }))
    expect(s().notes[none].tags).toEqual(['ideas', 'later', 'home'])
    await user.click(within(dialog).getByRole('button', { name: 'Remove tag later' }))
    expect(s().notes[none].tags).toEqual(['ideas', 'home'])
    await user.type(input, 'typed but not entered')
    await user.click(within(dialog).getByRole('button', { name: 'Done' }))
    expect(s().notes[none].tags).toContain('typed but not entered')
    await waitFor(() => expect(screen.queryByRole('dialog', { name: 'Tags' })).toBeNull())
  })

  it('splits pasted or phone-typed commas into separate tags', async () => {
    media = stubMedia({ phone, touch: phone })
    const { s, none } = setup()
    const user = userEvent.setup()
    render(<App />)
    act(() => tagsStore.getState().open(none))
    const dialog = await screen.findByRole('dialog', { name: 'Tags' })
    const input = within(dialog).getByRole('textbox', { name: 'Add a tag' })
    // A paste, or an Android keyboard (whose comma key reports no key name), changes the
    // value without a comma keydown.
    await user.click(input)
    await user.paste('design, ideas,draf')
    expect(s().notes[none].tags).toEqual(['design', 'ideas'])
    expect(input).toHaveValue('draf')
  })

  it('Enter that only confirms IME text does not add a tag', async () => {
    media = stubMedia({ phone, touch: phone })
    const { s, none } = setup()
    const user = userEvent.setup()
    render(<App />)
    act(() => tagsStore.getState().open(none))
    const dialog = await screen.findByRole('dialog', { name: 'Tags' })
    const input = within(dialog).getByRole('textbox', { name: 'Add a tag' })
    await user.type(input, 'しごと')
    fireEvent.keyDown(input, { key: 'Enter', isComposing: true })
    expect(s().notes[none].tags ?? []).toEqual([])
    expect(input).toHaveValue('しごと')
  })
})

it('is a palette command, and Back closes it on phones', async () => {
  media = stubMedia({ phone: true, touch: true })
  const { store, s } = setup()
  render(<App />)
  act(() => COMMANDS.find((c) => c.id === 'note.tags')!.run({ store }))
  expect(tagsStore.getState().noteId).toBe(s().session.activeTabId)
  await screen.findByRole('dialog', { name: 'Tags' })
  expect(phoneStore.getState().stack).toEqual([{ kind: 'app', id: 'tags' }])
})
