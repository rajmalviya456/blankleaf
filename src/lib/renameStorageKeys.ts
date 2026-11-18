/**
 * The app was called Notepadz before 1.3. Its localStorage keys (unsaved-work journal, last
 * seen version, test flags) move to the new prefix on startup, so nothing typed or remembered
 * under the old name is lost. Safe to run on every start; a key already under the new name wins.
 */
const OLD = 'notepadz:'
const NEW = 'blankleaf:'

export function renameStorageKeys(storage: Storage | null = safeLocalStorage()): void {
  if (!storage) return
  const old: string[] = []
  for (let i = 0; i < storage.length; i++) {
    const k = storage.key(i)
    if (k?.startsWith(OLD)) old.push(k)
  }
  for (const k of old) {
    try {
      const v = storage.getItem(k)
      const target = NEW + k.slice(OLD.length)
      if (v !== null && storage.getItem(target) === null) storage.setItem(target, v)
      storage.removeItem(k)
    } catch {
      // Storage full or blocked: leave the old key; the next start tries again.
    }
  }
}

function safeLocalStorage(): Storage | null {
  try {
    return window.localStorage
  } catch {
    return null
  }
}
