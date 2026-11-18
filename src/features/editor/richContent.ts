/** Math and diagrams load only for notes that use them. */
import type { Code, Root } from 'mdast'
import remarkParse from 'remark-parse'
import { unified, type PluggableList } from 'unified'

export interface MathPlugins {
  remark: PluggableList
  rehype: PluggableList
}

/** Everything a static copy (print, export) needs up front, instead of loading as it appears. */
export interface RichExtras {
  math?: MathPlugins
  /** Finished drawings, by their Mermaid source. */
  diagrams?: Map<string, string>
}

export const needsMath = (source: string) => /\$\$|^\s*(```|~~~)\s*math\b/m.test(source)
export const needsDiagrams = (source: string) => /^\s*(```|~~~)\s*mermaid\b/m.test(source)

export async function loadMath(): Promise<MathPlugins> {
  const m = await import('./mathPlugins')
  return { remark: m.remarkMathPlugins, rehype: m.rehypeMathPlugins }
}

function diagramSources(source: string): string[] {
  const out: string[] = []
  const walk = (node: Root | Root['children'][number]) => {
    if (node.type === 'code' && (node as Code).lang === 'mermaid') out.push((node as Code).value)
    if ('children' in node) node.children.forEach(walk)
  }
  walk(unified().use(remarkParse).parse(source))
  return out
}

/** Prepare a note for printing or exporting. A diagram that can't be drawn stays as its code. */
export async function prepareRichContent(source: string): Promise<RichExtras> {
  const extras: RichExtras = {}
  if (needsMath(source)) extras.math = await loadMath()
  if (needsDiagrams(source)) {
    const { renderDiagram } = await import('./diagramEngine')
    extras.diagrams = new Map()
    for (const code of diagramSources(source)) {
      try {
        extras.diagrams.set(code, await renderDiagram(code))
      } catch {
        // Shown as code instead.
      }
    }
  }
  return extras
}
