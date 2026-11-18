import { FileDown } from 'lucide-react'
import { useEffect, useState } from 'react'
import { importFileList } from './actions'

const hasFiles = (e: DragEvent) => Array.from(e.dataTransfer?.types ?? []).includes('Files')

/** Drop files anywhere on the window to import them; shows an overlay while dragging. */
export function DropZone() {
  const [active, setActive] = useState(false)

  useEffect(() => {
    let depth = 0
    const enter = (e: DragEvent) => {
      if (!hasFiles(e)) return
      depth++
      setActive(true)
    }
    const over = (e: DragEvent) => {
      if (hasFiles(e)) e.preventDefault()
    }
    const leave = (e: DragEvent) => {
      if (!hasFiles(e)) return
      depth = Math.max(0, depth - 1)
      if (!depth) setActive(false)
    }
    const drop = (e: DragEvent) => {
      if (!hasFiles(e)) return
      e.preventDefault()
      depth = 0
      setActive(false)
      void importFileList(Array.from(e.dataTransfer?.files ?? []))
    }
    window.addEventListener('dragenter', enter)
    window.addEventListener('dragover', over)
    window.addEventListener('dragleave', leave)
    window.addEventListener('drop', drop)
    return () => {
      window.removeEventListener('dragenter', enter)
      window.removeEventListener('dragover', over)
      window.removeEventListener('dragleave', leave)
      window.removeEventListener('drop', drop)
    }
  }, [])

  if (!active) return null
  return (
    <div className="pointer-events-none fixed inset-3 z-[70] grid place-items-center rounded-2xl border-2 border-dashed border-accent bg-bg/80 backdrop-blur-sm">
      <div className="flex flex-col items-center gap-2 text-fg">
        <FileDown size={28} className="text-accent" />
        <p className="text-sm font-medium">Drop to import</p>
        <p className="text-[12px] text-fg-muted">
          Text files open as notes · Blankleaf backups can be merged
        </p>
      </div>
    </div>
  )
}
