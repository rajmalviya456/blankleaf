import { LANGUAGES } from '../../domain/languages'
import { act, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createAppStore, initStore } from '../../store/store'
import { FormatPicker } from './FormatPicker'

function setup() {
  const store = initStore(createAppStore())
  const id = store.getState().newNote()
  store.getState().updateContent(id, 'x = 1')
  render(<FormatPicker noteId={id} />)
  return { id, s: () => store.getState(), user: userEvent.setup() }
}

describe('FormatPicker', () => {
  it('shows the current format, with auto marked', () => {
    const { id, s } = setup()
    expect(screen.getByRole('button', { name: /format: plain text \(auto\)/i })).toBeInTheDocument()
    act(() => s().setLanguage(id, 'python'))
    expect(screen.getByRole('button', { name: /format: python/i })).toBeInTheDocument()
  })

  it('choosing a format saves it on the note', async () => {
    const { id, s, user } = setup()
    await user.click(screen.getByRole('button', { name: /format/i }))
    await user.click(await screen.findByRole('menuitemradio', { name: 'Python' }))
    expect(s().notes[id].language).toBe('python')
  })

  it('offers auto-detect and every format', async () => {
    const { id, s, user } = setup()
    act(() => s().setLanguage(id, 'go'))
    await user.click(screen.getByRole('button', { name: /format/i }))
    const items = await screen.findAllByRole('menuitemradio')
    expect(items[0]).toHaveTextContent('Auto-detect')
    expect(items.length).toBe(LANGUAGES.length + 1)
    expect(screen.getByRole('menuitemradio', { name: 'Go' })).toHaveAttribute(
      'aria-checked',
      'true',
    )
    await user.click(items[0])
    expect(s().notes[id].language).toBe('auto')
  })

  it('groups formats under Text, Data & config and Code', async () => {
    const { user } = setup()
    await user.click(screen.getByRole('button', { name: /format/i }))
    const groups = await screen.findAllByRole('group')
    expect(groups.map((g) => g.getAttribute('aria-label')).filter(Boolean)).toEqual([
      'Text',
      'Data & config',
      'Code',
    ])
  })
})
