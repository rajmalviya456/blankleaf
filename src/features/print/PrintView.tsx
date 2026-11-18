/**
 * Print / save as PDF: renders one note on its own, outside the app, and opens the browser's
 * print dialog (which also offers "Save as PDF"). Print styles live in index.css.
 */
import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { useStore } from 'zustand'
import { documentTitle } from '../../domain/title'
import { useAppStore } from '../../store/store'
import { MarkdownPreview } from '../editor/MarkdownPreview'
import { prepareRichContent, type RichExtras } from '../editor/richContent'
import { printStore } from './printStore'

/** Opens the print dialog once the note is on the page, and tidies up afterwards. */
function PrintNow({ title }: { title: string }) {
  useEffect(() => {
    const previous = document.title
    // Browsers suggest the page title as the PDF's file name.
    document.title = title
    const finish = () => printStore.getState().close()
    window.addEventListener('afterprint', finish)
    // Some phones never report "afterprint": the next tap in the app ends printing instead.
    window.addEventListener('pointerdown', finish)
    let second = 0
    const first = requestAnimationFrame(() => {
      second = requestAnimationFrame(() => window.print())
    })
    return () => {
      cancelAnimationFrame(first)
      cancelAnimationFrame(second)
      window.removeEventListener('afterprint', finish)
      window.removeEventListener('pointerdown', finish)
      document.title = previous
    }
  }, [title])
  return null
}

export function PrintView() {
  const noteId = useStore(printStore, (s) => s.noteId)
  const note = useAppStore((s) => (noteId ? s.notes[noteId] : undefined))
  const markdown = note?.mode === 'markdown' ? note.content : null
  // Math and diagrams are drawn first, so the printout never shows them half-finished.
  const [prepared, setPrepared] = useState<{ source: string; extras: RichExtras } | null>(null)
  useEffect(() => {
    if (markdown === null) return
    let alive = true
    void prepareRichContent(markdown).then(
      (extras) => alive && setPrepared({ source: markdown, extras }),
    )
    return () => {
      alive = false
    }
  }, [markdown])
  if (!note) return null
  const extras = prepared?.source === markdown ? prepared?.extras : undefined
  if (markdown !== null && !extras) return null
  const title = documentTitle(note)
  return createPortal(
    <div id="print-root">
      {note.mode === 'markdown' ? (
        <MarkdownPreview source={note.content} extras={extras} />
      ) : (
        <>
          <h1 className="print-title">{title}</h1>
          <pre className="print-text">{note.content}</pre>
        </>
      )}
      <PrintNow title={title} />
    </div>,
    document.body,
  )
}
