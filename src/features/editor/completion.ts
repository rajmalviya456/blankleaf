/**
 * One suggestion popup per editor, shared by everything that suggests: `[[` note titles and the
 * Markdown "/" menu. CodeMirror allows a single `override`, so each feature adds its source to
 * `completionSources` and this one override asks them in turn.
 */
import {
  autocompletion,
  type CompletionContext,
  type CompletionResult,
  type CompletionSource,
} from '@codemirror/autocomplete'
import { Facet, type Extension } from '@codemirror/state'

export const completionSources = Facet.define<CompletionSource>()

async function fromSources(context: CompletionContext): Promise<CompletionResult | null> {
  for (const source of context.state.facet(completionSources)) {
    const result = await source(context)
    if (result) return result
  }
  return null
}

/** The popup itself; the same value everywhere, so adding it twice is harmless. */
export const completionCore: Extension = autocompletion({ override: [fromSources], icons: false })
