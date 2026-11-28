/**
 * Which share page, if any, this page load opens (spec §5.3). Small and loaded with the app:
 * the share page itself (sharePage.tsx) loads only when there is one to show.
 *
 * The link's key leaves the address bar as soon as it's read. Until the recipient chooses Save
 * or Close (or the share ends) it waits in this tab's session storage instead, so a reload, a
 * phone's pull-to-refresh or the browser reloading a tab it put to sleep comes back to the share
 * page. Otherwise it would open the notepad, writing its first-visit note to this browser.
 */
import { parseShareHash, SHARE_HASH_PREFIX, type ShareLinkParts } from './link'

export type ShareEntry = { kind: 'link'; parts: ShareLinkParts } | { kind: 'broken' }

const OPEN_SHARE = 'blankleaf:open-share'

/** This tab's session storage. Browsers that block storage throw on merely reading it. */
function tabStorage(): Storage | null {
  try {
    return window.sessionStorage
  } catch {
    return null
  }
}

/**
 * The share page to open: a link in the address bar, or the one this tab was showing before a
 * reload. A link cut short (mail apps break long lines) still opens the share page, to say so,
 * rather than the notepad with half a key left in the address bar.
 */
export function takeShareEntry(): ShareEntry | null {
  const { hash } = location
  if (!hash.startsWith(SHARE_HASH_PREFIX)) {
    let waiting: string | null = null
    try {
      waiting = tabStorage()?.getItem(OPEN_SHARE) ?? null
    } catch {
      // Storage blocked: open the notepad, as before there was a share page to come back to.
    }
    const parts = waiting ? parseShareHash(waiting) : null
    return parts ? { kind: 'link', parts } : null
  }
  // Keep the key out of the address bar and history once read.
  history.replaceState(null, '', location.pathname + location.search)
  const parts = parseShareHash(hash)
  if (!parts) {
    forgetShare()
    return { kind: 'broken' }
  }
  try {
    tabStorage()?.setItem(OPEN_SHARE, hash)
  } catch {
    // Storage full or blocked: the link still opens, a reload just won't come back to it.
  }
  return { kind: 'link', parts }
}

/** The share page is done with (Save, Close, or the share ended): a reload opens the notepad. */
export function forgetShare(): void {
  try {
    tabStorage()?.removeItem(OPEN_SHARE)
  } catch {
    // Storage blocked: nothing was kept.
  }
}
