import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Rail } from '../../app/layout/Rail'
import { COMMANDS } from '../../commands/registry'
import { createAppStore, initStore } from '../../store/store'
import { AboutDialog } from './AboutDialog'

function setup() {
  const store = initStore(createAppStore())
  store.getState().setUi({ aboutOpen: true })
  render(<AboutDialog />)
  return { store, s: () => store.getState() }
}

describe('AboutDialog', () => {
  it('shows the name, version and what makes the app private', () => {
    setup()
    const dialog = screen.getByRole('dialog', { name: 'About Blankleaf' })
    expect(dialog).toHaveTextContent(`Version ${__APP_VERSION__}`)
    expect(dialog).toHaveTextContent(/stored only in this browser/i)
  })

  it('links to the source and issue tracker', () => {
    setup()
    const href = (name: RegExp) => screen.getByRole('link', { name }).getAttribute('href')
    expect(href(/source code/i)).toBe('https://github.com/rajmalviya456/blankleaf')
    expect(href(/report a problem/i)).toBe('https://github.com/rajmalviya456/blankleaf/issues/new')
  })

  it('opens the keyboard shortcuts from the dialog', async () => {
    const user = userEvent.setup()
    const { s } = setup()
    await user.click(screen.getByRole('button', { name: /keyboard shortcuts/i }))
    expect(s().ui).toMatchObject({ aboutOpen: false, shortcutsOpen: true })
  })
})

describe('opening About', () => {
  it('has a palette command', () => {
    const store = initStore(createAppStore())
    COMMANDS.find((c) => c.id === 'app.about')!.run({ store })
    expect(store.getState().ui.aboutOpen).toBe(true)
  })

  it('has a button in the rail', async () => {
    const user = userEvent.setup()
    const store = initStore(createAppStore())
    render(<Rail />)
    await user.click(screen.getByRole('button', { name: 'About Blankleaf' }))
    expect(store.getState().ui.aboutOpen).toBe(true)
  })
})
