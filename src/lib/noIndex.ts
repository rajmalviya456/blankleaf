/**
 * Asks search engines not to index, follow or cache the current page. Used while a shared note
 * is on screen, so a share link posted somewhere public can't end up in search results.
 * Returns a function that puts the previous robots setting back.
 */
export function noIndex(): () => void {
  let meta = document.head.querySelector<HTMLMetaElement>('meta[name="robots"]')
  const created = !meta
  if (!meta) {
    meta = document.createElement('meta')
    meta.name = 'robots'
    document.head.append(meta)
  }
  const previous = meta.content
  meta.content = 'noindex, nofollow, noarchive'
  const el = meta
  return () => {
    if (created) el.remove()
    else el.content = previous
  }
}
