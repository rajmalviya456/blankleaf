import * as DropdownMenu from '@radix-ui/react-dropdown-menu'
import { SaveAnnouncer } from '../../ui/SaveAnnouncer'
import { AlertTriangle, Check, History, Loader, Share2, MoreHorizontal } from 'lucide-react'
import { useDeferredValue, useMemo, type ReactNode } from 'react'
import { useCalmValue } from '../../lib/useCalmValue'
import type { Note } from '../../domain/types'
import { tagsStore } from '../../features/tags/tagsStore'
import {
  lineColAt,
  readingMinutes,
  selectionLabel,
  selectionStats,
  textStats,
} from '../../lib/textStats'
import { goalStore } from '../../features/goal/goalStore'
import { editingNote } from '../../store/selectors'
import { getStore, useAppStore } from '../../store/store'
import { FormatPicker } from '../../features/editor/FormatPicker'
import { LinkedFromMenu } from '../../features/links/LinkedFrom'
import { shareStore } from '../../features/share/shareStore'
import { historyStore } from '../../features/history/historyStore'
import { SharesIndicator } from '../../features/share/SharesIndicator'
import { isLargeDoc } from '../../domain/languages'

/** A named set of status bar items: screen readers announce the name, and it lays out as one. */
function Group({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div role="group" aria-label={label} className="flex shrink-0 items-center gap-2.5">
      {children}
    </div>
  )
}

/** Hairline between groups, on wide screens; narrower bars need the room. */
function Divider({ className = '' }: { className?: string }) {
  return <span aria-hidden className={`h-3 w-px shrink-0 bg-border max-lg:hidden ${className}`} />
}

/** Above this size, skip word counting so typing stays smooth. */
const WORD_COUNT_LIMIT = 2_000_000

/**
 * The save state, shown; screen readers hear only problems (SaveAnnouncer), since saving
 * happens after every pause in typing and the rest of the bar changes on every keystroke.
 */
function SaveState() {
  return (
    <>
      <SaveStateText />
      <SaveAnnouncer />
    </>
  )
}

function SaveStateText() {
  const status = useAppStore((s) => s.ui.saveStatus)
  const error = useAppStore((s) => s.ui.saveError)
  if (status === 'saving')
    return (
      <span className="flex items-center gap-1">
        <Loader size={11} className="animate-spin" />
        Saving…
      </span>
    )
  if (status === 'error')
    return (
      <span className="flex items-center gap-1 text-danger">
        <AlertTriangle size={11} />
        <span title={error ?? undefined}>Not saved</span>
      </span>
    )
  return (
    <span className="flex items-center gap-1">
      <Check size={11} className="text-ok" />
      Saved
    </span>
  )
}

function PreviewSwitch({ noteId }: { noteId: string }) {
  const view = useAppStore((s) => s.session.perTab[noteId]?.previewMode ?? 'edit')
  const options = [
    { value: 'edit', label: 'Edit' },
    { value: 'split', label: 'Split' },
    { value: 'preview', label: 'Preview' },
  ] as const
  return (
    <div role="radiogroup" aria-label="View" className="flex rounded-md bg-bg-hover p-px">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          role="radio"
          aria-checked={view === o.value}
          onClick={() => getStore().getState().setViewState(noteId, { previewMode: o.value })}
          className={[
            'rounded px-1.5 leading-[18px]',
            view === o.value
              ? 'bg-bg font-medium text-fg shadow-sm ring-1 ring-border'
              : 'hover:text-fg',
          ].join(' ')}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}

function GoalButton({ note, words }: { note: Note; words: number }) {
  const goal = note.wordGoal
  const reached = goal !== undefined && words >= goal
  return (
    <button
      type="button"
      aria-label={
        goal === undefined
          ? 'Set a word goal'
          : `Word goal: ${words} of ${goal} words${reached ? ', reached' : ''}`
      }
      title="Word goal for this note"
      onClick={() => goalStore.getState().open(note.id)}
      className={[
        'rounded px-1.5 py-0.5 hover:bg-bg-hover hover:text-fg max-md:hidden',
        reached ? 'font-medium text-accent' : '',
      ].join(' ')}
    >
      {goal === undefined
        ? 'Goal'
        : `${words.toLocaleString()} / ${goal.toLocaleString()}${reached ? ' ✓' : ''}`}
    </button>
  )
}

const menuItem =
  'flex min-h-8 cursor-default items-center gap-2 rounded px-2 py-1 text-[12.5px] text-fg outline-none data-[highlighted]:bg-bg-hover'

/** On narrower windows the settings that don't fit in the bar live here (shown below 1280px). */
function MoreSettings({ note, line, col }: { note: Note; line: number; col: number }) {
  const s = () => getStore().getState()
  const spellcheck = useAppStore((st) => st.settings.spellcheck)
  const liveMarkdown = useAppStore((st) => st.settings.liveMarkdown)
  return (
    <DropdownMenu.Root modal={false}>
      <DropdownMenu.Trigger
        aria-label="More note settings"
        title="More note settings"
        className="grid h-5 w-6 place-items-center rounded hover:bg-bg-hover hover:text-fg xl:hidden"
      >
        <MoreHorizontal size={13} />
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content
          side="top"
          align="start"
          sideOffset={4}
          className="z-50 min-w-48 rounded-md border border-border bg-bg-elev p-1 shadow-lg"
        >
          <DropdownMenu.Label className="px-2 py-1 text-[11px] text-fg-faint md:hidden">
            Ln {line}, Col {col}
          </DropdownMenu.Label>
          <DropdownMenu.CheckboxItem
            checked={note.wrap}
            onCheckedChange={() => s().toggleWrap(note.id)}
            className={menuItem}
          >
            <span aria-hidden className="w-3">
              {note.wrap ? '✓' : ''}
            </span>
            Wrap long lines
          </DropdownMenu.CheckboxItem>
          <DropdownMenu.CheckboxItem
            checked={spellcheck}
            onCheckedChange={() => s().toggleSpellcheck()}
            className={menuItem}
          >
            <span aria-hidden className="w-3">
              {spellcheck ? '✓' : ''}
            </span>
            Spell check
          </DropdownMenu.CheckboxItem>
          {note.mode === 'markdown' && (
            <DropdownMenu.CheckboxItem
              checked={liveMarkdown}
              onCheckedChange={() => s().updateSettings({ liveMarkdown: !liveMarkdown })}
              className={menuItem}
            >
              <span aria-hidden className="w-3">
                {liveMarkdown ? '✓' : ''}
              </span>
              Live Markdown
            </DropdownMenu.CheckboxItem>
          )}
          <DropdownMenu.Separator className="my-1 h-px bg-border" />
          <DropdownMenu.Item
            onSelect={() => tagsStore.getState().open(note.id)}
            className={menuItem}
          >
            <span className="w-3" />
            Tags…
          </DropdownMenu.Item>
          {!note.locked && (
            <DropdownMenu.Item
              onSelect={() => goalStore.getState().open(note.id)}
              className={menuItem}
            >
              <span className="w-3" />
              Word goal…
            </DropdownMenu.Item>
          )}
          {!note.locked && (
            <DropdownMenu.Item
              onSelect={() => historyStore.getState().open(note.id)}
              className={menuItem}
            >
              <span className="w-3" />
              Version history…
            </DropdownMenu.Item>
          )}
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  )
}

function NoteInfo({ note }: { note: Note }) {
  const spellcheck = useAppStore((s) => s.settings.spellcheck)
  const liveMarkdown = useAppStore((s) => s.settings.liveMarkdown)
  const head = useAppStore((s) => s.session.perTab[note.id]?.head ?? 0)
  const anchor = useAppStore((s) => s.session.perTab[note.id]?.anchor)
  const content = useDeferredValue(note.content)
  const selected = selectionStats(content, anchor, head)
  const { line, col } = lineColAt(content, head)
  // Counting every word of a big note on each keystroke slows typing: count when typing pauses.
  const calm = useCalmValue(note.content)
  const big = calm.length > WORD_COUNT_LIMIT
  const { words, chars } = useMemo(
    () => (big ? { words: 0, chars: calm.length } : textStats(calm)),
    [calm, big],
  )
  return (
    <>
      <Group label="Format and view">
        <FormatPicker noteId={note.id} />
        {note.mode === 'markdown' && <PreviewSwitch noteId={note.id} />}
      </Group>
      <Divider />
      <Group label="Position and counts">
        <span className="max-md:hidden">
          Ln {line}, Col {col}
        </span>
        <span className={selected ? 'max-md:hidden' : undefined}>
          {!big && `${words.toLocaleString()} words · `}
          {chars.toLocaleString()} chars
          {!big && words > 0 && ` · ${readingMinutes(words)} min read`}
        </span>
        {!note.locked && !big && <GoalButton note={note} words={words} />}
        {selected && <span className="text-fg">{selectionLabel(selected)}</span>}
      </Group>
      <Divider />
      <Group label="Note settings">
        <button
          type="button"
          aria-pressed={note.wrap}
          title="Toggle word wrap"
          onClick={() => getStore().getState().toggleWrap(note.id)}
          className="rounded px-1.5 py-0.5 hover:bg-bg-hover hover:text-fg aria-pressed:text-fg max-xl:hidden"
        >
          Wrap: {note.wrap ? 'on' : 'off'}
        </button>
        <button
          type="button"
          title="Edit this note's tags"
          onClick={() => tagsStore.getState().open(note.id)}
          className="rounded px-1.5 py-0.5 hover:bg-bg-hover hover:text-fg max-lg:hidden"
        >
          {note.tags?.length ? `Tags: ${note.tags.length}` : 'Add tags'}
        </button>
        {note.mode === 'markdown' && (
          <button
            type="button"
            aria-pressed={liveMarkdown}
            title="Show Markdown formatted as you type, in every Markdown note"
            onClick={() => getStore().getState().updateSettings({ liveMarkdown: !liveMarkdown })}
            className="rounded px-1.5 py-0.5 hover:bg-bg-hover hover:text-fg aria-pressed:text-fg max-xl:hidden"
          >
            Live Markdown: {liveMarkdown ? 'on' : 'off'}
          </button>
        )}
        <button
          type="button"
          aria-pressed={spellcheck}
          title="Check spelling in every note"
          onClick={() => getStore().getState().toggleSpellcheck()}
          className="rounded px-1.5 py-0.5 hover:bg-bg-hover hover:text-fg aria-pressed:text-fg max-xl:hidden"
        >
          Spelling: {spellcheck ? 'on' : 'off'}
        </button>
        <MoreSettings note={note} line={line} col={col} />
      </Group>
      {isLargeDoc(content.length) && (
        <span className="text-warn" title="Syntax highlighting is off to keep typing fast">
          Large file · highlighting off
        </span>
      )}
    </>
  )
}

export function StatusBar() {
  const note = useAppStore(editingNote)
  return (
    <footer
      aria-label="Status bar"
      className="flex h-6 shrink-0 items-center gap-2 overflow-hidden whitespace-nowrap border-t border-border bg-bg-sunken px-3 text-[11px] text-fg-faint tabular-nums"
    >
      {note && <NoteInfo note={note} />}
      <div className="ml-auto flex shrink-0 items-center gap-2 bg-bg-sunken pl-2">
        <SharesIndicator />
        {note && <LinkedFromMenu noteId={note.id} />}
        {note && !note.locked && (
          <Group label="Note actions">
            <button
              type="button"
              aria-label="Version history"
              title="Version history: see and restore earlier versions"
              onClick={() => historyStore.getState().open(note.id)}
              className="flex items-center gap-1 rounded px-1.5 py-0.5 hover:bg-bg-hover hover:text-fg max-lg:hidden"
            >
              <History size={11} aria-hidden />
              History
            </button>
            <button
              type="button"
              aria-label="Share note"
              title="Share note"
              onClick={() => shareStore.getState().open(note.id)}
              className="flex items-center gap-1 rounded px-1.5 py-0.5 hover:bg-bg-hover hover:text-fg"
            >
              <Share2 size={11} aria-hidden />
              Share
            </button>
          </Group>
        )}
        <Divider />
        <SaveState />
      </div>
    </footer>
  )
}
