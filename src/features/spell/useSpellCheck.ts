import type { Extension } from '@codemirror/state'
import { useEffect, useState } from 'react'
import { useAppStore } from '../../store/store'
import { resolveSpellLanguage, type SpellLanguage } from './languages'

/** Blankleaf's spell check for an editor, loaded the first time a note turns it on. */
export function useSpellCheck(on: boolean): Extension | null {
  const setting = useAppStore((s) => s.settings.spellLanguage)
  const lang = resolveSpellLanguage(setting)
  const [loaded, setLoaded] = useState<{ lang: SpellLanguage; ext: Extension } | null>(null)
  useEffect(() => {
    if (!on || loaded?.lang === lang) return
    let alive = true
    void import('./spellExtension').then(
      (m) => alive && setLoaded({ lang, ext: m.spellCheck(m.getSpellService(lang)) }),
    )
    return () => {
      alive = false
    }
  }, [on, lang, loaded])
  return on && loaded?.lang === lang ? loaded.ext : null
}
