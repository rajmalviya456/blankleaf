import type { Extension } from '@codemirror/state'
import { useEffect, useState } from 'react'

/** Blankleaf's spell check for an editor, loaded the first time a note turns it on. */
export function useSpellCheck(on: boolean): Extension | null {
  const [ext, setExt] = useState<Extension | null>(null)
  useEffect(() => {
    if (!on || ext) return
    let alive = true
    void import('./spellExtension').then((m) => alive && setExt(m.spellCheck()))
    return () => {
      alive = false
    }
  }, [on, ext])
  return on ? ext : null
}
