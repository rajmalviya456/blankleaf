import { act, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { stubMedia } from '../../../tests/media'
import { App } from '../../app/App'
import { COMMANDS } from '../../commands/registry'
import { createAppStore, initStore } from '../../store/store'
import { phoneStore } from '../phone/phoneStore'
import { printStore } from './printStore'

let media: ReturnType<typeof stubMedia> | undefined
const print = vi.fn()
beforeEach(() => {
  print.mockClear()
  window.print = print
  document.title = 'Blankleaf'
})
afterEach(() => {
  media?.restore()
  act(() => printStore.getState().close())
  phoneStore.setState({ stack: [] })
})
const root = () => document.getElementById('print-root')!

function setup(content: string, markdown = false) {
  const store = initStore(createAppStore())
  const s = () => store.getState()
  const id = s().newNote({ title: 'Trip plan', content, mode: markdown ? 'markdown' : 'plain' })
  render(<App />)
  return { store, s, id }
}

describe('print / save as PDF', () => {
  it('prints Markdown formatted, named after the note', async () => {
    const { id } = setup('# Heading\n\n- [x] done', true)
    act(() => printStore.getState().open(id))
    await waitFor(() => expect(print).toHaveBeenCalledTimes(1))
    expect(within(root()).getByRole('heading', { level: 1, name: 'Heading' })).toBeInTheDocument()
    expect(document.title).toBe('Trip plan')
  })

  it('prints plain text exactly as written, with its title', async () => {
    const { id } = setup('line one\n  indented')
    act(() => printStore.getState().open(id))
    await waitFor(() => expect(print).toHaveBeenCalled())
    expect(within(root()).getByRole('heading', { name: 'Trip plan' })).toBeInTheDocument()
    expect(root().querySelector('pre')!.textContent).toBe('line one\n  indented')
  })

  it('cleans up after printing', async () => {
    const { id } = setup('text')
    act(() => printStore.getState().open(id))
    await waitFor(() => expect(print).toHaveBeenCalled())
    act(() => void window.dispatchEvent(new Event('afterprint')))
    expect(document.getElementById('print-root')).toBeNull()
    expect(document.title).toBe('Blankleaf')
    expect(printStore.getState().noteId).toBeNull()
  })

  it('is a palette command on Ctrl/Cmd+P', () => {
    const { store, id } = setup('text')
    const cmd = COMMANDS.find((c) => c.id === 'note.print')!
    expect(cmd.title).toBe('Print / save as PDF…')
    expect(cmd.shortcuts).toEqual([{ code: 'KeyP', mod: true }])
    act(() => cmd.run({ store }))
    expect(printStore.getState().noteId).toBe(id)
  })

  it('is on the laptop toolbar', async () => {
    const { id } = setup('text')
    await userEvent.click(await screen.findByRole('button', { name: 'Print or save as PDF' }))
    expect(printStore.getState().noteId).toBe(id)
  })

  it('is in the phone note menu', async () => {
    media = stubMedia({ phone: true, touch: true })
    const { id } = setup('text')
    act(() => phoneStore.getState().open('menu'))
    const menu = await screen.findByRole('dialog', { name: 'Note menu' })
    await userEvent.click(within(menu).getByRole('button', { name: 'Print / save as PDF' }))
    await waitFor(() => expect(printStore.getState().noteId).toBe(id))
  })
})
