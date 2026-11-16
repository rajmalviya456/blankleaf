import * as DropdownMenu from '@radix-ui/react-dropdown-menu'
import { Check, ChevronUp } from 'lucide-react'
import { detectLanguage } from '../../domain/detectLanguage'
import { LANGUAGE_GROUPS, LANGUAGES, languageMeta } from '../../domain/languages'
import type { LanguageId } from '../../domain/types'
import { getStore, useAppStore } from '../../store/store'

/** One row: [check] [label ............ .ext] — fixed columns so everything lines up. */
function Item({ value, label, ext }: { value: string; label: string; ext?: string }) {
  return (
    <DropdownMenu.RadioItem
      value={value}
      className="grid h-7 cursor-default select-none grid-cols-[14px_1fr_auto] items-center gap-2 rounded px-2 text-[12.5px] text-fg outline-none data-[highlighted]:bg-accent-soft"
    >
      <DropdownMenu.ItemIndicator className="text-accent">
        <Check size={12} />
      </DropdownMenu.ItemIndicator>
      <span className="col-start-2 truncate">{label}</span>
      {ext && (
        <span aria-hidden className="col-start-3 font-mono text-[11px] text-fg-faint">
          .{ext}
        </span>
      )}
    </DropdownMenu.RadioItem>
  )
}

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
          className="z-50 max-h-[70vh] w-60 overflow-y-auto rounded-md border border-border bg-bg-elev p-1 shadow-lg"
        >
          <DropdownMenu.RadioGroup value={lang} onValueChange={choose}>
            <Item value="auto" label="Auto-detect" />
          </DropdownMenu.RadioGroup>
          {LANGUAGE_GROUPS.map((g) => (
            <DropdownMenu.RadioGroup
              key={g.id}
              aria-label={g.label}
              value={lang}
              onValueChange={choose}
            >
              <DropdownMenu.Separator className="my-1 h-px bg-border" />
              <DropdownMenu.Label className="pb-0.5 pl-[30px] pr-2 pt-1 text-[10.5px] font-semibold uppercase tracking-wider text-fg-faint">
                {g.label}
              </DropdownMenu.Label>
              {LANGUAGES.filter((l) => l.group === g.id).map((l) => (
                <Item key={l.id} value={l.id} label={l.label} ext={l.ext} />
              ))}
            </DropdownMenu.RadioGroup>
          ))}
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  )
}
