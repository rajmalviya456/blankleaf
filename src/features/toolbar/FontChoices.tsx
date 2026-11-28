/** The font choices for one note, as menu radio items (toolbar Font menu and More tools). */
import * as DropdownMenu from '@radix-ui/react-dropdown-menu'
import { Check } from 'lucide-react'
import { EDITOR_FONTS, editorFontStack } from '../../domain/defaults'
import { getStore, useAppStore } from '../../store/store'
import { item } from './toolbarStyles'

/** The tick beside the chosen menu item (a fixed-width space when not chosen). */
const Tick = () => (
  <span className="w-3.5 shrink-0">
    <DropdownMenu.ItemIndicator>
      <Check size={13} />
    </DropdownMenu.ItemIndicator>
  </span>
)

/** This note's editor font; "Same as Settings" follows the Settings font again. */
export function FontChoices({ noteId }: { noteId: string }) {
  const own = useAppStore((s) => s.notes[noteId]?.font)
  const base = useAppStore((s) => s.settings.editorFont)
  const baseLabel = EDITOR_FONTS.find((f) => f.value === base)?.label
  const set = (v: string) =>
    getStore()
      .getState()
      .setNoteFont(noteId, v === '' ? undefined : (v as (typeof EDITOR_FONTS)[number]['value']))
  return (
    <DropdownMenu.RadioGroup value={own ?? ''} onValueChange={set}>
      <DropdownMenu.RadioItem value="" className={item}>
        <Tick />
        Same as Settings ({baseLabel})
      </DropdownMenu.RadioItem>
      {EDITOR_FONTS.map((f) => (
        <DropdownMenu.RadioItem
          key={f.value}
          value={f.value}
          className={item}
          style={{ fontFamily: editorFontStack(f.value) }}
        >
          <Tick />
          {f.label}
        </DropdownMenu.RadioItem>
      ))}
    </DropdownMenu.RadioGroup>
  )
}
