import { act, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { stubMedia } from '../../tests/media'
import { App } from '../app/App'
import { importStore } from '../features/backup/importStore'
import { shareStore } from '../features/share/shareStore'
import { createAppStore, initStore } from '../store/store'

let media: ReturnType<typeof stubMedia>
afterEach(() => media?.restore())

function setup() {
  media = stubMedia({ phone: true })
  const store = initStore(createAppStore())
  const id = store.getState().newNote()
  render(<App />)
  return { s: () => store.getState(), id }
}

describe('dialogs on a phone are bottom sheets', () => {
  it.each([
    ['settingsOpen', /settings/i],
    ['aboutOpen', /about blankleaf/i],
    ['whatsNewOpen', /what’s new/i],
    ['shortcutsOpen', /keyboard shortcuts/i],
    ['paletteOpen', /command palette/i],
  ] as const)('%s', async (flag, name) => {
    const { s } = setup()
    act(() => s().setUi({ [flag]: true }))
    expect(await screen.findByRole('dialog', { name })).toHaveAttribute('data-surface', 'sheet')
  })

  it('share dialog', async () => {
    const { id } = setup()
    act(() => shareStore.getState().open(id))
    expect(await screen.findByRole('dialog', { name: /share/i })).toHaveAttribute(
      'data-surface',
      'sheet',
    )
    act(() => shareStore.getState().close())
  })

  it('import dialog', async () => {
    setup()
    act(() => importStore.getState().show({ fileName: 'b.json', error: 'Not a backup' }))
    expect(await screen.findByRole('dialog', { name: /import backup/i })).toHaveAttribute(
      'data-surface',
      'sheet',
    )
    act(() => importStore.getState().close())
  })
})
