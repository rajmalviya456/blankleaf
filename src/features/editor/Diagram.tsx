import { createContext, useContext, useEffect, useState } from 'react'

/** Ready-made drawings for static copies (print, export). */
export const ReadyDiagrams = createContext<Map<string, string> | undefined>(undefined)

/** A Mermaid diagram. Shows its code until drawn, and if it can't be drawn. */
export function Diagram({ code }: { code: string }) {
  const ready = useContext(ReadyDiagrams)
  const [drawn, setDrawn] = useState<{ code: string; svg: string | null } | null>(null)

  useEffect(() => {
    if (ready) return
    let alive = true
    // Wait for a pause in typing: drawing on every keystroke would be slow.
    const timer = setTimeout(() => {
      const dark = document.documentElement.dataset.theme === 'dark'
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
  }, [code, ready])

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
