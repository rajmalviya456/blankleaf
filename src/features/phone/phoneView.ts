import type { PreviewMode } from '../../domain/types'

/**
 * What the phone shows for a Markdown note: the phone's own choice if made, otherwise Preview
 * when the saved (laptop) view is preview, else Edit — split doesn't fit on a phone.
 */
export function phoneViewFor(
  previewByTab: Record<string, boolean>,
  noteId: string,
  saved: PreviewMode | undefined,
): 'edit' | 'preview' {
  const own = previewByTab[noteId]
  if (own !== undefined) return own ? 'preview' : 'edit'
  return saved === 'preview' ? 'preview' : 'edit'
}
