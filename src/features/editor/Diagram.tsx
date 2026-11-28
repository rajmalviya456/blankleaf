import { useContext, useEffect, useRef, useState, useSyncExternalStore } from 'react'
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
  // `loadFailed`: the attempt at which the drawing code itself didn't arrive (offline, or an old
  // tab whose files a newer version replaced). That's no fault of the diagram's.
  const [drawn, setDrawn] = useState<{
    code: string
    svg: string | null
    loadFailed?: number
  } | null>(null)
  const [attempt, setAttempt] = useState(0)
  const retried = useRef(false)
  const box = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (ready) return
    let alive = true
    // Wait for a pause in typing: drawing on every keystroke would be slow.
    const timer = setTimeout(() => {
      void import('./diagramEngine').then(
        (m) =>
          m.renderDiagram(code, dark).then(
            (svg) => alive && setDrawn({ code, svg }),
            () => alive && setDrawn({ code, svg: null }),
          ),
        () => alive && setDrawn({ code, svg: null, loadFailed: attempt }),
      )
    }, 200)
    return () => {
      alive = false
      clearTimeout(timer)
    }
  }, [code, ready, dark, attempt])

  const svg = ready ? ready.get(code) : drawn?.svg
  const failed = ready ? !svg : drawn?.code === code && drawn.svg === null
  const loadFailed = !ready && failed && drawn?.loadFailed !== undefined
  const retrying = loadFailed && drawn?.loadFailed !== attempt

  // Try again gives way to the drawing once it works: keep the focus there, not lost.
  useEffect(() => {
    if (!svg || !retried.current) return
    retried.current = false
    if (document.activeElement === document.body) box.current?.focus()
  }, [svg])

  return (
    <>
      {svg && !failed ? (
        <div
          ref={box}
          role="img"
          aria-label="Diagram"
          className="md-diagram"
          tabIndex={attempt ? -1 : undefined}
          // Sanitized by diagramEngine.
          dangerouslySetInnerHTML={{ __html: svg }}
        />
      ) : (
        <pre>
          <code>{code}</code>
        </pre>
      )}
      {failed && !ready && !loadFailed && (
        <p className="md-diagram-error" role="status">
          This diagram couldn’t be drawn. Check its Mermaid syntax.
        </p>
      )}
      {loadFailed && (
        <p className="md-diagram-error">
          <span role="status">
            {retrying
              ? 'Loading the diagram tools…'
              : 'Couldn’t load the diagram tools. Check your connection, then try again.'}
          </span>{' '}
          <button
            type="button"
            onClick={() => {
              retried.current = true
              setAttempt(attempt + 1)
            }}
            className="h-8 rounded-md border border-border px-3 text-[12.5px] text-fg hover:bg-bg-hover max-sm:h-11 max-sm:text-[14px]"
          >
            Try again
          </button>
        </p>
      )}
    </>
  )
}
