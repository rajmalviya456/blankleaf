/** Release notes and the "you've been updated" check. */

/** The changelog without its "# Changelog" title, releases newest first. */
export function releaseNotes(changelog: string): string {
  return changelog.replace(/^# Changelog\s*/, '').trim()
}

const KEY = 'blankleaf:seen-version'

/**
 * Compare the running version with the one this browser last saw, and remember it.
 * Returns the change once after an update; null on a first visit or when nothing changed.
 */
export function seenVersionCheck(
  version: string,
  storage: Pick<Storage, 'getItem' | 'setItem'>,
): { from: string; to: string } | null {
  try {
    const seen = storage.getItem(KEY)
    if (seen === version) return null
    storage.setItem(KEY, version)
    return seen ? { from: seen, to: version } : null
  } catch {
    return null
  }
}
