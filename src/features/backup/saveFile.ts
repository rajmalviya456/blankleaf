/**
 * Save text as a file the way a desktop app does. Browsers with a real Save dialog (Chrome,
 * Edge) ask where to put it; the others (Safari, Firefox) use their normal download flow.
 */
import { downloadBlob } from './download'

export type SaveResult = { outcome: 'saved' | 'cancelled' | 'downloaded'; name: string }

interface SaveFileHandle {
  name: string
  createWritable(): Promise<{ write(data: Blob): Promise<void>; close(): Promise<void> }>
}
type SaveFilePicker = (options: {
  suggestedName: string
  types?: { description: string; accept: Record<string, string[]> }[]
}) => Promise<SaveFileHandle>

const isAbort = (e: unknown) => e instanceof DOMException && e.name === 'AbortError'

/** A Save dialog is already open: a second Cmd/Ctrl+S waits for it rather than downloading. */
let dialogOpen = false

export async function saveTextFile(name: string, mime: string, text: string): Promise<SaveResult> {
  const blob = new Blob([text], { type: mime })
  const picker = (window as unknown as { showSaveFilePicker?: SaveFilePicker }).showSaveFilePicker
  if (picker && dialogOpen) return { outcome: 'cancelled', name }
  if (picker) {
    dialogOpen = true
    // The dialog takes a bare type ("text/markdown", no charset) and a short ".ext".
    const ext = /\.[A-Za-z0-9+-]{1,16}$/.exec(name)?.[0]
    const types = ext && [{ description: 'Note', accept: { [mime.split(';')[0]]: [ext] } }]
    try {
      const handle = await picker.call(window, { suggestedName: name, ...(types && { types }) })
      const file = await handle.createWritable()
      await file.write(blob)
      await file.close()
      return { outcome: 'saved', name: handle.name }
    } catch (e) {
      if (isAbort(e)) return { outcome: 'cancelled', name }
      // The dialog isn't allowed here, or the write failed: fall back to a download.
    } finally {
      dialogOpen = false
    }
  }
  downloadBlob(name, blob)
  return { outcome: 'downloaded', name }
}
