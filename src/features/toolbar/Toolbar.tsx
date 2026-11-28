import type { StateCommand } from '@codemirror/state'
import {
  indentLess,
  indentMore,
  redo,
  redoDepth,
  toggleComment,
  undo,
  undoDepth,
} from '@codemirror/commands'
import { openSearchPanel } from '@codemirror/search'
import type { EditorView } from '@codemirror/view'
import * as DropdownMenu from '@radix-ui/react-dropdown-menu'
import {
  ArrowDownAZ,
  IndentDecrease,
  IndentIncrease,
  MessageSquareCode,
  Bold,
  Braces,
  CaseSensitive,
  ChevronDown,
  Clock,
  Code,
  Copy,
  Download,
  Heading,
  Italic,
  Link,
  List,
  Mic,
  Minus,
  Plus,
  Printer,
  Quote,
  Redo2,
  Maximize2,
  Search,
  Share2,
  SquareCode,
  Strikethrough,
  Trash2,
  Type,
  Undo2,
  WrapText,
  type LucideIcon,
} from 'lucide-react'
import { Fragment, useRef, type ReactNode } from 'react'
import { useStore } from 'zustand'
import { isVoiceSupported, toggleVoice, voiceStore } from '../voice/voice'
import { EDITOR_FONT_MAX, EDITOR_FONT_MIN } from '../../domain/defaults'
import { exportNote } from '../backup/actions'
import { exportNoteAs } from '../export/exportNote'
import { getActiveView, noteForView, useActiveView, useActiveViewValue } from '../editor/activeView'
import { printStore } from '../print/printStore'
import { shareStore } from '../share/shareStore'
import { trashWithUndo } from '../sidebar/trashWithUndo'
import { languageMeta } from '../../domain/languages'
import { OutlineMenu } from './OutlineMenu'
import { shortcutFor } from '../editor/markdownKeys'
import { platform } from '../../lib/platform'
import { SymbolPicker } from '../symbols/SymbolPicker'
import { getStore, useAppStore } from '../../store/store'
import { toast } from '../../ui/toast'
import { SizeInput } from '../../ui/SizeInput'
import { useNoteFontSize } from '../editor/useNoteFontSize'
import {
  changeCase,
  dedupeLines,
  insertCodeBlock,
  insertLink,
  insertText,
  setHeading,
  sortLines,
  toggleInline,
  toggleLinePrefix,
  trimLines,
} from './editCommands'
import { runTransform, TRANSFORM_IDS, TRANSFORMS, type TransformId } from './transforms'
import { canFormat, runFormatCode } from './formatCode'
import { MoreTools } from './MoreTools'
import { FontChoices } from './FontChoices'
import { btn, copyAllText, item, keepMovedFocus, menuBtn, menuContent } from './toolbarStyles'
import { useFold } from './useFold'

/** Where a new group starts in the Transform menu (a separator goes before it). */
const TRANSFORM_GROUP_START = new Set<TransformId>(['json.toYaml', 'base64.encode', 'url.encode'])

function Btn({
  icon: Icon,
  label,
  onClick,
  disabled,
  pressed,
  keys,
  danger,
}: {
  icon: LucideIcon
  label: string
  onClick(): void
  disabled?: boolean
  pressed?: boolean
  /** Keyboard shortcut shown in the tooltip. */
  keys?: string
  /** Destructive: turns red on hover and focus. */
  danger?: boolean
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={keys ? `${label} (${keys})` : label}
      aria-pressed={pressed}
      disabled={disabled}
      // Keep the editor's selection: don't steal focus on mouse down.
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
      className={danger ? `${btn} hover:text-danger focus-visible:text-danger` : btn}
    >
      <Icon size={15} strokeWidth={1.75} />
    </button>
  )
}

function Menu({
  icon: Icon,
  label,
  disabled,
  children,
}: {
  icon: LucideIcon
  label: string
  disabled?: boolean
  children: ReactNode
}) {
  return (
    <DropdownMenu.Root modal={false}>
      <DropdownMenu.Trigger
        aria-label={label}
        title={label}
        disabled={disabled}
        className={menuBtn}
      >
        <Icon size={15} strokeWidth={1.75} />
        <ChevronDown size={11} />
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content
          align="start"
          sideOffset={4}
          onCloseAutoFocus={keepMovedFocus}
          className={menuContent}
        >
          {children}
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  )
}

function Item({ onSelect, children }: { onSelect(): void; children: ReactNode }) {
  return (
    <DropdownMenu.Item onSelect={onSelect} className={item}>
      {children}
    </DropdownMenu.Item>
  )
}

/** This note's editor font; "Same as Settings" follows the Settings font again. */
function FontMenu({ noteId }: { noteId: string }) {
  return (
    <Menu icon={Type} label="Font">
      <FontChoices noteId={noteId} />
    </Menu>
  )
}

const Sep = () => <span aria-hidden data-separator className="mx-1.5 h-4 w-px shrink-0 bg-border" />

/**
 * Formatting writes Markdown, so a plain-text note becomes a Markdown note. Undo on the toast
 * switches it back and, if nothing was typed since, takes the formatting out again.
 */
function formatAsMarkdown(noteId: string, view: EditorView, format: (v: EditorView) => unknown) {
  const s = getStore().getState()
  const note = s.notes[noteId]
  if (!note || note.mode === 'markdown') return void format(view)
  const was = note.language
  // A format still being detected just becomes Markdown; one chosen as Plain text changes to it.
  if (was === 'auto') s.setNoteMode(noteId, 'markdown')
  else s.setLanguage(noteId, 'markdown')
  format(view)
  const after = view.state.doc
  toast('Switched this note to Markdown', {
    action: {
      label: 'Undo',
      run: () => {
        // The editor may have been recreated for the new format; its history carries over.
        const v = getActiveView()
        if (v && v.state.doc.eq(after) && undoDepth(v.state) > 0) undo(v)
        if (was === 'auto') getStore().getState().setNoteMode(noteId, 'plain')
        else getStore().getState().setLanguage(noteId, was)
      },
    },
  })
}

function MarkdownGroup({ view, noteId }: { view: EditorView | null; noteId: string }) {
  const off = !view
  const markdown = useAppStore((s) => s.notes[noteId]?.mode === 'markdown')
  // The keys only work once the note is Markdown, so plain notes don't advertise them.
  const keys = (label: string) => (markdown ? shortcutFor(label, platform() === 'mac') : undefined)
  const run = (fn: (v: EditorView) => unknown) => () => {
    if (view) formatAsMarkdown(noteId, view, fn)
  }
  return (
    <>
      {markdown && <OutlineMenu noteId={noteId} className={menuBtn} disabled={off} />}
      <Menu icon={Heading} label="Heading" disabled={off}>
        {[1, 2, 3].map((n) => (
          <Item key={n} onSelect={run((v) => setHeading(v, n))}>
            <span className="w-6 font-semibold text-fg-muted">H{n}</span> Heading {n}
          </Item>
        ))}
        <Item onSelect={run((v) => setHeading(v, 0))}>
          <span className="w-6 text-fg-muted">¶</span> Normal text
        </Item>
      </Menu>
      <Btn
        icon={Bold}
        label="Bold"
        keys={keys('Bold')}
        disabled={off}
        onClick={run((v) => toggleInline(v, '**'))}
      />
      <Btn
        icon={Italic}
        label="Italic"
        keys={keys('Italic')}
        disabled={off}
        onClick={run((v) => toggleInline(v, '_'))}
      />
      <Btn
        icon={Strikethrough}
        label="Strikethrough"
        keys={keys('Strikethrough')}
        disabled={off}
        onClick={run((v) => toggleInline(v, '~~'))}
      />
      <Btn
        icon={Code}
        label="Inline code"
        keys={keys('Inline code')}
        disabled={off}
        onClick={run((v) => toggleInline(v, '`'))}
      />
      <Btn icon={Link} label="Link" keys={keys('Link')} disabled={off} onClick={run(insertLink)} />
      <Menu icon={List} label="List" disabled={off}>
        <Item onSelect={run((v) => toggleLinePrefix(v, '- '))}>• Bulleted list</Item>
        <Item onSelect={run((v) => toggleLinePrefix(v, '1. '))}>1. Numbered list</Item>
        <Item onSelect={run((v) => toggleLinePrefix(v, '- [ ] '))}>☐ Checklist</Item>
      </Menu>
      <Btn
        icon={Quote}
        label="Quote"
        disabled={off}
        onClick={run((v) => toggleLinePrefix(v, '> '))}
      />
      <Btn icon={SquareCode} label="Code block" disabled={off} onClick={run(insertCodeBlock)} />
    </>
  )
}

function TextGroup({
  view,
  noteId,
  foldDate,
}: {
  view: EditorView | null
  noteId: string
  /** The date button has moved into More tools. */
  foldDate: boolean
}) {
  const off = !view
  const wrap = useAppStore((s) => s.notes[noteId]?.wrap ?? true)
  const code = useAppStore((s) => languageMeta(s.notes[noteId]?.language ?? 'auto').kind === 'code')
  const language = useAppStore((s) => s.notes[noteId]?.language ?? 'auto')
  const run = (fn: (v: EditorView) => unknown) => () => view && fn(view)
  // Phones have no Tab key and no Cmd/Ctrl+/, so code notes get buttons for both.
  const edit = (fn: StateCommand) => () => {
    if (!view) return
    fn(view)
    view.focus()
  }
  return (
    <>
      {code && (
        <>
          <Btn icon={IndentIncrease} label="Indent" disabled={off} onClick={edit(indentMore)} />
          <Btn icon={IndentDecrease} label="Outdent" disabled={off} onClick={edit(indentLess)} />
          <Btn
            icon={MessageSquareCode}
            label="Comment line"
            disabled={off}
            onClick={edit(toggleComment)}
          />
        </>
      )}
      <Menu icon={CaseSensitive} label="Change case" disabled={off}>
        <Item onSelect={run((v) => changeCase(v, 'upper'))}>UPPERCASE</Item>
        <Item onSelect={run((v) => changeCase(v, 'lower'))}>lowercase</Item>
        <Item onSelect={run((v) => changeCase(v, 'title'))}>Title Case</Item>
      </Menu>
      <Menu icon={ArrowDownAZ} label="Line tools" disabled={off}>
        <Item onSelect={run(sortLines)}>Sort lines A→Z</Item>
        <Item onSelect={run(dedupeLines)}>Remove duplicate lines</Item>
        <Item onSelect={run(trimLines)}>Trim trailing spaces</Item>
      </Menu>
      <Menu icon={Braces} label="Transform" disabled={off}>
        {canFormat(language) && (
          <>
            <Item onSelect={run((v) => runFormatCode(v, language))}>
              Format {languageMeta(language).label}
            </Item>
            <DropdownMenu.Separator className="my-1 h-px bg-border" />
          </>
        )}
        {TRANSFORM_IDS.map((id, i) => (
          <Fragment key={id}>
            {i > 0 && TRANSFORM_GROUP_START.has(id) && (
              <DropdownMenu.Separator className="my-1 h-px bg-border" />
            )}
            <Item onSelect={run((v) => runTransform(v, id))}>{TRANSFORMS[id].label}</Item>
          </Fragment>
        ))}
      </Menu>
      {!foldDate && (
        <Btn
          icon={Clock}
          label="Insert date and time"
          disabled={off}
          onClick={run((v) => insertText(v, new Date().toLocaleString()))}
        />
      )}
      <Btn
        icon={WrapText}
        label="Wrap long lines"
        pressed={wrap}
        onClick={() => getStore().getState().toggleWrap(noteId)}
      />
    </>
  )
}

/** Row of edit and note actions above the editor; adapts to the note's format. */
/** `compact` (phones): text size and the note actions live in the note menu instead. */
export function Toolbar({ noteId, compact = false }: { noteId: string; compact?: boolean }) {
  // Only this note's own editor: a side note showing its preview has none, and its toolbar
  // must not reach into the main note's editor instead.
  const active = useActiveView()
  const view = active && noteForView(active) === noteId ? active : null
  const markdown = useAppStore((s) => s.notes[noteId]?.mode === 'markdown')
  // Plain prose (not code or logs) gets formatting too; code keeps only the text tools.
  const prose = useAppStore((s) => {
    const n = s.notes[noteId]
    return n?.mode === 'plain' && (n.language === 'auto' || n.language === 'plaintext')
  })
  // Text size belongs to this note; Settings holds the size every other note uses.
  const size = useNoteFontSize(noteId)
  const s = () => getStore().getState()
  const setSize = (n: number) => s().setNoteFontSize(noteId, n, false)
  const off = !view
  const listening = useStore(voiceStore, (v) => v.listening)
  const canUndo = useActiveViewValue((v) => !!v && undoDepth(v.state) > 0) && !!view
  const canRedo = useActiveViewValue((v) => !!v && redoDepth(v.state) > 0) && !!view
  const language = useAppStore((s) => s.notes[noteId]?.language ?? 'auto')
  const bar = useRef<HTMLDivElement>(null)
  // Phones scroll their toolbar instead; on laptops the least used tools fold into More tools.
  const fold = useFold(bar, compact ? 0 : 3, `${noteId} ${markdown} ${prose} ${language}`)

  return (
    <div
      ref={bar}
      role="toolbar"
      aria-label="Editor toolbar"
      data-compact={compact || undefined}
      className={
        compact
          ? 'np-toolbar-compact flex h-11 shrink-0 items-center gap-0.5 overflow-x-auto bg-bg px-1 pr-11 [scrollbar-width:none]'
          : 'flex h-9 shrink-0 items-center gap-0.5 overflow-x-auto border-b border-border bg-bg px-2 [scrollbar-width:none]'
      }
    >
      <Btn icon={Undo2} label="Undo" disabled={!canUndo} onClick={() => view && undo(view)} />
      <Btn icon={Redo2} label="Redo" disabled={!canRedo} onClick={() => view && redo(view)} />
      <Sep />
      {(markdown || prose) && <MarkdownGroup view={view} noteId={noteId} />}
      {prose && <Sep />}
      {!markdown && <TextGroup view={view} noteId={noteId} foldDate={fold >= 3} />}
      {!compact && fold < 2 && (
        <>
          <Sep />
          <FontMenu noteId={noteId} />
          <Btn
            icon={Minus}
            label="Smaller text"
            disabled={size <= EDITOR_FONT_MIN}
            onClick={() => setSize(size - 1)}
          />
          <SizeInput
            label="Text size"
            value={size}
            min={EDITOR_FONT_MIN}
            max={EDITOR_FONT_MAX}
            onCommit={setSize}
            className="h-6 w-9 shrink-0 text-[11.5px]"
          />
          <Btn
            icon={Plus}
            label="Larger text"
            disabled={size >= EDITOR_FONT_MAX}
            onClick={() => setSize(size + 1)}
          />
        </>
      )}
      <Sep />
      <Btn
        icon={Search}
        label="Find and replace"
        disabled={off}
        onClick={() => view && openSearchPanel(view)}
      />
      <SymbolPicker className={btn} disabled={off} />
      {!compact && fold < 3 && (
        <Btn icon={Maximize2} label="Zen mode" onClick={() => getStore().getState().toggleZen()} />
      )}
      {!compact && fold < 3 && isVoiceSupported() && (
        <Btn
          icon={Mic}
          label={listening ? 'Stop voice typing' : 'Start voice typing'}
          pressed={listening}
          disabled={off}
          onClick={() => toggleVoice(view)}
        />
      )}
      {!compact && <span data-spacer className="min-w-2 flex-1" />}
      {!compact && fold >= 1 && <MoreTools noteId={noteId} fold={fold} view={view} />}
      {!compact && fold < 1 && (
        <>
          <Btn icon={Copy} label="Copy all text" onClick={() => void copyAllText(noteId)} />
          <Menu icon={Download} label="Download note">
            <Item onSelect={() => exportNote(noteId)}>Original format</Item>
            <Item onSelect={() => void exportNoteAs(noteId, 'html')}>Web page (.html)</Item>
            <Item onSelect={() => void exportNoteAs(noteId, 'docx')}>Word document (.docx)</Item>
          </Menu>
          <Btn
            icon={Printer}
            label="Print or save as PDF"
            onClick={() => printStore.getState().open(noteId)}
          />
          <Btn
            icon={Share2}
            label="Share via link"
            onClick={() => shareStore.getState().open(noteId)}
          />
          <Sep />
          <Btn icon={Trash2} label="Move to Trash" danger onClick={() => trashWithUndo(noteId)} />
        </>
      )}
    </div>
  )
}
