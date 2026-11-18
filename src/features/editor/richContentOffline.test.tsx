import { render, waitFor } from '@testing-library/react'
import { expect, it, vi } from 'vitest'
import { prepareRichContent } from './richContent'

vi.mock('./diagramEngine', () => {
  throw new Error('offline: the diagram code was never downloaded')
})

it('printing and exporting carry on when diagrams can’t load', async () => {
  const extras = await prepareRichContent('```mermaid\ngraph TD; A-->B\n```')
  expect(extras.diagrams?.size ?? 0).toBe(0)
})

it('keeps the test environment able to render', async () => {
  const { container } = render(<p>ok</p>)
  await waitFor(() => expect(container).toHaveTextContent('ok'))
})
