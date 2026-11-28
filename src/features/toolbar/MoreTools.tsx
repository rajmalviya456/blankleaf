/**
 * The toolbar's "More tools" menu: whatever the toolbar folded away to fit on one row (see
 * useFold). `fold` says how much: 1 = the note actions, 2 = the font and text size too,
 * 3 = the date, zen mode and voice typing too.
 */
import type { EditorView } from '@codemirror/view'
import * as DropdownMenu from '@radix-ui/react-dropdown-menu'
import {
  ChevronRight,
  Clock,
  Copy,
  Download,
  Maximize2,
  Mic,
  Minus,
  MoreHorizontal,
  Plus,
  Printer,
  Share2,
  Trash2,
  Type,
  type LucideIcon,
} from 'lucide-react'
import type { ReactNode } from 'react'
import { useStore } from 'zustand'
import { EDITOR_FONT_MAX, EDITOR_FONT_MIN } from '../../domain/defaults'
import { getStore, useAppStore } from '../../store/store'
import { exportNote } from '../backup/actions'
import { getActiveView } from '../editor/activeView'
import { useNoteFontSize } from '../editor/useNoteFontSize'
import { exportNoteAs } from '../export/exportNote'
import { printStore } from '../print/printStore'
import { shareStore } from '../share/shareStore'
import { trashWithUndo } from '../sidebar/trashWithUndo'
import { isVoiceSupported, toggleVoice, voiceStore } from '../voice/voice'
import { insertText } from './editCommands'
import { FontChoices } from './FontChoices'
import { btn, copyAllText, item, itemBase, keepMovedFocus, menuContent } from './toolbarStyles'

const Sep = () => <DropdownMenu.Separator className="my-1 h-px bg-border" />

function Row({
  icon: Icon,
  children,
  onSelect,
  disabled,
}: {
  icon: LucideIcon
  children: ReactNode
  onSelect(e: Event): void
  disabled?: boolean
}) {
  return (
    <DropdownMenu.Item className={item} disabled={disabled} onSelect={onSelect}>
      <Icon size={14} aria-hidden className="shrink-0 text-fg-muted" />
      {children}
    </DropdownMenu.Item>
  )
}

function SubMenu({
  icon: Icon,
  label,
  children,
}: {
  icon: LucideIcon
  label: string
  children: ReactNode
}) {
  return (
    <DropdownMenu.Sub>
      <DropdownMenu.SubTrigger className={item}>
        <Icon size={14} aria-hidden className="shrink-0 text-fg-muted" />
        {label}
        <ChevronRight size={13} aria-hidden className="ml-auto text-fg-muted" />
      </DropdownMenu.SubTrigger>
      <DropdownMenu.Portal>
        <DropdownMenu.SubContent sideOffset={4} className={menuContent}>
          {children}
        </DropdownMenu.SubContent>
      </DropdownMenu.Portal>
    </DropdownMenu.Sub>
  )
}

export function MoreTools({
  noteId,
  fold,
  view,
}: {
  noteId: string
  fold: number
  view: EditorView | null
}) {
  const markdown = useAppStore((s) => s.notes[noteId]?.mode === 'markdown')
  const size = useNoteFontSize(noteId)
  const listening = useStore(voiceStore, (v) => v.listening)
  const s = () => getStore().getState()
  // A size step keeps the menu open, ready for another.
  const step = (by: number) => (e: Event) => {
    e.preventDefault()
    s().setNoteFontSize(noteId, size + by, false)
  }

  return (
    <DropdownMenu.Root modal={false}>
      <DropdownMenu.Trigger aria-label="More tools" title="More tools" className={btn}>
        <MoreHorizontal size={15} strokeWidth={1.75} />
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content
          align="end"
          sideOffset={4}
          onCloseAutoFocus={keepMovedFocus}
          className={`${menuContent} min-w-52`}
        >
          {fold >= 3 && (
            <>
              {!markdown && (
                <Row
                  icon={Clock}
                  disabled={!view}
                  onSelect={() => view && insertText(view, new Date().toLocaleString())}
                >
                  Insert date and time
                </Row>
              )}
              <Row
                icon={Maximize2}
                onSelect={() => {
                  s().toggleZen()
                  // Zen hides the toolbar, menu button and all: back to the note to keep writing.
                  setTimeout(() => getActiveView()?.focus())
                }}
              >
                Zen mode
              </Row>
              {isVoiceSupported() && (
                <Row icon={Mic} disabled={!view} onSelect={() => toggleVoice(view)}>
                  {listening ? 'Stop voice typing' : 'Start voice typing'}
                </Row>
              )}
              <Sep />
            </>
          )}
          {fold >= 2 && (
            <>
              <SubMenu icon={Type} label="Font">
                <FontChoices noteId={noteId} />
              </SubMenu>
              <Row icon={Minus} disabled={size <= EDITOR_FONT_MIN} onSelect={step(-1)}>
                Smaller text
              </Row>
              <Row icon={Plus} disabled={size >= EDITOR_FONT_MAX} onSelect={step(1)}>
                Larger text
              </Row>
              <p className="flex px-2 pb-1 text-[11.5px] text-fg-muted">
                Text size
                <span aria-live="polite" className="ml-auto tabular-nums">
                  {size}
                </span>
              </p>
              <Sep />
            </>
          )}
          <Row icon={Copy} onSelect={() => void copyAllText(noteId)}>
            Copy all text
          </Row>
          <SubMenu icon={Download} label="Download">
            <DropdownMenu.Item className={item} onSelect={() => exportNote(noteId)}>
              Original format
            </DropdownMenu.Item>
            <DropdownMenu.Item className={item} onSelect={() => void exportNoteAs(noteId, 'html')}>
              Web page (.html)
            </DropdownMenu.Item>
            <DropdownMenu.Item className={item} onSelect={() => void exportNoteAs(noteId, 'docx')}>
              Word document (.docx)
            </DropdownMenu.Item>
          </SubMenu>
          <Row icon={Printer} onSelect={() => printStore.getState().open(noteId)}>
            Print or save as PDF…
          </Row>
          <Row icon={Share2} onSelect={() => shareStore.getState().open(noteId)}>
            Share via link…
          </Row>
          <Sep />
          <DropdownMenu.Item
            className={`${itemBase} text-danger`}
            onSelect={() => trashWithUndo(noteId)}
          >
            <Trash2 size={14} aria-hidden className="shrink-0" />
            Move to Trash
          </DropdownMenu.Item>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  )
}
