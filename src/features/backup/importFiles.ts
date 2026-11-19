import { newNoteDraft } from '../../domain/defaults'
import { LANGUAGES, languageMeta } from '../../domain/languages'
import { documentTitle } from '../../domain/title'
import type { LanguageId, Note, Settings } from '../../domain/types'

const EXT_ALIASES: Record<string, LanguageId> = {
  markdown: 'markdown',
  mjs: 'javascript',
  cjs: 'javascript',
  jsx: 'javascript',
  tsx: 'typescript',
  yml: 'yaml',
  bash: 'shell',
  zsh: 'shell',
  htm: 'html',
  c: 'cpp',
  h: 'cpp',
  hpp: 'cpp',
  cc: 'cpp',
  patch: 'diff',
  text: 'plaintext',
  rake: 'ruby',
  gemspec: 'ruby',
  ru: 'ruby',
}

function languageForFile(name: string): LanguageId {
  if (/^dockerfile$/i.test(name)) return 'dockerfile'
  if (/^(gemfile|rakefile)$/i.test(name)) return 'ruby'
  const ext = /\.([a-z0-9]+)$/i.exec(name)?.[1]?.toLowerCase()
  if (!ext) return 'auto'
  return LANGUAGES.find((l) => l.ext === ext)?.id ?? EXT_ALIASES[ext] ?? 'auto'
}

/** A dropped or picked text file becomes a new note named after the file. */
export function fileToNote(name: string, text: string, now: number, settings: Settings): Note {
  const language = languageForFile(name)
  const draft = newNoteDraft(now, settings)
  const kind = language === 'auto' ? null : languageMeta(language).kind
  return {
    ...draft,
    title: name.replace(/\.[^.]+$/, '') || name,
    content: text,
    language,
    mode: language === 'markdown' ? 'markdown' : 'plain',
    wrap: kind ? kind === 'text' : draft.wrap,
  }
}

const MIME: Record<string, string> = {
  md: 'text/markdown',
  json: 'application/json',
  html: 'text/html',
  css: 'text/css',
  xml: 'application/xml',
  js: 'text/javascript',
}

/** The note's title, safe to use as a file name. */
export function noteFileBase(note: Note): string {
  return (
    documentTitle(note)
      .replace(/[/\\:*?"<>|]/g, '-')
      .trim() || 'Untitled'
  )
}

/** File name, type and text for exporting a single note. */
export function noteExportFile(note: Note): { name: string; mime: string; text: string } {
  const lang = note.language === 'auto' && note.mode === 'markdown' ? 'markdown' : note.language
  const ext = languageMeta(lang).ext
  return {
    name: `${noteFileBase(note)}.${ext}`,
    mime: `${MIME[ext] ?? 'text/plain'};charset=utf-8`,
    text: note.content,
  }
}

/** Heuristic: a NUL byte in the first 8KB means this isn't a text file. */
export function isProbablyBinary(text: string): boolean {
  return text.slice(0, 8192).includes('\0')
}
