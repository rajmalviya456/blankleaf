import { act, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { EditorView } from '@codemirror/view'
import { describe, expect, it } from 'vitest'
import { COMMANDS } from '../../commands/registry'
import { createAppStore, initStore } from '../../store/store'
import { Editor } from '../editor/Editor'
import { Toolbar } from '../toolbar/Toolbar'
import { SYMBOL_GROUPS, findSymbols } from './symbols'
import { symbolStore } from './symbolStore'

function setup(content = 'Go ') {
  const store = initStore(createAppStore())
  const s = () => store.getState()
  const id = s().newNote({ content })
  const utils = render(
    <>
      <Toolbar noteId={id} />
      <Editor noteId={id} />
    </>,
  )
  const view = EditorView.findFromDOM(utils.container.querySelector('.cm-editor') as HTMLElement)!
  act(() => view.dispatch({ selection: { anchor: content.length } }))
  return { s, id, store, user: userEvent.setup() }
}

describe('symbols', () => {
  it('has arrows, maths, money, typography and marks', () => {
    const all = SYMBOL_GROUPS.flatMap((g) => g.items.map((i) => i.char))
    for (const c of ['→', '±', '½', '€', '₹', '—', '©', '✓']) expect(all).toContain(c)
  })

  it('finds symbols by name', () => {
    expect(findSymbols('arrow').map((s) => s.char)).toContain('→')
    expect(findSymbols('half').map((s) => s.char)).toEqual(['½'])
    expect(findSymbols('rupee').map((s) => s.char)).toEqual(['₹'])
  })
})

describe('symbol picker', () => {
  it('inserts a symbol at the cursor from the toolbar', async () => {
    const { s, id, user } = setup()
    await user.click(screen.getByRole('button', { name: 'Insert symbol or emoji' }))
    await user.type(await screen.findByRole('searchbox', { name: 'Find a symbol' }), 'right arrow')
    // The emoji ➡️ shares the name; plain symbols come first.
    await user.click(screen.getAllByRole('button', { name: 'right arrow' })[0])
    expect(s().notes[id].content).toBe('Go →')
  })

  it('inserts an emoji', async () => {
    const { s, id, user } = setup()
    await user.click(screen.getByRole('button', { name: 'Insert symbol or emoji' }))
    await user.click(await screen.findByRole('tab', { name: 'Emoji' }))
    await user.click(await screen.findByRole('button', { name: 'grinning face' }))
    expect(s().notes[id].content).toBe('Go 😀')
  })

  it('shows every emoji category, not just a few favourites', async () => {
    const { s, id, user } = setup()
    await user.click(screen.getByRole('button', { name: 'Insert symbol or emoji' }))
    await user.click(await screen.findByRole('tab', { name: 'Emoji' }))
    const categories = await screen.findByRole('tablist', { name: 'Emoji categories' })
    await user.click(within(categories).getByRole('tab', { name: 'Food & drink' }))
    await user.click(await screen.findByRole('button', { name: 'taco' }))
    expect(s().notes[id].content).toBe('Go 🌮')
  })

  it('types people emoji in the chosen skin tone and remembers it', async () => {
    const { s, id, user } = setup()
    await user.click(screen.getByRole('button', { name: 'Insert symbol or emoji' }))
    await user.click(await screen.findByRole('tab', { name: 'Emoji' }))
    const tones = await screen.findByRole('group', { name: 'Skin tone' })
    expect(within(tones).getByRole('button', { name: 'Default' })).toHaveAttribute(
      'aria-pressed',
      'true',
    )
    await user.click(within(tones).getByRole('button', { name: 'Medium' }))
    expect(within(tones).getByRole('button', { name: 'Medium' })).toHaveAttribute(
      'aria-pressed',
      'true',
    )
    expect(s().settings.emojiSkinTone).toBe(3)
    const categories = screen.getByRole('tablist', { name: 'Emoji categories' })
    await user.click(within(categories).getByRole('tab', { name: 'People' }))
    await user.click(await screen.findByRole('button', { name: 'waving hand' }))
    expect(s().notes[id].content).toBe('Go 👋🏽')
  })

  it('finds any emoji by search', async () => {
    const { s, id, user } = setup()
    await user.click(screen.getByRole('button', { name: 'Insert symbol or emoji' }))
    await user.type(await screen.findByRole('searchbox', { name: 'Find a symbol' }), 'unicorn')
    await user.click(await screen.findByRole('button', { name: 'unicorn' }))
    expect(s().notes[id].content).toBe('Go 🦄')
  })

  it('opens from the command palette', () => {
    const { store } = setup()
    act(() => COMMANDS.find((c) => c.id === 'edit.symbol')!.run({ store }))
    expect(symbolStore.getState().open).toBe(true)
    act(() => symbolStore.getState().setOpen(false))
  })
})
