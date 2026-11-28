/**
 * The recipient's page for a share link, on a React root of its own: the notes database and the
 * app's store stay closed until the recipient chooses Save or Close, which hand over to the app.
 */
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import type { Note } from '../../domain/types'
import { downloadText } from '../backup/download'
import { pickTransport } from './pickTransport'
import { forgetShare, type ShareEntry } from './shareEntry'
import { ShareErrorBoundary } from './ShareErrorBoundary'
import { BrokenShareLink, ShareFailed, ShareView } from './ShareView'
import type { ShareTransport } from './transport'

/** Show the share page in `el`. Returns a function that removes it (for tests). */
export function showSharePage(
  el: HTMLElement,
  entry: ShareEntry,
  openApp: (addNote?: Partial<Note>) => void,
  transport: ShareTransport = pickTransport(),
): () => void {
  const root = createRoot(el)
  let shown = true
  const remove = () => {
    if (shown) root.unmount()
    shown = false
  }
  // Done with the share page: from here on a reload opens the notepad.
  const handOver = (addNote?: Partial<Note>) => {
    forgetShare()
    remove()
    openApp(addNote)
  }
  const close = () => handOver()
  root.render(
    <StrictMode>
      <ShareErrorBoundary fallback={<ShareFailed onClose={close} />}>
        {entry.kind === 'broken' ? (
          <BrokenShareLink onClose={close} />
        ) : (
          <ShareView
            parts={entry.parts}
            transport={transport}
            onSave={(n) => handOver(n)}
            onClose={close}
            onDownload={(f) => downloadText(f.name, f.mime, f.text)}
            onEnded={forgetShare}
          />
        )}
      </ShareErrorBoundary>
    </StrictMode>,
  )
  return remove
}
