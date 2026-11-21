import { describe, expect, it } from 'vitest'
import data from 'emojibase-data/en/data.json'
import { EMOJI_CATEGORIES, buildEmojiGroups, loadEmoji, withTone } from './emoji'
import { findSymbols } from './symbols'

describe('emoji data', () => {
  it('has every emoji, grouped by category, without skin-tone parts', async () => {
    const groups = await loadEmoji()
    expect(groups.map((g) => g.id)).toEqual(EMOJI_CATEGORIES.map((c) => c.id))
    const all = groups.flatMap((g) => g.items)
    expect(all.length).toBeGreaterThan(1800)
    const chars = all.map((e) => e.char)
    for (const c of ['😀', '🌮', '🦄', '🇮🇳', '🧑‍💻']) expect(chars).toContain(c)
    expect(chars).not.toContain('🏻') // skin-tone modifier on its own
    expect(groups.find((g) => g.id === 'food')!.items.map((e) => e.char)).toContain('🌮')
  })

  it('names emoji in plain words', async () => {
    const all = (await loadEmoji()).flatMap((g) => g.items)
    expect(all.find((e) => e.char === '😀')!.name).toBe('grinning face')
    expect(all.find((e) => e.char === '🇮🇳')!.name).toBe('flag: India')
  })

  it('finds emoji by name and by keyword', async () => {
    const emoji = (await loadEmoji()).flatMap((g) => g.items)
    expect(findSymbols('taco', emoji).map((s) => s.char)).toContain('🌮')
    expect(findSymbols('mexican', emoji).map((s) => s.char)).toContain('🌮')
    expect(findSymbols('india', emoji).map((s) => s.char)).toContain('🇮🇳')
    expect(findSymbols('right arrow', emoji).map((s) => s.char)[0]).toBe('→')
  })
})

describe('emoji the device cannot draw', () => {
  it('leaves out versions newer than the device supports, so no empty boxes show', () => {
    const v16 = data.find((e) => e.version === 16)!.emoji
    // A device whose emoji font stops at version 15.1.
    const tested: string[] = []
    const groups = buildEmojiGroups(data, (char) => {
      tested.push(char)
      return data.find((e) => e.emoji === char)!.version <= 15.1
    })
    const chars = groups.flatMap((g) => g.items).map((e) => e.char)
    expect(chars).not.toContain(v16)
    expect(chars).not.toContain('🫜') // root vegetable, 16.0
    expect(chars).toContain('🫨') // shaking face, 15.0
    expect(chars).toContain('🙂‍↔️') // head shaking, 15.1 (a joined sequence; never tested itself)
    expect(tested.length).toBeLessThan(15) // one sample per version, not every emoji
  })

  it('keeps everything when the device can draw them all', () => {
    const all = buildEmojiGroups(data, () => true).flatMap((g) => g.items)
    expect(all.map((e) => e.char)).toContain('🫜')
  })
})

describe('skin tones', () => {
  const all = buildEmojiGroups(data, () => true).flatMap((g) => g.items)
  const byChar = (c: string) => all.find((e) => e.char === c)!

  it('gives people and hand emoji their five tones, lightest first', () => {
    expect(byChar('👋').skins).toEqual(['👋🏻', '👋🏼', '👋🏽', '👋🏾', '👋🏿'])
    expect(byChar('👍').skins![2]).toBe('👍🏽')
  })

  it('uses the same tone for everyone in a group emoji', () => {
    expect(byChar('🧑‍🤝‍🧑').skins![0]).toBe('🧑🏻‍🤝‍🧑🏻')
    expect(byChar('🧑‍🤝‍🧑').skins).toHaveLength(5)
  })

  it('leaves emoji without tones alone', () => {
    expect(byChar('😀').skins).toBeUndefined()
    expect(withTone(byChar('😀'), 3).char).toBe('😀')
  })

  it('switches an emoji to the chosen tone, keeping its name', () => {
    expect(withTone(byChar('👋'), 0).char).toBe('👋')
    expect(withTone(byChar('👋'), 5)).toMatchObject({ char: '👋🏿', name: 'waving hand' })
  })
})

describe('emoji categories people expect (as on the iPhone keyboard)', () => {
  const groups = buildEmojiGroups(data, () => true)
  const tab = (id: string) => groups.find((g) => g.id === id)!.items.map((e) => e.char)

  it('puts hearts with symbols, first', () => {
    for (const c of ['❤️', '💔', '💕']) {
      expect(tab('symbols')).toContain(c)
      expect(tab('smileys')).not.toContain(c)
    }
    expect(tab('symbols')[0]).toBe('💌')
  })

  it('puts sun, moon, weather and fire with nature', () => {
    for (const c of ['☀️', '🌙', '🌈', '❄️', '🔥', '🌊']) {
      expect(tab('animals')).toContain(c)
      expect(tab('travel')).not.toContain(c)
    }
  })

  it('puts clothes with people', () => {
    for (const c of ['👕', '👗', '👟', '👑']) {
      expect(tab('people')).toContain(c)
      expect(tab('objects')).not.toContain(c)
    }
  })

  it('puts clocks and timers with objects', () => {
    for (const c of ['⏰', '⌛', '🕐']) {
      expect(tab('objects')).toContain(c)
      expect(tab('travel')).not.toContain(c)
    }
  })

  it('keeps faces with smileys and still lists every emoji once', () => {
    expect(tab('smileys')).toContain('😺')
    const all = groups.flatMap((g) => g.items.map((e) => e.char))
    expect(new Set(all).size).toBe(all.length)
    expect(all.length).toBe(data.filter((e) => e.group !== undefined && e.group !== 2).length)
  })
})
