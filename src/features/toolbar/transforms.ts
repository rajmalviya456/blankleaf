/**
 * Text and developer tools: JSON, YAML, Base64 and URL encoding. Each acts on the selection,
 * or on the whole note when nothing is selected, as one undoable edit.
 */
import type { EditorView } from '@codemirror/view'

export class TransformError extends Error {}

const why = (e: unknown) => (e instanceof Error ? e.message.split('\n')[0] : String(e))

function parseJson(text: string): unknown {
  try {
    return JSON.parse(text)
  } catch (e) {
    throw new TransformError(`Not valid JSON: ${why(e)}`)
  }
}

async function yaml() {
  return import('yaml')
}

function toBase64(text: string): string {
  let bin = ''
  for (const b of new TextEncoder().encode(text)) bin += String.fromCharCode(b)
  return btoa(bin)
}

function fromBase64(text: string): string {
  const clean = text.replace(/\s+/g, '').replace(/-/g, '+').replace(/_/g, '/')
  try {
    const bin = atob(clean + '='.repeat((4 - (clean.length % 4)) % 4))
    const bytes = Uint8Array.from(bin, (c) => c.charCodeAt(0))
    return new TextDecoder('utf-8', { fatal: true }).decode(bytes)
  } catch {
    throw new TransformError('Not valid Base64 text.')
  }
}

export const TRANSFORMS = {
  'json.format': {
    label: 'Format JSON',
    run: (t: string) => JSON.stringify(parseJson(t), null, 2),
  },
  'json.minify': { label: 'Minify JSON', run: (t: string) => JSON.stringify(parseJson(t)) },
  'json.toYaml': {
    label: 'JSON → YAML',
    run: async (t: string) => (await yaml()).stringify(parseJson(t)),
  },
  'yaml.toJson': {
    label: 'YAML → JSON',
    run: async (t: string) => {
      const { parse } = await yaml()
      let data: unknown
      try {
        data = parse(t)
      } catch (e) {
        throw new TransformError(`Not valid YAML: ${why(e)}`)
      }
      return JSON.stringify(data, null, 2)
    },
  },
  'base64.encode': { label: 'Base64 encode', run: toBase64 },
  'base64.decode': { label: 'Base64 decode', run: fromBase64 },
  'url.encode': { label: 'URL encode', run: (t: string) => encodeURIComponent(t) },
  'url.decode': {
    label: 'URL decode',
    run: (t: string) => {
      try {
        return decodeURIComponent(t)
      } catch {
        throw new TransformError('Not valid URL encoding.')
      }
    },
  },
} satisfies Record<string, { label: string; run(text: string): string | Promise<string> }>

export type TransformId = keyof typeof TRANSFORMS
export const TRANSFORM_IDS = Object.keys(TRANSFORMS) as TransformId[]

/**
 * Apply a transform to each selected range (or the whole note). Throws a TransformError with a
 * readable message when the text can't be transformed; the note is then left untouched.
 */
export async function applyTransform(view: EditorView, id: TransformId): Promise<void> {
  const { state } = view
  const ranges = state.selection.ranges.filter((r) => !r.empty)
  const targets = ranges.length
    ? ranges.map((r) => ({ from: r.from, to: r.to }))
    : [{ from: 0, to: state.doc.length }]
  const results = await Promise.all(
    targets.map(async (r) => ({
      ...r,
      insert: await TRANSFORMS[id].run(state.doc.sliceString(r.from, r.to)),
    })),
  )
  // The note changed while a lazy load was in flight: don't apply stale offsets.
  if (view.state.doc !== state.doc) return
  view.dispatch({ changes: results, userEvent: 'input.transform' })
  view.focus()
}

/** applyTransform for menus and commands: problems become a toast, never an exception. */
export async function runTransform(view: EditorView, id: TransformId): Promise<void> {
  try {
    await applyTransform(view, id)
  } catch (e) {
    const { toast } = await import('../../ui/toast')
    toast(e instanceof TransformError ? e.message : `Couldn’t ${TRANSFORMS[id].label}.`, {
      tone: 'warn',
    })
  }
}
