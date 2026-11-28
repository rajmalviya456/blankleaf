/**
 * Format code: Prettier for JavaScript, TypeScript, CSS, SCSS, Less, HTML, YAML and Markdown,
 * and sql-formatter for SQL. Each formatter loads the first time it's used, never at startup.
 * (JSON has its own Format JSON, which keeps big numbers exact.)
 */
import type { LanguageId } from '../../domain/types'
import type { EditorView } from '@codemirror/view'
import { applyToText, TransformError } from './transforms'

type Prettier = { parser: string; plugins: () => Promise<unknown[]> }

const plugin = (p: Promise<{ default?: unknown }>) => p.then((m) => m.default ?? m)
const estree = () => plugin(import('prettier/plugins/estree'))

const PRETTIER: Partial<Record<LanguageId, Prettier>> = {
  javascript: {
    parser: 'babel',
    plugins: () => Promise.all([plugin(import('prettier/plugins/babel')), estree()]),
  },
  // Babel reads TypeScript too, and is a fraction of the size of the TypeScript plugin.
  typescript: {
    parser: 'babel-ts',
    plugins: () => Promise.all([plugin(import('prettier/plugins/babel')), estree()]),
  },
  css: { parser: 'css', plugins: () => Promise.all([plugin(import('prettier/plugins/postcss'))]) },
  scss: {
    parser: 'scss',
    plugins: () => Promise.all([plugin(import('prettier/plugins/postcss'))]),
  },
  less: {
    parser: 'less',
    plugins: () => Promise.all([plugin(import('prettier/plugins/postcss'))]),
  },
  html: {
    parser: 'html',
    // Scripts and styles inside the page get formatted too.
    plugins: () =>
      Promise.all([
        plugin(import('prettier/plugins/html')),
        plugin(import('prettier/plugins/babel')),
        estree(),
        plugin(import('prettier/plugins/postcss')),
      ]),
  },
  yaml: { parser: 'yaml', plugins: () => Promise.all([plugin(import('prettier/plugins/yaml'))]) },
  markdown: {
    parser: 'markdown',
    plugins: () => Promise.all([plugin(import('prettier/plugins/markdown'))]),
  },
}

export const canFormat = (language: LanguageId): boolean =>
  language in PRETTIER || language === 'sql'

/** A parser's error, shortened to its first line ("Unexpected token (2:5)" → "… line 2"). */
function problem(e: unknown): string {
  const first = (e instanceof Error ? e.message : String(e)).split('\n')[0]
  const at = /\((\d+):(\d+)\)\s*$/.exec(first) ?? /line (\d+)/i.exec(first)
  const what = first.replace(/\s*\(\d+:\d+\)\s*$/, '')
  return at ? `${what}, line ${at[1]}` : what
}

/** `indent` is the note's indent unit: spaces, or a tab. */
export async function formatCode(
  text: string,
  language: LanguageId,
  indent = '  ',
): Promise<string> {
  const useTabs = indent.includes('\t')
  const width = useTabs ? 2 : indent.length || 2
  try {
    if (language === 'sql') {
      const { format } = await import('sql-formatter')
      return format(text, { keywordCase: 'upper', tabWidth: width, useTabs })
    }
    const how = PRETTIER[language]
    if (!how) throw new TransformError('This format can’t be formatted yet.')
    const [{ format }, plugins] = await Promise.all([import('prettier/standalone'), how.plugins()])
    return await format(text, {
      parser: how.parser,
      plugins: plugins as never,
      tabWidth: width,
      useTabs,
    })
  } catch (e) {
    if (e instanceof TransformError) throw e
    throw new TransformError(`Couldn’t format: ${problem(e)}`)
  }
}

/** The leading spaces and tabs that all of `lines` with text in them share. */
function sharedIndent(lines: string[]): string {
  const indents = lines.filter((l) => /[^ \t]/.test(l)).map((l) => /^[ \t]*/.exec(l)![0])
  if (!indents.length) return ''
  return indents.reduce((a, b) => {
    let i = 0
    while (i < a.length && a[i] === b[i]) i++
    return a.slice(0, i)
  })
}

/**
 * Format a selection as a piece of the note: the indent its lines share comes off for the
 * formatter and goes back on after, and it ends in a line break only if the selection did.
 * From mid-line, the first line has no indent of its own, so the text is formatted as it is.
 */
async function formatSelection(text: string, language: LanguageId, indent: string) {
  const lines = text.split('\n')
  const base = sharedIndent(lines)
  // Only blank lines can be shorter than the shared indent.
  const inner = lines.map((l) => (l.startsWith(base) ? l.slice(base.length) : '')).join('\n')
  const out = await formatCode(inner, language, indent)
  return out
    .replace(/\n*$/, /\n*$/.exec(text)![0])
    .split('\n')
    .map((l) => (l ? base + l : l))
    .join('\n')
}

/** Format the selection (or the whole note) as `language`; problems become a toast. */
export async function runFormatCode(view: EditorView, language: LanguageId): Promise<void> {
  const selection = view.state.selection.ranges.some((r) => !r.empty)
  try {
    await applyToText(view, (text, indent) =>
      (selection ? formatSelection : formatCode)(text, language, indent),
    )
  } catch (e) {
    const { toast } = await import('../../ui/toast')
    toast(e instanceof TransformError ? e.message : 'Couldn’t format this code.', { tone: 'warn' })
  }
}
