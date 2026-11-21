import { useContext, useEffect, useState, useSyncExternalStore } from 'react'
import { ReadyDiagrams } from './readyDiagrams'

const watchTheme = (cb: () => void) => {
  const observer = new MutationObserver(cb)
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] })
  return () => observer.disconnect()
}
const isDark = () => document.documentElement.dataset.theme === 'dark'

/** A Mermaid diagram. Shows its code until drawn, and if it can't be drawn. */
export function Diagram({ code }: { code: string }) {
  const ready = useContext(ReadyDiagrams)
  const dark = useSyncExternalStore(watchTheme, isDark, () => false)
  const [drawn, setDrawn] = useState<{ code: string; svg: string | null } | null>(null)

  useEffect(() => {
    if (ready) return
    let alive = true
    // Wait for a pause in typing: drawing on every keystroke would be slow.
    const timer = setTimeout(() => {
      void import('./diagramEngine')
        .then((m) => m.renderDiagram(code, dark))
        .then(
          (svg) => alive && setDrawn({ code, svg }),
          () => alive && setDrawn({ code, svg: null }),
        )
    }, 200)
    return () => {
      alive = false
      clearTimeout(timer)
    }
  }, [code, ready, dark])

  const svg = ready ? ready.get(code) : drawn?.svg
  const failed = ready ? !svg : drawn?.code === code && drawn.svg === null
  return (
    <>
      {svg && !failed ? (
        <div
          role="img"
          aria-label="Diagram"
          className="md-diagram"
          // Sanitized by diagramEngine.
          dangerouslySetInnerHTML={{ __html: svg }}
        />
      ) : (
        <pre>
          <code>{code}</code>
        </pre>
      )}
      {failed && !ready && (
        <p className="md-diagram-error" role="status">
          This diagram couldn’t be drawn. Check its Mermaid syntax.
        </p>
      )}
    </>
  )
}
