import { useEffect } from 'react'
import { platform } from '../lib/platform'
import { matchShortcut } from '../lib/shortcuts'
import { languageMeta } from '../domain/languages'
import { getStore, type AppState } from '../store/store'
import { COMMANDS, commandEnabled } from './registry'

/** Running as an installed app (no browser tabs competing for Cmd/Ctrl+T/W). */
function isStandalone(): boolean {
  return (
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(display-mode: standalone)').matches
  )
}

/** The key went to the editor of a note written as code. */
function typingInCode(e: KeyboardEvent, state: AppState): boolean {
  if (!(e.target instanceof Element) || !e.target.closest('.cm-editor')) return false
  const id = state.session.activeTabId
  const lang = id ? state.notes[id]?.language : undefined
  return !!lang && languageMeta(lang).kind === 'code'
}

/**
 * Listens for command shortcuts on the whole window (capture phase, so they work while the
 * editor has focus). Only a matching key is consumed; all other typing passes through.
 */
export function useGlobalShortcuts(): void {
  useEffect(() => {
    const p = platform()
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.isComposing || e.repeat) return
      const store = getStore()
      const state = store.getState()
      for (const cmd of COMMANDS) {
        const hit = cmd.shortcuts.some(
          (s) =>
            matchShortcut(e, s, p) &&
            (!s.standaloneOnly || isStandalone()) &&
            !(s.yieldsToCode && typingInCode(e, state)),
        )
        if (!hit) continue
        if (!commandEnabled(cmd, state)) return
        e.preventDefault()
        e.stopPropagation()
        cmd.run({ store })
        return
      }
    }
    // Escape leaves zen mode — in the bubble phase, so the editor's own Escape
    // (closing its search panel) wins when it handles the key.
    const onEscape = (e: KeyboardEvent) => {
      if (e.key !== 'Escape' || e.defaultPrevented) return
      const s = getStore().getState()
      if (s.session.zen && !s.ui.paletteOpen && !s.ui.settingsOpen && !s.ui.shortcutsOpen)
        s.toggleZen()
    }
    window.addEventListener('keydown', onKeyDown, true)
    window.addEventListener('keydown', onEscape)
    return () => {
      window.removeEventListener('keydown', onKeyDown, true)
      window.removeEventListener('keydown', onEscape)
    }
  }, [])
}
