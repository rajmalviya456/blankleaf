import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { COMMANDS } from '../../commands/registry'
import { createAppStore, initStore } from '../../store/store'
import { AboutDialog } from './AboutDialog'
import { WhatsNewDialog } from './WhatsNewDialog'

describe('WhatsNewDialog', () => {
  it('shows the changelog shipped with the app', async () => {
    const store = initStore(createAppStore())
    store.getState().setUi({ whatsNewOpen: true })
    render(<WhatsNewDialog />)
    expect(screen.getByRole('dialog', { name: 'What’s new' })).toBeInTheDocument()
    expect(await screen.findByRole('heading', { name: /1\.0\.0/ })).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'Changelog' })).toBeNull()
  })

  it('opens from About and from the palette', async () => {
    const user = userEvent.setup()
    const store = initStore(createAppStore())
    store.getState().setUi({ aboutOpen: true })
    render(<AboutDialog />)
    await user.click(screen.getByRole('button', { name: /what.s new/i }))
    expect(store.getState().ui).toMatchObject({ aboutOpen: false, whatsNewOpen: true })

    store.getState().setUi({ whatsNewOpen: false })
    COMMANDS.find((c) => c.id === 'app.whatsNew')!.run({ store })
    expect(store.getState().ui.whatsNewOpen).toBe(true)
  })
})
