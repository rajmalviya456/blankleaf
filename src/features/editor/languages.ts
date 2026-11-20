/**
 * Lazy CodeMirror language support per note format. Each pack is a separate chunk,
 * so the initial bundle stays small and a format loads the first time it's used.
 */
import { StreamLanguage } from '@codemirror/language'
import type { Extension } from '@codemirror/state'
import { languageMeta } from '../../domain/languages'
import type { LanguageId } from '../../domain/types'
import { logLanguage } from './logLanguage'
// Small, and the toolbar and shortcuts sheet need its list anyway.
import { markdownKeys } from './markdownKeys'

type Loader = () => Promise<Extension>

const legacy = async (pick: () => Promise<Parameters<typeof StreamLanguage.define>[0]>) =>
  StreamLanguage.define(await pick())

const LOADERS: Partial<Record<LanguageId, Loader>> = {
  markdown: async () => {
    const [{ markdown, markdownLanguage }, { languages }, { tableKeys }] = await Promise.all([
      import('@codemirror/lang-markdown'),
      import('@codemirror/language-data'),
      import('./markdownTable'),
    ])
    // GFM (tables, task lists, strikethrough) + highlighting inside ```lang fences,
    // each fence language loading on demand. Tab tidies tables; ⌘B and friends format.
    return [markdown({ base: markdownLanguage, codeLanguages: languages }), tableKeys, markdownKeys]
  },
  log: async () => logLanguage,
  json: async () => {
    const [{ json }, { jsonLint }] = await Promise.all([
      import('@codemirror/lang-json'),
      import('./jsonLint'),
    ])
    return [json(), jsonLint]
  },
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
  scss: async () => (await import('@codemirror/lang-sass')).sass(),
  less: async () => (await import('@codemirror/lang-less')).less(),
  kotlin: () => legacy(async () => (await import('@codemirror/legacy-modes/mode/clike')).kotlin),
  csharp: () => legacy(async () => (await import('@codemirror/legacy-modes/mode/clike')).csharp),
  swift: () => legacy(async () => (await import('@codemirror/legacy-modes/mode/swift')).swift),
  lua: () => legacy(async () => (await import('@codemirror/legacy-modes/mode/lua')).lua),
  perl: () => legacy(async () => (await import('@codemirror/legacy-modes/mode/perl')).perl),
  powershell: () =>
    legacy(async () => (await import('@codemirror/legacy-modes/mode/powershell')).powerShell),
  r: () => legacy(async () => (await import('@codemirror/legacy-modes/mode/r')).r),
  nginx: () => legacy(async () => (await import('@codemirror/legacy-modes/mode/nginx')).nginx),
  ini: () =>
    legacy(async () => (await import('@codemirror/legacy-modes/mode/properties')).properties),
  ruby: () => legacy(async () => (await import('@codemirror/legacy-modes/mode/ruby')).ruby),
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
    // Code notes also get bracket and folding help; loaded with the language, so its
    // autocomplete dependency stays out of the startup download.
    const code = languageMeta(id).kind === 'code'
    p = Promise.all([loader(), code ? import('./codeEditing') : null])
      .then(([ext, help]): Extension => (help ? [ext, help.codeEditing] : ext))
      .catch((e) => {
        cache.delete(id)
        console.error(`Blankleaf: failed to load ${id} highlighting`, e)
        return null
      })
    cache.set(id, p)
  }
  return p
}
