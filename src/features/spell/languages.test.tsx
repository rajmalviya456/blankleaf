import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { mergeSettings } from '../../domain/defaults'
import { createChecker } from './checker'
import { SPELL_LANGUAGES, resolveSpellLanguage } from './languages'

describe('spell check languages', () => {
  it('follows the browser’s language when set to automatic', () => {
    expect(resolveSpellLanguage('auto', ['en-GB', 'en'])).toBe('en-GB')
    expect(resolveSpellLanguage('auto', ['es-MX'])).toBe('es')
    expect(resolveSpellLanguage('auto', ['en-NZ'])).toBe('en-AU')
    expect(resolveSpellLanguage('auto', ['fr-FR', 'en-CA'])).toBe('en-CA')
    expect(resolveSpellLanguage('auto', ['fr-FR'])).toBe('en-US')
  })

  it('copes with a browser that reports no languages', () => {
    expect(resolveSpellLanguage('auto', undefined)).toBe('en-US')
  })

  it('uses a chosen language as it is', () => {
    expect(resolveSpellLanguage('es', ['en-US'])).toBe('es')
  })

  it('is a setting, automatic by default', () => {
    expect(mergeSettings({}).spellLanguage).toBe('auto')
    expect(mergeSettings({ spellLanguage: 'en-GB' }).spellLanguage).toBe('en-GB')
    expect(mergeSettings({ spellLanguage: 'xx' as never }).spellLanguage).toBe('auto')
  })

  it.each([
    ['en-GB', 'colour', 'colur'],
    ['en-AU', 'colour', 'colur'],
    ['en-CA', 'colour', 'colur'],
    ['es', 'casa', 'kasa'],
  ])('%s knows its words', (lang, good, bad) => {
    const pkg = SPELL_LANGUAGES.find((l) => l.id === lang)!.pkg
    const file = (name: string) => readFileSync(resolve('node_modules', pkg, name), 'utf8')
    const checker = createChecker(file('index.aff'), file('index.dic'), [])
    expect(checker.correct(good)).toBe(true)
    expect(checker.correct(bad)).toBe(false)
  })
})

describe('spell check language setting', () => {
  it('is under Settings › Editor', async () => {
    const { render, screen } = await import('@testing-library/react')
    const { default: userEvent } = await import('@testing-library/user-event')
    const { createAppStore, initStore } = await import('../../store/store')
    const { EditorSection } = await import('../settings/sections/EditorSection')
    const store = initStore(createAppStore())
    const s = () => store.getState()
    render(<EditorSection settings={s().settings} update={(patch) => s().updateSettings(patch)} />)
    const user = userEvent.setup()
    await user.click(screen.getByRole('combobox', { name: 'Spell check language' }))
    await user.click(await screen.findByRole('option', { name: 'English (UK)' }))
    expect(s().settings.spellLanguage).toBe('en-GB')
  })
})
