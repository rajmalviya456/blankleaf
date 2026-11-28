import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { expect, it, vi } from 'vitest'
import { MarkdownPreview } from './MarkdownPreview'
import { prepareRichContent } from './richContent'

const network = vi.hoisted(() => ({ online: false }))
vi.mock('./diagramEngine', () => {
  if (!network.online) throw new Error('offline: the diagram code was never downloaded')
  return { renderDiagram: async () => '<svg data-testid="drawn"><text>A</text></svg>' }
})

it('printing and exporting carry on when diagrams can’t load', async () => {
  const extras = await prepareRichContent('```mermaid\ngraph TD; A-->B\n```')
  expect(extras.diagrams?.size ?? 0).toBe(0)
})

it('keeps the test environment able to render', async () => {
  const { container } = render(<p>ok</p>)
  await waitFor(() => expect(container).toHaveTextContent('ok'))
})

it('says the diagram tools didn’t load, not that a valid diagram is wrong, and tries again', async () => {
  render(<MarkdownPreview source={'```mermaid\ngraph TD; A-->B\n```'} />)
  const status = await screen.findByRole('status')
  expect(status).toHaveTextContent(/couldn’t load the diagram tools/i)
  expect(status).not.toHaveTextContent(/Mermaid syntax/)
  expect(screen.getByText('graph TD; A-->B')).toBeInTheDocument()

  // Still offline: the message shows it tried.
  fireEvent.click(screen.getByRole('button', { name: 'Try again' }))
  expect(status).toHaveTextContent(/loading the diagram tools/i)
  await waitFor(() => expect(status).toHaveTextContent(/couldn’t load the diagram tools/i))

  network.online = true
  const retry = screen.getByRole('button', { name: 'Try again' })
  retry.focus()
  fireEvent.click(retry)
  const diagram = await screen.findByRole('img', { name: 'Diagram' })
  expect(screen.queryByRole('button', { name: 'Try again' })).toBeNull()
  // The button went with the message: the focus moves to the drawing instead of being lost.
  expect(diagram).toHaveFocus()
})
