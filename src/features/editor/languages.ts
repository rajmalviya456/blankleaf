/**
 * Lazy CodeMirror language support per note format. Each pack is a separate chunk,
 * so the initial bundle stays small and a format loads the first time it's used.
 */
import { StreamLanguage } from '@codemirror/language'
import type { Extension } from '@codemirror/state'
import type { LanguageId } from '../../domain/types'
import { logLanguage } from './logLanguage'

type Loader = () => Promise<Extension>

const legacy = async (pick: () => Promise<Parameters<typeof StreamLanguage.define>[0]>) =>
  StreamLanguage.define(await pick())

const LOADERS: Partial<Record<LanguageId, Loader>> = {
  markdown: async () => {
    const [{ markdown, markdownLanguage }, { languages }] = await Promise.all([
      import('@codemirror/lang-markdown'),
      import('@codemirror/language-data'),
    ])
    // GFM (tables, task lists, strikethrough) + highlighting inside ```lang fences,
    // each fence language loading on demand.
    return markdown({ base: markdownLanguage, codeLanguages: languages })
  },
  log: async () => logLanguage,
  json: async () => (await import('@codemirror/lang-json')).json(),
  javascript: async () => (await import('@codemirror/lang-javascript')).javascript({ jsx: true }),
  typescript: async () =>
    (await import('@codemirror/lang-javascript')).javascript({ typescript: true, jsx: true }),
  python: async () => (await import('@codemirror/lang-python')).python(),
  sql: async () => (await import('@codemirror/lang-sql')).sql(),
  html: async () => (await import('@codemirror/lang-html')).html(),
  css: async () => (await import('@codemirror/lang-css')).css(),
  xml: async () => (await import('@codemirror/lang-xml')).xml(),
  yaml: async () => (await import('@codemirror/lang-yaml')).yaml(),
  java: async () => (await import('@codemirror/lang-java')).java(),
  cpp: async () => (await import('@codemirror/lang-cpp')).cpp(),
  go: async () => (await import('@codemirror/lang-go')).go(),
  rust: async () => (await import('@codemirror/lang-rust')).rust(),
  php: async () => (await import('@codemirror/lang-php')).php(),
  shell: () => legacy(async () => (await import('@codemirror/legacy-modes/mode/shell')).shell),
  toml: () => legacy(async () => (await import('@codemirror/legacy-modes/mode/toml')).toml),
  diff: () => legacy(async () => (await import('@codemirror/legacy-modes/mode/diff')).diff),
  dockerfile: () =>
    legacy(async () => (await import('@codemirror/legacy-modes/mode/dockerfile')).dockerFile),
}

const cache = new Map<LanguageId, Promise<Extension | null>>()

/** Language extension for a format, or null for plain text / auto. Cached per format. */
export function loadLanguage(id: LanguageId): Promise<Extension | null> {
  const loader = LOADERS[id]
  if (!loader) return Promise.resolve(null)
  let p = cache.get(id)
  if (!p) {
    p = loader().catch((e) => {
      cache.delete(id)
      console.error(`Notepadz: failed to load ${id} highlighting`, e)
      return null
    })
    cache.set(id, p)
  }
  return p
}
