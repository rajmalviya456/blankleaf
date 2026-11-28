import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import * as download from './download'
import { saveTextFile } from './saveFile'

type Picker = (options: Record<string, unknown>) => Promise<unknown>
const win = window as unknown as { showSaveFilePicker?: Picker }

let downloaded: ReturnType<typeof vi.spyOn>
beforeEach(() => {
  downloaded = vi.spyOn(download, 'downloadBlob').mockImplementation(() => {})
})
afterEach(() => {
  vi.restoreAllMocks()
  delete win.showSaveFilePicker
})

function fakePicker(name = 'Plan.md') {
  const written: Blob[] = []
  const close = vi.fn().mockResolvedValue(undefined)
  const picker = vi.fn<Picker>().mockResolvedValue({
    name,
    createWritable: async () => ({
      write: async (b: Blob) => void written.push(b),
      close,
    }),
  })
  win.showSaveFilePicker = picker
  return { picker, written, close }
}

describe('saveTextFile', () => {
  it('asks where to save when the browser has a Save dialog, and writes the text there', async () => {
    const { picker, written, close } = fakePicker('Renamed.md')
    const res = await saveTextFile('Plan.md', 'text/markdown;charset=utf-8', '# Plan')
    expect(res).toEqual({ outcome: 'saved', name: 'Renamed.md' })
    expect(picker).toHaveBeenCalledWith({
      suggestedName: 'Plan.md',
      types: [{ description: 'Note', accept: { 'text/markdown': ['.md'] } }],
    })
    expect(await written[0].text()).toBe('# Plan')
    expect(close).toHaveBeenCalled()
    expect(downloaded).not.toHaveBeenCalled()
  })

  it('offers no file type for a name without a usable extension', async () => {
    const { picker } = fakePicker('Makefile')
    await saveTextFile('Makefile', 'text/plain;charset=utf-8', 'all:')
    expect(picker).toHaveBeenCalledWith({ suggestedName: 'Makefile' })
  })

  it('does nothing more when the Save dialog is cancelled', async () => {
    win.showSaveFilePicker = vi.fn<Picker>().mockRejectedValue(new DOMException('no', 'AbortError'))
    const res = await saveTextFile('Plan.md', 'text/markdown;charset=utf-8', '# Plan')
    expect(res.outcome).toBe('cancelled')
    expect(downloaded).not.toHaveBeenCalled()
  })

  it('downloads the file where there is no Save dialog (Safari, Firefox)', async () => {
    const res = await saveTextFile('Plan.md', 'text/markdown;charset=utf-8', '# Plan')
    expect(res).toEqual({ outcome: 'downloaded', name: 'Plan.md' })
    expect(downloaded.mock.calls[0][0]).toBe('Plan.md')
    expect(await (downloaded.mock.calls[0][1] as Blob).text()).toBe('# Plan')
  })

  it('downloads instead when the Save dialog can’t be used', async () => {
    win.showSaveFilePicker = vi
      .fn<Picker>()
      .mockRejectedValue(new DOMException('blocked', 'SecurityError'))
    const res = await saveTextFile('notes.txt', 'text/plain;charset=utf-8', 'hi')
    expect(res.outcome).toBe('downloaded')
    expect(downloaded).toHaveBeenCalledTimes(1)
  })
})
