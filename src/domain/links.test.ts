import { describe, expect, it } from 'vitest'
import { DEFAULT_SETTINGS, newNoteDraft } from './defaults'
import { backlinks, findLinks, linkKeys, noteForLink } from './links'
import type { Note } from './types'

let n = 0
const note = (patch: Partial<Note>): Note => ({
  ...newNoteDraft(1000 + n++, DEFAULT_SETTINGS),
  ...patch,
})

describe('findLinks', () => {
  it('finds [[Title]] links and where they are', () => {
    const text = 'See [[Plan]] and [[Shopping list]].'
    expect(findLinks(text)).toEqual([
      { title: 'Plan', from: 4, to: 12 },
      { title: 'Shopping list', from: 17, to: 34 },
    ])
  })

  it('ignores empty, nested and multi-line brackets, and code blocks', () => {
    const text = '[[ ]] [[a[b]]] [[two\nlines]]\n```\n[[in code]]\n```\n[[after]]'
    expect(findLinks(text).map((l) => l.title)).toEqual(['after'])
  })
})

describe('noteForLink', () => {
  it('matches a note by its title, ignoring case, spacing and a heading mark', () => {
    const plan = note({ title: null, content: '# Project  Plan\nsteps' })
    const other = note({ title: 'Other', content: 'x' })
    const notes = { [plan.id]: plan, [other.id]: other }
    expect(noteForLink(notes, 'project plan')?.id).toBe(plan.id)
    expect(noteForLink(notes, 'Missing')).toBeUndefined()
  })

  it('skips the trash and prefers the most recently edited of two namesakes', () => {
    const old = note({ title: 'Ideas', content: 'a', updatedAt: 1 })
    const recent = note({ title: 'Ideas', content: 'b', updatedAt: 5 })
    const binned = note({ title: 'Ideas', content: 'c', updatedAt: 9, deletedAt: 9 })
    const notes = { [old.id]: old, [recent.id]: recent, [binned.id]: binned }
    expect(noteForLink(notes, 'Ideas')?.id).toBe(recent.id)
  })
})

describe('backlinks', () => {
  it('lists the notes that link to a note, not itself, the trash or locked notes', () => {
    const target = note({ title: 'Plan', content: 'the plan' })
    const a = note({ title: 'A', content: 'see [[plan]]' })
    const b = note({ title: 'B', content: 'no link' })
    const self = note({ ...target, content: 'me [[Plan]]' })
    const binned = note({ title: 'C', content: '[[Plan]]', deletedAt: 1 })
    const notes = { [self.id]: self, [a.id]: a, [b.id]: b, [binned.id]: binned }
    expect(backlinks(notes, self.id).map((x) => x.id)).toEqual([a.id])
  })
})

describe('linkKeys', () => {
  it('reads a note’s links once, until its text changes', () => {
    const a = note({ content: 'see [[Plan]] and [[Ideas]]' })
    const first = linkKeys(a)
    expect([...first].sort()).toEqual(['ideas', 'plan'])
    expect(linkKeys(a)).toBe(first)
    const edited = { ...a, content: a.content + ' [[More]]' }
    expect(linkKeys(edited)).not.toBe(first)
    expect(linkKeys(edited).has('more')).toBe(true)
  })
})
