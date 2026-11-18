import { openSearchPanel } from '@codemirror/search'
import * as Dialog from '@radix-ui/react-dialog'
import {
  ChevronRight,
  Command,
  Copy,
  CopyPlus,
  FileCode,
  FileText,
  Globe,
  Download,
  History,
  LockKeyhole,
  Maximize2,
  Minus,
  Pencil,
  Pin,
  Printer,
  PinOff,
  Plus,
  Search,
  Share2,
  Tag,
  Trash2,
  type LucideIcon,
} from 'lucide-react'
import { useDeferredValue, type ReactNode } from 'react'
import { PHONE_FONT_MAX, PHONE_FONT_MIN } from '../../domain/defaults'
import { lineColAt, selectionLabel, selectionStats, textStats } from '../../lib/textStats'
import { getStore, useAppStore } from '../../store/store'
import { DialogSurface } from '../../ui/DialogSurface'
import { toast } from '../../ui/toast'
import { exportNote } from '../backup/actions'
import { exportNoteAs } from '../export/exportNote'
import { getActiveView } from '../editor/activeView'
import { formatLabel } from '../editor/format'
import { historyStore } from '../history/historyStore'
import { printStore } from '../print/printStore'
import { tagsStore } from '../tags/tagsStore'
import { lockStore } from '../lock/lockStore'
import { shareStore } from '../share/shareStore'
import { phoneStore } from './phoneStore'

/** Above this size, skip word counting (same rule as the laptop status bar). */
const WORD_COUNT_LIMIT = 2_000_000

const row =
  'flex h-12 w-full items-center gap-3 rounded-lg px-3 text-left text-[15px] text-fg active:bg-bg-hover disabled:opacity-40'

function Action({
  icon: Icon,
  label,
  onSelect,
  danger,
  trailing,
  keepOpen,
}: {
  icon: LucideIcon
  label: string
  onSelect(): void
  danger?: boolean
  trailing?: ReactNode
  keepOpen?: boolean
}) {
  return (
    <button
      type="button"
      onClick={() => {
        if (!keepOpen) phoneStore.getState().closeAll()
        onSelect()
      }}
      className={row + (danger ? ' text-danger' : '')}
    >
      <Icon size={18} className="shrink-0 opacity-80" aria-hidden />
      <span className="flex-1">{label}</span>
      {trailing}
    </button>
  )
}

const Group = ({ children }: { children: ReactNode }) => (
  <div className="border-b border-border py-1 last:border-b-0">{children}</div>
)

function SwitchRow({ label, on, onToggle }: { label: string; on: boolean; onToggle(): void }) {
  return (
    <label className={row + ' justify-between'}>
      <span className="pl-[30px]">{label}</span>
      <button
        type="button"
        role="switch"
        aria-label={label}
        aria-checked={on}
        onClick={onToggle}
        className="relative h-7 w-12 rounded-full bg-bg-hover transition-colors aria-checked:bg-accent"
      >
        <span
          aria-hidden
          className={[
            'absolute top-0.5 size-6 rounded-full bg-white shadow transition-[left]',
            on ? 'left-[22px]' : 'left-0.5',
          ].join(' ')}
        />
      </button>
    </label>
  )
}

function Stats({ noteId }: { noteId: string }) {
  const content = useDeferredValue(useAppStore((s) => s.notes[noteId]?.content ?? ''))
  const head = useAppStore((s) => s.session.perTab[noteId]?.head ?? 0)
  const anchor = useAppStore((s) => s.session.perTab[noteId]?.anchor)
  const { line, col } = lineColAt(content, head)
  const big = content.length > WORD_COUNT_LIMIT
  const { words, chars } = big ? { words: 0, chars: content.length } : textStats(content)
  const selected = selectionStats(content, anchor, head)
  return (
    <p className="px-3 pb-1 pt-2 text-[12px] tabular-nums text-fg-faint">
      Ln {line}, Col {col}
      {big ? '' : ` · ${words.toLocaleString()} words`} · {chars.toLocaleString()} chars
      {selected && <span className="block text-fg-muted">{selectionLabel(selected)}</span>}
    </p>
  )
}

/** ⋯ on phones: the active note's format, size and actions, plus line/word counts. */
export function NoteMenu({ open, onClose }: { open: boolean; onClose(): void }) {
  const noteId = useAppStore((s) => s.session.activeTabId)
  const note = useAppStore((s) => (noteId ? s.notes[noteId] : undefined))
  const size = useAppStore((s) => Math.max(PHONE_FONT_MIN, s.settings.phoneEditorFontSize))
  const s = () => getStore().getState()
  const setSize = (n: number) =>
    s().updateSettings({
      phoneEditorFontSize: Math.min(PHONE_FONT_MAX, Math.max(PHONE_FONT_MIN, n)),
    })

  return (
    <Dialog.Root open={open && !!note} onOpenChange={(o) => !o && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="np-overlay fixed inset-0 z-40" />
        <DialogSurface aria-describedby={undefined} className="fixed left-1/2 top-[8vh] w-96 px-2">
          <Dialog.Title className="sr-only">Note menu</Dialog.Title>
          {note && noteId && (
            <>
              <Group>
                <Action
                  icon={FileCode}
                  label={`Format: ${formatLabel(note.language, note.mode)}`}
                  trailing={<ChevronRight size={17} className="text-fg-faint" aria-hidden />}
                  keepOpen
                  onSelect={() => phoneStore.getState().open('format')}
                />
                <SwitchRow
                  label="Wrap lines"
                  on={note.wrap}
                  onToggle={() => s().toggleWrap(noteId)}
                />
                <SwitchRow
                  label="Spell check"
                  on={!!note.spellcheck}
                  onToggle={() => s().toggleSpellcheck(noteId)}
                />
              </Group>
              <Group>
                <div className={row + ' justify-between'}>
                  <span className="pl-[30px]">Text size</span>
                  <span className="flex items-center gap-1">
                    <button
                      type="button"
                      aria-label="Smaller text"
                      disabled={size <= PHONE_FONT_MIN}
                      onClick={() => setSize(size - 1)}
                      className="grid size-11 place-items-center rounded-lg text-fg-muted active:bg-bg-hover disabled:opacity-35"
                    >
                      <Minus size={17} />
                    </button>
                    <span className="w-8 text-center tabular-nums">{size}</span>
                    <button
                      type="button"
                      aria-label="Larger text"
                      disabled={size >= PHONE_FONT_MAX}
                      onClick={() => setSize(size + 1)}
                      className="grid size-11 place-items-center rounded-lg text-fg-muted active:bg-bg-hover disabled:opacity-35"
                    >
                      <Plus size={17} />
                    </button>
                  </span>
                </div>
                {!note.locked && (
                  <Action
                    icon={Search}
                    label="Find & replace"
                    onSelect={() => {
                      const view = getActiveView()
                      if (view) openSearchPanel(view)
                    }}
                  />
                )}
              </Group>
              <Group>
                <Action
                  icon={Tag}
                  label="Tags…"
                  onSelect={() => tagsStore.getState().open(noteId)}
                />
                {!note.locked && (
                  <>
                    <Action
                      icon={Share2}
                      label="Share…"
                      onSelect={() => shareStore.getState().open(noteId)}
                    />
                    <Action
                      icon={Copy}
                      label="Copy all text"
                      onSelect={() =>
                        void navigator.clipboard
                          ?.writeText(note.content)
                          .then(() => toast('Copied note text'))
                          .catch(() =>
                            toast('Couldn’t copy — your browser blocked clipboard access.', {
                              tone: 'warn',
                            }),
                          )
                      }
                    />
                    <Action icon={Download} label="Download" onSelect={() => exportNote(noteId)} />
                    <Action
                      icon={Globe}
                      label="Export as web page"
                      onSelect={() => void exportNoteAs(noteId, 'html')}
                    />
                    <Action
                      icon={FileText}
                      label="Export as Word"
                      onSelect={() => void exportNoteAs(noteId, 'docx')}
                    />
                    <Action
                      icon={Printer}
                      label="Print / save as PDF"
                      onSelect={() => printStore.getState().open(noteId)}
                    />
                    <Action
                      icon={History}
                      label="Version history…"
                      onSelect={() => historyStore.getState().open(noteId)}
                    />
                    <Action
                      icon={CopyPlus}
                      label="Duplicate"
                      onSelect={() => s().duplicateNote(noteId)}
                    />
                    <Action
                      icon={LockKeyhole}
                      label="Lock with password…"
                      onSelect={() => lockStore.getState().open(noteId)}
                    />
                  </>
                )}
                <Action
                  icon={note.pinned ? PinOff : Pin}
                  label={note.pinned ? 'Unpin' : 'Pin'}
                  onSelect={() => s().togglePin(noteId)}
                />
                <Action
                  icon={Pencil}
                  label="Rename"
                  onSelect={() => {
                    s().setUi({ renamingId: noteId })
                    phoneStore.getState().open('tabs')
                  }}
                />
              </Group>
              <Group>
                <Action icon={Maximize2} label="Zen mode" onSelect={() => s().toggleZen()} />
                <Action
                  icon={Command}
                  label="Commands…"
                  onSelect={() => s().setUi({ paletteOpen: true, paletteMode: 'commands' })}
                />
              </Group>
              <Group>
                <Action
                  icon={Trash2}
                  label="Move to Trash"
                  danger
                  onSelect={() => s().trashNote(noteId)}
                />
              </Group>
              <Stats noteId={noteId} />
            </>
          )}
        </DialogSurface>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
