import * as DropdownMenu from '@radix-ui/react-dropdown-menu'
import { Check, ChevronUp } from 'lucide-react'
import { detectLanguage } from '../../domain/detectLanguage'
import { LANGUAGES, languageMeta } from '../../domain/languages'
import type { LanguageId } from '../../domain/types'
import { getStore, useAppStore } from '../../store/store'

const itemClass =
  'flex cursor-default select-none items-center gap-2 rounded px-2 py-1 text-[12.5px] text-fg outline-none data-[highlighted]:bg-accent-soft'

/** Status-bar dropdown that sets a note's format (saved with the note). */
export function FormatPicker({ noteId }: { noteId: string }) {
  const lang = useAppStore((s) => s.notes[noteId]?.language ?? 'auto')
  const mode = useAppStore((s) => s.notes[noteId]?.mode ?? 'plain')
  const isAuto = lang === 'auto'
  const label = isAuto
    ? `${mode === 'markdown' ? 'Markdown' : 'Plain text'} (auto)`
    : languageMeta(lang).label

  const choose = (value: string) => {
    const s = getStore().getState()
    const next = value as LanguageId
    s.setLanguage(noteId, next)
    // Picking auto re-detects right away so the label doesn't lag behind.
    if (next === 'auto') {
      const guess = detectLanguage(s.notes[noteId]?.content ?? '')
      if (guess !== 'plaintext') s.setLanguage(noteId, guess)
    }
  }

  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger
        aria-label={`Format: ${label}`}
        title="Change format"
        className="flex items-center gap-1 rounded px-1.5 py-0.5 text-fg-muted outline-none hover:bg-bg-hover hover:text-fg data-[state=open]:bg-bg-hover"
      >
        {label}
        <ChevronUp size={11} />
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content
          side="top"
          align="start"
          sideOffset={6}
          className="z-50 max-h-[70vh] min-w-48 overflow-y-auto rounded-md border border-border bg-bg-elev p-1 shadow-lg"
        >
          <DropdownMenu.RadioGroup value={lang} onValueChange={choose}>
            <DropdownMenu.RadioItem value="auto" className={itemClass}>
              <span className="w-3">
                <DropdownMenu.ItemIndicator>
                  <Check size={12} />
                </DropdownMenu.ItemIndicator>
              </span>
              Auto-detect
            </DropdownMenu.RadioItem>
            <DropdownMenu.Separator className="my-1 h-px bg-border" />
            {LANGUAGES.map((l) => (
              <DropdownMenu.RadioItem key={l.id} value={l.id} className={itemClass}>
                <span className="w-3">
                  <DropdownMenu.ItemIndicator>
                    <Check size={12} />
                  </DropdownMenu.ItemIndicator>
                </span>
                <span className="flex-1">{l.label}</span>
                <span aria-hidden className="text-[11px] text-fg-faint">
                  .{l.ext}
                </span>
              </DropdownMenu.RadioItem>
            ))}
          </DropdownMenu.RadioGroup>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  )
}
