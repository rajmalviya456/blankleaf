/** Note tags: short labels, compared without regard to case. */
import type { Note } from './types'

export const TAG_MAX_LENGTH = 30
export const TAGS_PER_NOTE = 20

/** A tag as stored: no leading #, single spaces, length limited. Empty if nothing is left. */
export function normalizeTag(raw: string): string {
  const cut = raw.trim().replace(/^#+/, '').replace(/\s+/g, ' ').trim().slice(0, TAG_MAX_LENGTH)
  // Don't leave half an emoji (a lone surrogate) at the end.
  return (/[\uD800-\uDBFF]$/.test(cut) ? cut.slice(0, -1) : cut).trim()
}

export const sameTag = (a: string, b: string) => a.toLowerCase() === b.toLowerCase()

export function addTag(tags: readonly string[], raw: string): string[] {
  const tag = normalizeTag(raw)
  if (!tag || tags.length >= TAGS_PER_NOTE || tags.some((t) => sameTag(t, tag))) return [...tags]
  return [...tags, tag]
}

/** Coerce untrusted data (a backup file) into valid tags. */
export function cleanTags(raw: unknown): string[] {
  if (!Array.isArray(raw)) return []
  return raw.reduce<string[]>((tags, t) => (typeof t === 'string' ? addTag(tags, t) : tags), [])
}

export const noteHasTag = (note: Pick<Note, 'tags'>, tag: string) =>
  (note.tags ?? []).some((t) => sameTag(t, tag))

/** Every tag in use on these notes, by name, with how many notes carry it. */
export function tagCounts(notes: readonly Pick<Note, 'tags'>[]): { tag: string; count: number }[] {
  const found = new Map<string, { tag: string; count: number }>()
  for (const note of notes)
    for (const tag of note.tags ?? []) {
      const entry = found.get(tag.toLowerCase())
      if (entry) entry.count++
      else found.set(tag.toLowerCase(), { tag, count: 1 })
    }
  const byName = new Intl.Collator(undefined, { numeric: true, sensitivity: 'base' })
  return [...found.values()].sort((a, b) => byName.compare(a.tag, b.tag))
}
