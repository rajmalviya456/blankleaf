import { afterEach, expect, it, vi } from 'vitest'
import { pickFilesToImport } from './actions'

afterEach(() => vi.restoreAllMocks())

it('the import picker accepts code files, not only text and Markdown', () => {
  const click = vi.spyOn(HTMLInputElement.prototype, 'click').mockImplementation(() => {})
  pickFilesToImport()
  const input = click.mock.contexts[0] as HTMLInputElement
  const accept = input.accept.split(',')
  for (const e of ['.json', '.md', '.rs', '.go', '.rb', '.yaml', '.yml', '.ts', '.toml', '.sql'])
    expect(accept).toContain(e)
})
