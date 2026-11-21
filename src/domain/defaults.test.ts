import { DEFAULT_SETTINGS, emptySession, mergeSettings, newNoteDraft } from './defaults'
import {
  EDITOR_FONT_MAX,
  EDITOR_FONT_MIN,
  cleanNoteFont,
  EDITOR_FONTS,
  editorFontStack,
  effectiveEditorFont,
  effectiveEditorFontSize,
  PHONE_FONT_MAX,
  PHONE_FONT_MIN,
} from './defaults'

describe('mergeSettings', () => {
  it('returns defaults when nothing is stored', () => {
    expect(mergeSettings(undefined)).toEqual(DEFAULT_SETTINGS)
  })

  it('keeps known keys and drops unknown ones', () => {
    expect(mergeSettings({ tabSize: 4, bogus: 1 } as never)).toEqual({
      ...DEFAULT_SETTINGS,
      tabSize: 4,
    })
  })

  it('keeps an emoji skin tone from 0 (default) to 5 and drops anything else', () => {
    expect(DEFAULT_SETTINGS.emojiSkinTone).toBe(0)
    expect(mergeSettings({ emojiSkinTone: 3 }).emojiSkinTone).toBe(3)
    for (const bad of [-1, 6, 2.5])
      expect(mergeSettings({ emojiSkinTone: bad }).emojiSkinTone).toBe(0)
  })

  it('drops values whose type does not match the default', () => {
    expect(mergeSettings({ tabSize: '8' } as never)).toEqual(DEFAULT_SETTINGS)
  })
})

describe('DEFAULT_SETTINGS', () => {
  it('matches the spec defaults', () => {
    expect(DEFAULT_SETTINGS).toMatchObject({
      theme: 'system',
      editorFont: 'mono',
      defaultMode: 'plain',
      defaultWrap: true,
      lineNumbers: true,
      tabSize: 2,
      backupReminderDays: 7,
    })
  })
})

describe('newNoteDraft', () => {
  it('creates an empty note from settings', () => {
    expect(newNoteDraft(1000, DEFAULT_SETTINGS)).toMatchObject({
      title: null,
      content: '',
      mode: 'plain',
      language: 'auto',
      wrap: true,
      pinned: false,
      rev: 0,
      deletedAt: null,
      createdAt: 1000,
      updatedAt: 1000,
    })
  })

  it('generates unique ids unless one is given', () => {
    const a = newNoteDraft(1, DEFAULT_SETTINGS)
    const b = newNoteDraft(1, DEFAULT_SETTINGS)
    expect(a.id).not.toBe(b.id)
    expect(newNoteDraft(1, DEFAULT_SETTINGS, 'fixed').id).toBe('fixed')
  })

  it('uses markdown mode when that is the default', () => {
    expect(newNoteDraft(1, { ...DEFAULT_SETTINGS, defaultMode: 'markdown' }).mode).toBe('markdown')
  })
})

describe('emptySession', () => {
  it('has no tabs and a closed notes sidebar', () => {
    expect(emptySession()).toEqual({
      openTabIds: [],
      activeTabId: null,
      closedStack: [],
      perTab: {},
      sidebar: { open: false, panel: 'notes' },
      zen: false,
    })
  })
})

describe('phone text size', () => {
  it('defaults to 16 and survives a merge', () => {
    expect(DEFAULT_SETTINGS.phoneEditorFontSize).toBe(16)
    expect(mergeSettings({ phoneEditorFontSize: 20 }).phoneEditorFontSize).toBe(20)
    expect([PHONE_FONT_MIN, PHONE_FONT_MAX]).toEqual([16, 72])
    expect([EDITOR_FONT_MIN, EDITOR_FONT_MAX]).toEqual([10, 72])
  })

  it('phones use their own size; laptops keep the shared one', () => {
    const s = { ...DEFAULT_SETTINGS, editorFontSize: 13, phoneEditorFontSize: 18 }
    expect(effectiveEditorFontSize(s, true)).toBe(18)
    expect(effectiveEditorFontSize(s, false)).toBe(13)
  })

  it('never goes below 16 on a phone, even from old stored values', () => {
    expect(effectiveEditorFontSize({ ...DEFAULT_SETTINGS, phoneEditorFontSize: 12 }, true)).toBe(16)
  })
})

describe('note text size', () => {
  it('a note’s own size wins over Settings, per device', () => {
    const note = { fontSize: 20, phoneFontSize: 22 }
    expect(effectiveEditorFontSize(DEFAULT_SETTINGS, false, note)).toBe(20)
    expect(effectiveEditorFontSize(DEFAULT_SETTINGS, true, note)).toBe(22)
    expect(effectiveEditorFontSize(DEFAULT_SETTINGS, false, {})).toBe(14)
  })
})

describe('editor fonts', () => {
  it('an unknown stored font falls back to monospace', () => {
    expect(mergeSettings({ editorFont: 'comic' } as never).editorFont).toBe('mono')
    expect(mergeSettings({ editorFont: 'serif' }).editorFont).toBe('serif')
  })

  it('cleanNoteFont keeps only known fonts', () => {
    expect(cleanNoteFont('rounded')).toBe('rounded')
    expect(cleanNoteFont('x')).toBeUndefined()
    expect(cleanNoteFont(3)).toBeUndefined()
  })

  it('a note’s own font wins over Settings', () => {
    expect(effectiveEditorFont({ editorFont: 'sans' })).toBe('sans')
    expect(effectiveEditorFont({ editorFont: 'sans' }, { font: 'serif' })).toBe('serif')
  })

  it('every font has its own CSS stack', () => {
    const stacks = EDITOR_FONTS.map((f) => editorFontStack(f.value))
    expect(new Set(stacks).size).toBe(4)
    expect(editorFontStack('serif')).toBe('var(--font-serif)')
  })
})
