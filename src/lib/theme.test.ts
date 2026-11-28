import { DEFAULT_SETTINGS } from '../domain/defaults'
import { ACCENTS } from '../domain/accents'
import { accentShade, contrast } from './color'
import { applySettingsToDocument, applyTheme, resolveTheme, savedTheme, THEME_COLOR } from './theme'

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
    applySettingsToDocument({ ...DEFAULT_SETTINGS, accent: '#3d5ce6' }, false)
    expect(root.style.getPropertyValue('--accent')).toBe('#3d5ce6')
    expect(root.style.getPropertyValue('--accent-soft')).toBe('#3d5ce624')
    applySettingsToDocument({ ...DEFAULT_SETTINGS, accent: '' }, false)
    expect(root.style.getPropertyValue('--accent')).toBe('')
  })

  it('draws each accent in a shade that reads well in the current theme', () => {
    for (const { value } of ACCENTS.filter((a) => a.value)) {
      applySettingsToDocument({ ...DEFAULT_SETTINGS, theme: 'light', accent: value }, false)
      const light = root.style.getPropertyValue('--accent')
      expect(light).toBe(accentShade(value, 'light'))
      expect(contrast(light, '#ffffff')).toBeGreaterThanOrEqual(4.5)
      expect(root.style.getPropertyValue('--accent-soft')).toBe(`${light}24`)
      applySettingsToDocument({ ...DEFAULT_SETTINGS, theme: 'dark', accent: value }, false)
      expect(root.style.getPropertyValue('--accent')).toBe(accentShade(value, 'dark'))
    }
  })

  it('ignores an accent that is not a hex colour', () => {
    applySettingsToDocument({ ...DEFAULT_SETTINGS, accent: 'red;}body{' }, false)
    expect(root.style.getPropertyValue('--accent')).toBe('')
  })
})

describe('browser bar colour', () => {
  it('theme-color follows the resolved theme', () => {
    const meta = document.createElement('meta')
    meta.name = 'theme-color'
    document.head.append(meta)
    applySettingsToDocument({ ...DEFAULT_SETTINGS, theme: 'dark' }, false)
    expect(meta.content).toBe(THEME_COLOR.dark)
    applySettingsToDocument({ ...DEFAULT_SETTINGS, theme: 'light' }, true)
    expect(meta.content).toBe(THEME_COLOR.light)
    meta.remove()
  })
})

describe('the share-link view', () => {
  afterEach(() => localStorage.clear())
  it('shows the saved theme and leaves the saved choice alone', () => {
    localStorage.setItem('blankleaf:theme', 'dark')
    applySettingsToDocument({ ...DEFAULT_SETTINGS, theme: savedTheme() ?? 'system' }, false, false)
    expect(document.documentElement.dataset.theme).toBe('dark')
    expect(localStorage.getItem('blankleaf:theme')).toBe('dark')
    localStorage.clear()
    applySettingsToDocument(DEFAULT_SETTINGS, false, false)
    expect(localStorage.getItem('blankleaf:theme')).toBeNull()
  })
})
