import { act, fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { stubMedia } from '../../../tests/media'
import { App } from '../../app/App'
import { createAppStore, initStore } from '../../store/store'
import { MarkdownPreview } from '../editor/MarkdownPreview'
import { phoneStore } from '../phone/phoneStore'

describe('checklists in the Markdown preview', () => {
  it('ticking a box reports which item was ticked', () => {
    const onToggle = vi.fn()
    const src = '# Today\n\n- [ ] milk\n- [x] eggs\n\n```\n- [ ] not a task\n```\n- [ ] bread'
    render(<MarkdownPreview source={src} onToggleTask={onToggle} />)
    const boxes = screen.getAllByRole('checkbox')
    expect(boxes).toHaveLength(3)
    expect(boxes[0]).toBeEnabled()
    fireEvent.click(boxes[2])
    expect(onToggle).toHaveBeenLastCalledWith(src.indexOf('- [ ] bread'))
    expect(boxes[2]).toBeChecked() // shows at once
    fireEvent.click(boxes[1])
    expect(onToggle).toHaveBeenLastCalledWith(src.indexOf('- [x] eggs'))
  })

  it('without a change handler the boxes stay read-only', () => {
    render(<MarkdownPreview source={'- [ ] milk'} />)
    expect(screen.getByRole('checkbox')).toBeDisabled()
  })

  it('each box is labelled by its item text', () => {
    render(<MarkdownPreview source={'- [ ] buy milk'} onToggleTask={() => {}} />)
    expect(screen.getByRole('checkbox', { name: 'buy milk' })).toBeInTheDocument()
  })
})

describe('in the app', () => {
  it.each([
    ['laptop', false],
    ['phone', true],
  ])('ticking a box in preview saves it to the note (%s)', async (_, phone) => {
    const media = stubMedia({ phone, touch: phone })
    const store = initStore(createAppStore())
    const s = () => store.getState()
    const id = s().newNote()
    s().updateContent(id, '- [ ] call mum')
    s().setNoteMode(id, 'markdown')
    if (phone) phoneStore.getState().setPreview(id, true)
    else s().setViewState(id, { previewMode: 'preview' })
    render(<App />)
    fireEvent.click(await screen.findByRole('checkbox', { name: 'call mum' }))
    expect(s().notes[id].content).toBe('- [x] call mum')
    media.restore()
  })

  it('quick ticks in a row all count', async () => {
    const media = stubMedia({ phone: false })
    const store = initStore(createAppStore())
    const s = () => store.getState()
    const id = s().newNote()
    s().updateContent(id, '- [ ] one\n- [ ] two')
    s().setNoteMode(id, 'markdown')
    s().setViewState(id, { previewMode: 'preview' })
    render(<App />)
    const one = await screen.findByRole('checkbox', { name: 'one' })
    const two = screen.getByRole('checkbox', { name: 'two' })
    act(() => {
      fireEvent.click(one)
      fireEvent.click(two)
    })
    expect(s().notes[id].content).toBe('- [x] one\n- [x] two')
    media.restore()
  })
})
