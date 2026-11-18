import { redo, redoDepth, undo, undoDepth } from '@codemirror/commands'
import { openSearchPanel } from '@codemirror/search'
import type { EditorView } from '@codemirror/view'
import * as DropdownMenu from '@radix-ui/react-dropdown-menu'
import {
  ArrowDownAZ,
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
  Minus,
  Plus,
  Printer,
  Quote,
  Redo2,
  Search,
  Share2,
  SquareCode,
  Strikethrough,
  Trash2,
  Undo2,
  WrapText,
  type LucideIcon,
} from 'lucide-react'
import { Fragment, type ReactNode } from 'react'
import { EDITOR_FONT_MAX, EDITOR_FONT_MIN } from '../../domain/defaults'
import { exportNote } from '../backup/actions'
import { getActiveView, useActiveView, useActiveViewValue } from '../editor/activeView'
import { printStore } from '../print/printStore'
import { shareStore } from '../share/shareStore'
import { getStore, useAppStore } from '../../store/store'
import { toast } from '../../ui/toast'
import { SizeInput } from '../../ui/SizeInput'
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

/** Where a new group starts in the Transform menu (a separator goes before it). */
const TRANSFORM_GROUP_START = new Set<TransformId>(['json.toYaml', 'base64.encode', 'url.encode'])

const btn =
  'grid h-7 min-w-7 shrink-0 place-items-center rounded-md px-1 text-fg-muted outline-none hover:bg-bg-hover hover:text-fg focus-visible:bg-bg-hover focus-visible:text-fg disabled:pointer-events-none disabled:opacity-35 aria-pressed:bg-accent-soft aria-pressed:text-accent'
const menuBtn = btn
  .replace('grid ', 'flex ')
  .replace('place-items-center', 'items-center gap-0.5 px-1.5')
const item =
  'flex cursor-default select-none items-center gap-2 rounded px-2 py-1.5 text-[12.5px] text-fg outline-none data-[highlighted]:bg-accent-soft data-[disabled]:opacity-40'

function Btn({
  icon: Icon,
  label,
  onClick,
  disabled,
  pressed,
}: {
  icon: LucideIcon
  label: string
  onClick(): void
  disabled?: boolean
  pressed?: boolean
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      aria-pressed={pressed}
      disabled={disabled}
      // Keep the editor's selection: don't steal focus on mouse down.
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
      className={btn}
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
          onCloseAutoFocus={(e) => e.preventDefault()}
          className="z-50 min-w-44 rounded-md border border-border bg-bg-elev p-1 shadow-lg"
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

const Sep = () => <span aria-hidden className="mx-1 h-4 w-px shrink-0 bg-border" />

/**
 * Formatting writes Markdown, so a plain-text note becomes a Markdown note. Undo on the toast
 * switches it back and, if nothing was typed since, takes the formatting out again.
 */
function formatAsMarkdown(noteId: string, view: EditorView, format: (v: EditorView) => unknown) {
  const s = getStore().getState()
  if (s.notes[noteId]?.mode === 'markdown') return void format(view)
  s.setNoteMode(noteId, 'markdown')
  format(view)
  const after = view.state.doc
  toast('Switched this note to Markdown', {
    action: {
      label: 'Undo',
      run: () => {
        // The editor may have been recreated for the new format; its history carries over.
        const v = getActiveView()
        if (v && v.state.doc.eq(after) && undoDepth(v.state) > 0) undo(v)
        getStore().getState().setNoteMode(noteId, 'plain')
      },
    },
  })
}

function MarkdownGroup({ view, noteId }: { view: EditorView | null; noteId: string }) {
  const off = !view
  const run = (fn: (v: EditorView) => unknown) => () => {
    if (view) formatAsMarkdown(noteId, view, fn)
  }
  return (
    <>
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
      <Btn icon={Bold} label="Bold" disabled={off} onClick={run((v) => toggleInline(v, '**'))} />
      <Btn icon={Italic} label="Italic" disabled={off} onClick={run((v) => toggleInline(v, '_'))} />
      <Btn
        icon={Strikethrough}
        label="Strikethrough"
        disabled={off}
        onClick={run((v) => toggleInline(v, '~~'))}
      />
      <Btn
        icon={Code}
        label="Inline code"
        disabled={off}
        onClick={run((v) => toggleInline(v, '`'))}
      />
      <Btn icon={Link} label="Link" disabled={off} onClick={run(insertLink)} />
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

function TextGroup({ view, noteId }: { view: EditorView | null; noteId: string }) {
  const off = !view
  const wrap = useAppStore((s) => s.notes[noteId]?.wrap ?? true)
  const run = (fn: (v: EditorView) => unknown) => () => view && fn(view)
  return (
    <>
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
        {TRANSFORM_IDS.map((id, i) => (
          <Fragment key={id}>
            {i > 0 && TRANSFORM_GROUP_START.has(id) && (
              <DropdownMenu.Separator className="my-1 h-px bg-border" />
            )}
            <Item onSelect={run((v) => runTransform(v, id))}>{TRANSFORMS[id].label}</Item>
          </Fragment>
        ))}
      </Menu>
      <Btn
        icon={Clock}
        label="Insert date and time"
        disabled={off}
        onClick={run((v) => insertText(v, new Date().toLocaleString()))}
      />
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
  const view = useActiveView()
  const markdown = useAppStore((s) => s.notes[noteId]?.mode === 'markdown')
  // Plain prose (not code or logs) gets formatting too; code keeps only the text tools.
  const prose = useAppStore((s) => {
    const n = s.notes[noteId]
    return n?.mode === 'plain' && (n.language === 'auto' || n.language === 'plaintext')
  })
  const size = useAppStore((s) => s.settings.editorFontSize)
  const s = () => getStore().getState()
  const setSize = (n: number) =>
    s().updateSettings({ editorFontSize: Math.min(EDITOR_FONT_MAX, Math.max(EDITOR_FONT_MIN, n)) })
  const off = !view
  const canUndo = useActiveViewValue((v) => !!v && undoDepth(v.state) > 0)
  const canRedo = useActiveViewValue((v) => !!v && redoDepth(v.state) > 0)

  return (
    <div
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
      {!markdown && <TextGroup view={view} noteId={noteId} />}
      {!compact && (
        <>
          <Sep />
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
      {!compact && (
        <>
          <span className="min-w-2 flex-1" />
          <Btn
            icon={Copy}
            label="Copy all text"
            onClick={async () => {
              try {
                await navigator.clipboard.writeText(s().notes[noteId]?.content ?? '')
                toast('Copied note text')
              } catch {
                toast('Couldn’t copy — your browser blocked clipboard access.', { tone: 'warn' })
              }
            }}
          />
          <Btn icon={Download} label="Download note" onClick={() => exportNote(noteId)} />
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
          <Btn icon={Trash2} label="Move to Trash" onClick={() => s().trashNote(noteId)} />
        </>
      )}
    </div>
  )
}
