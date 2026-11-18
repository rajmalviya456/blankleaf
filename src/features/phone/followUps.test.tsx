import { act, render, screen, waitFor } from '@testing-library/react'
import { useState } from 'react'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { stubMedia } from '../../../tests/media'
import { App } from '../../app/App'
import { createAppStore, initStore } from '../../store/store'
import { ConfirmDialog } from '../../ui/ConfirmDialog'
import { phoneStore } from './phoneStore'

let media: ReturnType<typeof stubMedia>
beforeEach(() => phoneStore.setState({ stack: [], previewByTab: {}, librarySection: 'notes' }))
afterEach(() => media?.restore())
const settle = () => act(() => new Promise((r) => setTimeout(r, 30)))
const back = async () => {
  await act(async () => history.back())
  await settle()
}

function setup() {
  media = stubMedia({ phone: true, touch: true })
  const store = initStore(createAppStore())
  const s = () => store.getState()
  const id = s().newNote()
  s().updateContent(id, 'alpha')
  return { s, id, store }
}

let closedByConfirm = 0
function ConfirmHarness() {
  const [open, setOpen] = useState(true)
  return (
    <ConfirmDialog
      open={open}
      onOpenChange={(o) => {
        if (!o) closedByConfirm++
        setOpen(o)
      }}
      title="Delete permanently?"
      description="Gone for good."
      confirmLabel="Delete"
      onConfirm={() => {}}
      danger
    />
  )
}

describe('#5 Back on a confirm dialog', () => {
  it('closes the confirm instead of leaving the page', async () => {
    setup()
    closedByConfirm = 0
    render(
      <>
        <App />
        <ConfirmHarness />
      </>,
    )
    await screen.findByRole('alertdialog', { name: 'Delete permanently?' })
    expect(phoneStore.getState().stack).toHaveLength(1)
    await back()
    expect(screen.queryByRole('alertdialog')).toBeNull()
    expect(closedByConfirm).toBe(1)
    expect(phoneStore.getState().stack).toEqual([])
  })

  it('stays off the Back stack on laptops', async () => {
    media = stubMedia({ phone: false })
    initStore(createAppStore())
    render(<ConfirmHarness />)
    await screen.findByRole('alertdialog')
    expect(phoneStore.getState().stack).toEqual([])
  })
})

describe('#6 stale history entries after a reload', () => {
  it('drops the entries left over from before the reload', async () => {
    setup()
    history.replaceState(null, '')
    history.pushState({ npOverlay: 1 }, '')
    history.pushState({ npOverlay: 2 }, '')
    render(<App />)
    await waitFor(() => expect(history.state?.npOverlay).toBeUndefined())
  })
})

describe('#7 hidden sheets leave the Back stack', () => {
  it('a tab actions sheet whose note is trashed comes off the stack', async () => {
    const { s, id } = setup()
    render(<App />)
    act(() => phoneStore.getState().open({ kind: 'tabActions', noteId: id }))
    await waitFor(() => expect(phoneStore.getState().stack).toHaveLength(1))
    act(() => s().trashNote(id))
    await waitFor(() => expect(phoneStore.getState().stack).toEqual([]))
  })

  it('the shares sheet comes off the stack when nothing is shared', async () => {
    setup()
    render(<App />)
    act(() => phoneStore.getState().open('shares'))
    await waitFor(() => expect(phoneStore.getState().stack).toEqual([]))
  })
})
