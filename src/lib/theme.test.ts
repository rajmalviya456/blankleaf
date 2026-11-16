import { DEFAULT_SETTINGS } from '../domain/defaults'
import { applySettingsToDocument, applyTheme, resolveTheme } from './theme'

describe('resolveTheme', () => {
  it('follows the system preference when set to system', () => {
    expect(resolveTheme('system', true)).toBe('dark')
    expect(resolveTheme('system', false)).toBe('light')
  })

  it('uses an explicit preference over the system', () => {
    expect(resolveTheme('light', true)).toBe('light')
    expect(resolveTheme('dark', false)).toBe('dark')
  })
})

describe('applyTheme', () => {
  it('sets data-theme on the document element', () => {
    applyTheme('dark')
    expect(document.documentElement.dataset.theme).toBe('dark')
    applyTheme('light')
    expect(document.documentElement.dataset.theme).toBe('light')
  })
})

describe('applySettingsToDocument', () => {
  const root = document.documentElement
  afterEach(() => root.removeAttribute('style'))

  it('applies theme, font sizes and line height as CSS variables', () => {
    applySettingsToDocument(
      { ...DEFAULT_SETTINGS, theme: 'dark', editorFontSize: 18, lineHeight: 1.8, uiFontSize: 14 },
      false,
    )
    expect(root.dataset.theme).toBe('dark')
    expect(root.style.getPropertyValue('--editor-font-size')).toBe('18px')
    expect(root.style.getPropertyValue('--editor-line-height')).toBe('1.8')
    expect(root.style.getPropertyValue('--ui-font-size')).toBe('14px')
  })

  it('sets a custom accent and clears it again for the theme default', () => {
    applySettingsToDocument({ ...DEFAULT_SETTINGS, accent: '#e0559b' }, false)
    expect(root.style.getPropertyValue('--accent')).toBe('#e0559b')
    expect(root.style.getPropertyValue('--accent-soft')).toBe('#e0559b24')
    applySettingsToDocument({ ...DEFAULT_SETTINGS, accent: '' }, false)
    expect(root.style.getPropertyValue('--accent')).toBe('')
  })

  it('ignores an accent that is not a hex colour', () => {
    applySettingsToDocument({ ...DEFAULT_SETTINGS, accent: 'red;}body{' }, false)
    expect(root.style.getPropertyValue('--accent')).toBe('')
  })
})
