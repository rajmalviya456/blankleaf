import type { LanguageId } from './types'

export type LanguageKind = 'text' | 'code' | 'log'

export interface LanguageMeta {
  id: Exclude<LanguageId, 'auto'>
  label: string
  /** File extension used when exporting. */
  ext: string
  kind: LanguageKind
}

/** Selectable formats, in picker order. */
export const LANGUAGES: readonly LanguageMeta[] = [
  { id: 'plaintext', label: 'Plain text', ext: 'txt', kind: 'text' },
  { id: 'markdown', label: 'Markdown', ext: 'md', kind: 'text' },
  { id: 'log', label: 'Log', ext: 'log', kind: 'log' },
  { id: 'json', label: 'JSON', ext: 'json', kind: 'code' },
  { id: 'javascript', label: 'JavaScript', ext: 'js', kind: 'code' },
  { id: 'typescript', label: 'TypeScript', ext: 'ts', kind: 'code' },
  { id: 'python', label: 'Python', ext: 'py', kind: 'code' },
  { id: 'sql', label: 'SQL', ext: 'sql', kind: 'code' },
  { id: 'html', label: 'HTML', ext: 'html', kind: 'code' },
  { id: 'css', label: 'CSS', ext: 'css', kind: 'code' },
  { id: 'xml', label: 'XML', ext: 'xml', kind: 'code' },
  { id: 'yaml', label: 'YAML', ext: 'yaml', kind: 'code' },
  { id: 'toml', label: 'TOML', ext: 'toml', kind: 'code' },
  { id: 'shell', label: 'Shell', ext: 'sh', kind: 'code' },
  { id: 'dockerfile', label: 'Dockerfile', ext: 'dockerfile', kind: 'code' },
  { id: 'diff', label: 'Diff', ext: 'diff', kind: 'code' },
  { id: 'java', label: 'Java', ext: 'java', kind: 'code' },
  { id: 'cpp', label: 'C / C++', ext: 'cpp', kind: 'code' },
  { id: 'go', label: 'Go', ext: 'go', kind: 'code' },
  { id: 'rust', label: 'Rust', ext: 'rs', kind: 'code' },
  { id: 'php', label: 'PHP', ext: 'php', kind: 'code' },
]

const byId = new Map(LANGUAGES.map((l) => [l.id as LanguageId, l]))

/** Metadata for a language; 'auto' and unknown ids resolve to plain text. */
export function languageMeta(id: LanguageId): LanguageMeta {
  return byId.get(id) ?? LANGUAGES[0]
}

/** Above this size syntax highlighting is switched off to keep typing smooth. */
export const LARGE_DOC_CHARS = 2_000_000

export function isLargeDoc(len: number): boolean {
  return len > LARGE_DOC_CHARS
}
