import type { LanguageId } from './types'

export type LanguageKind = 'text' | 'code' | 'log'
export type LanguageGroup = 'text' | 'data' | 'code'

export interface LanguageMeta {
  id: Exclude<LanguageId, 'auto'>
  label: string
  /** File extension used when exporting. */
  ext: string
  kind: LanguageKind
  /** Section in the format picker. */
  group: LanguageGroup
}

/** Selectable formats, in picker order. */
export const LANGUAGES: readonly LanguageMeta[] = [
  { id: 'plaintext', label: 'Plain text', ext: 'txt', kind: 'text', group: 'text' },
  { id: 'markdown', label: 'Markdown', ext: 'md', kind: 'text', group: 'text' },
  { id: 'log', label: 'Log', ext: 'log', kind: 'log', group: 'text' },
  { id: 'json', label: 'JSON', ext: 'json', kind: 'code', group: 'data' },
  { id: 'yaml', label: 'YAML', ext: 'yaml', kind: 'code', group: 'data' },
  { id: 'toml', label: 'TOML', ext: 'toml', kind: 'code', group: 'data' },
  { id: 'xml', label: 'XML', ext: 'xml', kind: 'code', group: 'data' },
  { id: 'dockerfile', label: 'Dockerfile', ext: 'dockerfile', kind: 'code', group: 'data' },
  { id: 'diff', label: 'Diff', ext: 'diff', kind: 'code', group: 'data' },
  { id: 'javascript', label: 'JavaScript', ext: 'js', kind: 'code', group: 'code' },
  { id: 'typescript', label: 'TypeScript', ext: 'ts', kind: 'code', group: 'code' },
  { id: 'python', label: 'Python', ext: 'py', kind: 'code', group: 'code' },
  { id: 'sql', label: 'SQL', ext: 'sql', kind: 'code', group: 'code' },
  { id: 'html', label: 'HTML', ext: 'html', kind: 'code', group: 'code' },
  { id: 'css', label: 'CSS', ext: 'css', kind: 'code', group: 'code' },
  { id: 'shell', label: 'Shell', ext: 'sh', kind: 'code', group: 'code' },
  { id: 'java', label: 'Java', ext: 'java', kind: 'code', group: 'code' },
  { id: 'cpp', label: 'C / C++', ext: 'cpp', kind: 'code', group: 'code' },
  { id: 'go', label: 'Go', ext: 'go', kind: 'code', group: 'code' },
  { id: 'rust', label: 'Rust', ext: 'rs', kind: 'code', group: 'code' },
  { id: 'php', label: 'PHP', ext: 'php', kind: 'code', group: 'code' },
  { id: 'ruby', label: 'Ruby', ext: 'rb', kind: 'code', group: 'code' },
]

export const LANGUAGE_GROUPS: readonly { id: LanguageGroup; label: string }[] = [
  { id: 'text', label: 'Text' },
  { id: 'data', label: 'Data & config' },
  { id: 'code', label: 'Code' },
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
