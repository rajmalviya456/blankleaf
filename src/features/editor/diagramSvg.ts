/**
 * Makes a drawn diagram safe to show. Notes can come from other people, and a diagram must not
 * run code or contact another site (which would reveal who opened it, and when).
 */
import DOMPurify from 'dompurify'

/** Any url() that isn't a reference inside the drawing itself. */
const OUTSIDE_URL = /url\(\s*(?!['"]?#)[^)]*\)/gi
const OUTSIDE_HREF = /\s(?:xlink:)?href\s*=\s*("(?!#)[^"]*"|'(?!#)[^']*')/gi

export function cleanDiagramSvg(svg: string): string {
  return DOMPurify.sanitize(svg, {
    USE_PROFILES: { svg: true, svgFilters: true },
    FORBID_TAGS: ['image', 'feImage', 'a'],
  })
    .replace(/[^;{}<>]*\\[0-9a-f]{1,6}[^;{}<>]*/gi, '') // CSS escapes can disguise a url()
    .replace(/@import[^;]*;?/gi, '')
    .replace(/image-set\([^)]*\)/gi, 'none')
    .replace(OUTSIDE_URL, 'none')
    .replace(OUTSIDE_HREF, '')
}

/**
 * Removes image shapes from a diagram's source. Mermaid fetches these while it draws, before the
 * finished drawing can be cleaned.
 */
export function withoutOutsideImages(code: string): string {
  return code.replace(/@\{[^}]*\}/g, (shape) =>
    shape.replace(/\b(?:img|image|src)\s*:\s*("[^"]*"|'[^']*'|[^,}\s]+)\s*,?\s*/gi, ''),
  )
}
