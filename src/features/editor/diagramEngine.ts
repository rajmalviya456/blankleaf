/**
 * Draws Mermaid diagrams. Notes can come from other people through share links, so diagrams run
 * in Mermaid's strict mode and the resulting SVG is sanitized again before it reaches the page.
 */
import mermaid from 'mermaid'
import { cleanDiagramSvg, withoutOutsideImages } from './diagramSvg'

let queue: Promise<unknown> = Promise.resolve()
let count = 0

/** Mermaid can only draw one diagram at a time, so requests wait their turn. */
export function renderDiagram(code: string, dark = false): Promise<string> {
  const run = queue.then(async () => {
    mermaid.initialize({
      startOnLoad: false,
      securityLevel: 'strict',
      // A diagram's own settings can't change these: they could load outside styles.
      secure: [
        'secure',
        'securityLevel',
        'startOnLoad',
        'maxTextSize',
        'suppressErrorRendering',
        'maxEdges',
        'themeCSS',
        'themeVariables',
        'fontFamily',
        'altFontFamily',
      ],
      suppressErrorRendering: true,
      theme: dark ? 'dark' : 'default',
      htmlLabels: false,
      flowchart: { htmlLabels: false },
    })
    const id = `np-diagram-${++count}`
    try {
      const { svg } = await mermaid.render(id, withoutOutsideImages(code))
      return cleanDiagramSvg(svg)
    } finally {
      document.getElementById(id)?.remove()
      document.getElementById(`d${id}`)?.remove()
    }
  })
  queue = run.catch(() => {})
  return run
}
