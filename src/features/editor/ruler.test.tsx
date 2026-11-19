import { act, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { mergeSettings } from '../../domain/defaults'
import type { LanguageId } from '../../domain/types'
import { createAppStore, initStore } from '../../store/store'
import { EditorSection } from '../settings/sections/EditorSection'
import { Editor } from './Editor'

function setup(language: LanguageId) {
  const store = initStore(createAppStore())
  const s = () => store.getState()
  const id = s().newNote({ content: 'x', language })
  const { container } = render(<Editor noteId={id} />)
  const editor = () => container.querySelector('.cm-editor') as HTMLElement
  return { s, editor }
}

describe('column ruler', () => {
  it('shows at 80 characters in code notes', async () => {
    const { editor } = setup('javascript')
    await vi.waitFor(() => expect(editor()).toHaveClass('np-ruler'))
    expect(editor().style.getPropertyValue('--np-ruler')).toBe('80ch')
  })

  it('never shows in plain text or Markdown', () => {
    expect(setup('plaintext').editor()).not.toHaveClass('np-ruler')
    expect(setup('markdown').editor()).not.toHaveClass('np-ruler')
  })

  it('follows the setting, and can be turned off', async () => {
    const { s, editor } = setup('python')
    act(() => s().updateSettings({ codeRuler: 100 }))
    await vi.waitFor(() => expect(editor().style.getPropertyValue('--np-ruler')).toBe('100ch'))
    act(() => s().updateSettings({ codeRuler: 0 }))
    await vi.waitFor(() => expect(editor()).not.toHaveClass('np-ruler'))
  })

  it('is a setting under Editor', async () => {
    const store = initStore(createAppStore())
    const s = () => store.getState()
    render(<EditorSection settings={s().settings} update={(patch) => s().updateSettings(patch)} />)
    const user = userEvent.setup()
    await user.click(screen.getByRole('combobox', { name: 'Code ruler' }))
    await user.click(await screen.findByRole('option', { name: '120 characters' }))
    expect(store.getState().settings.codeRuler).toBe(120)
  })

  it('keeps a valid stored value and defaults to 80', () => {
    expect(mergeSettings({}).codeRuler).toBe(80)
    expect(mergeSettings({ codeRuler: 100 }).codeRuler).toBe(100)
  })
})
