import { act, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it } from 'vitest'
import { App } from '../../app/App'
import { COMMANDS } from '../../commands/registry'
import { createAppStore, initStore } from '../../store/store'
import { readabilityStore } from './readabilityStore'

afterEach(() => act(() => readabilityStore.getState().close()))

const LONG =
  'This sentence keeps going and going with many more words than anyone would ever want to read in one breath before stopping for a rest at last.'

function setup(content = `Short one. ${LONG} The end.`) {
  const store = initStore(createAppStore())
  const id = store.getState().newNote({ content })
  render(<App />)
  return { store, id, user: userEvent.setup() }
}

describe('Readability panel', () => {
  it('opens from the palette with the grade, counts and long sentences', async () => {
    const { store } = setup()
    act(() => COMMANDS.find((c) => c.id === 'note.readability')!.run({ store }))
    const panel = await screen.findByRole('region', { name: 'Readability' })
    expect(panel).toHaveTextContent(/Grade \d/)
    expect(panel).toHaveTextContent('3 sentences')
    expect(panel).toHaveTextContent('1 long sentence')
  })

  it('shows no English grade for text in another language, but still counts it', async () => {
    const { store } = setup('La casa es muy bonita. Vamos a la playa mañana por la tarde.')
    act(() => COMMANDS.find((c) => c.id === 'note.readability')!.run({ store }))
    const panel = await screen.findByRole('region', { name: 'Readability' })
    expect(panel).toHaveTextContent('Grade: English text only')
    expect(panel).not.toHaveTextContent('Reading ease')
    expect(panel).toHaveTextContent('2 sentences')
  })

  it('highlights long sentences in the note when asked', async () => {
    const { store, user } = setup()
    act(() => COMMANDS.find((c) => c.id === 'note.readability')!.run({ store }))
    const panel = await screen.findByRole('region', { name: 'Readability' })
    expect(document.querySelector('.np-long-sentence')).toBeNull()
    await user.click(within(panel).getByRole('switch', { name: 'Highlight long sentences' }))
    await waitFor(() => expect(document.querySelector('.np-long-sentence')?.textContent).toBe(LONG))
    await user.click(within(panel).getByRole('button', { name: 'Close readability' }))
    await waitFor(() => expect(document.querySelector('.np-long-sentence')).toBeNull())
  })

  it('lists overused words', async () => {
    const { store } = setup('Really good. Really fast. Really simple. Really done.')
    act(() => COMMANDS.find((c) => c.id === 'note.readability')!.run({ store }))
    const panel = await screen.findByRole('region', { name: 'Readability' })
    expect(within(panel).getByText('really ×4')).toBeInTheDocument()
  })

  it('updates as you write', async () => {
    const { store, id } = setup('One.')
    act(() => COMMANDS.find((c) => c.id === 'note.readability')!.run({ store }))
    const panel = await screen.findByRole('region', { name: 'Readability' })
    expect(panel).toHaveTextContent('1 sentence')
    act(() => store.getState().updateContent(id, 'One. Two.'))
    await waitFor(() => expect(panel).toHaveTextContent('2 sentences'))
  })
})
