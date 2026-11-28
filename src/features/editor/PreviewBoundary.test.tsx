import { render, screen } from '@testing-library/react'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { App } from '../../app/App'
import { createAppStore, initStore } from '../../store/store'
import { MarkdownPreview } from './MarkdownPreview'
import { PreviewBoundary } from './PreviewBoundary'

const DEEP = '>'.repeat(3000) + ' x'
const MESSAGE = /couldn’t be shown as formatted text/

// React reports every error a boundary catches; these are expected.
beforeEach(() => void vi.spyOn(console, 'error').mockImplementation(() => {}))
afterEach(() => vi.restoreAllMocks())

function Broken(): never {
  throw new RangeError('Maximum call stack size exceeded')
}

it('shows the plain text when the preview can’t be drawn, and comes back once it’s fixed', () => {
  const { rerender } = render(
    <PreviewBoundary source={'> > deep\nplain words'}>
      <Broken />
    </PreviewBoundary>,
  )
  expect(screen.getByText(MESSAGE)).toBeInTheDocument()
  expect(document.querySelector('pre')).toHaveTextContent('> > deep plain words')
  rerender(
    <PreviewBoundary source="fixed">
      <p>drawn</p>
    </PreviewBoundary>,
  )
  expect(screen.getByText('drawn')).toBeInTheDocument()
  expect(screen.queryByText(MESSAGE)).toBeNull()
})

it('keeps a note nested thousands of levels deep from breaking the render', () => {
  expect(() =>
    render(
      <PreviewBoundary source={DEEP}>
        <MarkdownPreview source={DEEP} />
      </PreviewBoundary>,
    ),
  ).not.toThrow()
  expect(screen.getByText(MESSAGE)).toBeInTheDocument()
})

it('keeps the app running when such a note is open in preview', async () => {
  const store = initStore(createAppStore())
  const id = store.getState().newNote({ content: DEEP })
  store.getState().setLanguage(id, 'markdown')
  store.getState().setViewState(id, { previewMode: 'preview' })
  render(<App />)
  expect(await screen.findByText(MESSAGE)).toBeInTheDocument()
  expect(screen.queryByText('Something went wrong')).toBeNull()
})
