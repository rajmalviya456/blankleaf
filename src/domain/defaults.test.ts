import { DEFAULT_SETTINGS, emptySession, mergeSettings, newNoteDraft } from './defaults'

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
