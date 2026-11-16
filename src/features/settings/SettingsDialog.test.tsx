import { act, fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { App } from '../../app/App'
import { createAppStore, initStore } from '../../store/store'

function setup() {
  const store = initStore(createAppStore())
  store.getState().newNote()
  render(<App />)
  return { s: () => store.getState(), user: userEvent.setup() }
}

const open = (s: ReturnType<typeof setup>['s']) => act(() => s().setUi({ settingsOpen: true }))

describe('SettingsDialog', () => {
  afterEach(() => document.documentElement.removeAttribute('style'))

  it('⌘, opens settings', async () => {
    setup()
    fireEvent.keyDown(window, { key: ',', code: 'Comma', metaKey: true })
    expect(await screen.findByRole('dialog', { name: /settings/i })).toBeInTheDocument()
  })

  it('the gear button opens settings', async () => {
    const { user } = setup()
    await user.click(screen.getByRole('button', { name: /^settings$/i }))
    expect(await screen.findByRole('dialog', { name: /settings/i })).toBeInTheDocument()
  })

  it('changing theme to dark sets data-theme=dark', async () => {
    const { s, user } = setup()
    open(s)
    await user.click(await screen.findByRole('radio', { name: 'Dark' }))
    expect(s().settings.theme).toBe('dark')
    expect(document.documentElement.dataset.theme).toBe('dark')
  })

  it('changing editor font size updates CSS var', async () => {
    const { s, user } = setup()
    open(s)
    const slider = await screen.findByRole('slider', { name: /editor font size/i })
    fireEvent.change(slider, { target: { value: '18' } })
    expect(s().settings.editorFontSize).toBe(18)
    expect(document.documentElement.style.getPropertyValue('--editor-font-size')).toBe('18px')
    await user.click(screen.getByRole('button', { name: /increase editor font size/i }))
    expect(s().settings.editorFontSize).toBe(19)
  })

  it('toggles editor options', async () => {
    const { s, user } = setup()
    open(s)
    await user.click(await screen.findByRole('switch', { name: /line numbers/i }))
    expect(s().settings.lineNumbers).toBe(false)
    await user.selectOptions(screen.getByRole('combobox', { name: /tab size/i }), '4')
    expect(s().settings.tabSize).toBe(4)
  })

  it('clear all data button stays disabled until "delete" typed', async () => {
    const { s, user } = setup()
    open(s)
    const button = await screen.findByRole('button', { name: /clear all data/i })
    expect(button).toBeDisabled()
    await user.type(screen.getByRole('textbox', { name: /type delete/i }), 'delet')
    expect(button).toBeDisabled()
    await user.type(screen.getByRole('textbox', { name: /type delete/i }), 'e')
    expect(button).toBeEnabled()
  })
})
