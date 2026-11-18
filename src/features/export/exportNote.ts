/** Export one note as a web page or Word document. The converters load only when used. */
import { getStore } from '../../store/store'
import { toast } from '../../ui/toast'
import { downloadBlob } from '../backup/download'
import { noteFileBase } from '../backup/importFiles'

export type ExportFormat = 'html' | 'docx'

const NAMES: Record<ExportFormat, string> = { html: 'web page', docx: 'Word document' }

export async function exportNoteAs(id: string, format: ExportFormat): Promise<void> {
  const note = getStore().getState().notes[id]
  if (!note) return
  try {
    const blob =
      format === 'html'
        ? new Blob([await (await import('./noteHtml')).noteToHtml(note)], {
            type: 'text/html;charset=utf-8',
          })
        : await (await import('./noteDocx')).noteToDocx(note)
    downloadBlob(`${noteFileBase(note)}.${format}`, blob)
  } catch (e) {
    console.error(`Blankleaf: could not export ${format}`, e)
    toast(`Couldn’t create the ${NAMES[format]}. Please try again.`, { tone: 'error' })
  }
}
