import * as Popover from '@radix-ui/react-popover'
import { Omega } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useStore } from 'zustand'
import { getActiveView } from '../editor/activeView'
import { insertText } from '../toolbar/editCommands'
import { getStore, useAppStore } from '../../store/store'
import {
  EMOJI_CATEGORIES,
  SKIN_TONES,
  loadEmoji,
  withTone,
  type EmojiCategoryId,
  type EmojiGroup,
} from './emoji'
import { SYMBOL_GROUPS, findSymbols, type Sym } from './symbols'
import { symbolStore } from './symbolStore'

/** Toolbar button and popup: pick a symbol or emoji to type it at the cursor. */
export function SymbolPicker({ className, disabled }: { className: string; disabled?: boolean }) {
  const open = useStore(symbolStore, (s) => s.open)
  const setOpen = symbolStore.getState().setOpen
  const [tab, setTab] = useState<string>(SYMBOL_GROUPS[0].id)
  const [category, setCategory] = useState<EmojiCategoryId>('smileys')
  const [query, setQuery] = useState('')
  const [emoji, setEmoji] = useState<EmojiGroup[] | null>(null)
  const [failed, setFailed] = useState(false)
  const tone = useAppStore((s) => s.settings.emojiSkinTone)

  // Every emoji is a big list, so it loads the first time the picker opens.
  useEffect(() => {
    if (!open || emoji) return
    let live = true
    loadEmoji().then(
      (groups) => {
        if (!live) return
        setEmoji(groups)
        setFailed(false)
      },
      () => live && setFailed(true),
    )
    return () => {
      live = false
    }
  }, [open, emoji])

  const allEmoji = emoji?.flatMap((g) => g.items) ?? []
  const onEmojiTab = tab === 'emoji'
  const shown: Sym[] = (
    query.trim()
      ? findSymbols(query, allEmoji)
      : onEmojiTab
        ? (emoji?.find((g) => g.id === category)?.items ?? [])
        : (SYMBOL_GROUPS.find((g) => g.id === tab)?.items ?? [])
  ).map((s) => withTone(s, tone))
  const showTones = !!emoji && (onEmojiTab || (!!query.trim() && shown.some((s) => s.skins)))

  const pick = (char: string) => {
    const view = getActiveView()
    if (view) {
      insertText(view, char)
      view.focus()
    }
    setOpen(false)
    setQuery('')
  }

  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <Popover.Trigger
        aria-label="Insert symbol or emoji"
        title="Insert symbol or emoji"
        disabled={disabled}
        onMouseDown={(e) => e.preventDefault()}
        className={className}
      >
        <Omega size={15} strokeWidth={1.75} />
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          aria-label="Insert symbol or emoji"
          align="start"
          sideOffset={4}
          collisionPadding={8}
          onCloseAutoFocus={(e) => e.preventDefault()}
          className="z-50 flex w-[min(320px,calc(100vw-16px))] flex-col gap-2 rounded-md border border-border bg-bg-elev p-2 shadow-lg"
        >
          <input
            type="search"
            autoFocus
            aria-label="Find a symbol"
            placeholder="Find a symbol: arrow, euro, check…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="h-8 rounded border border-border-field bg-bg px-2 text-[13px] text-fg outline-none focus:border-accent"
          />
          {!query.trim() && (
            <div role="tablist" aria-label="Symbol groups" className="flex flex-wrap gap-1">
              {SYMBOL_GROUPS.map((g) => (
                <button
                  key={g.id}
                  type="button"
                  role="tab"
                  aria-selected={tab === g.id}
                  onClick={() => setTab(g.id)}
                  className="rounded px-2 py-0.5 text-[12px] text-fg-muted hover:bg-bg-hover aria-selected:bg-accent-soft aria-selected:font-medium aria-selected:text-fg"
                >
                  {g.label}
                </button>
              ))}
              <button
                type="button"
                role="tab"
                aria-selected={onEmojiTab}
                onClick={() => setTab('emoji')}
                className="rounded px-2 py-0.5 text-[12px] text-fg-muted hover:bg-bg-hover aria-selected:bg-accent-soft aria-selected:font-medium aria-selected:text-fg"
              >
                Emoji
              </button>
            </div>
          )}
          {!query.trim() && onEmojiTab && (
            <div role="tablist" aria-label="Emoji categories" className="flex justify-between">
              {EMOJI_CATEGORIES.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  role="tab"
                  aria-selected={category === c.id}
                  aria-label={c.label}
                  title={c.label}
                  onClick={() => setCategory(c.id)}
                  className="grid size-8 place-items-center rounded text-[16px] hover:bg-bg-hover aria-selected:bg-accent-soft"
                >
                  <span aria-hidden="true">{c.icon}</span>
                </button>
              ))}
            </div>
          )}
          {showTones && (
            <div role="group" aria-label="Skin tone" className="flex items-center gap-1">
              <span aria-hidden="true" className="mr-auto px-1 text-[12px] text-fg-muted">
                Skin tone
              </span>
              {SKIN_TONES.map((t) => (
                <button
                  key={t.tone}
                  type="button"
                  aria-pressed={tone === t.tone}
                  aria-label={t.label}
                  title={t.label}
                  onClick={() => getStore().getState().updateSettings({ emojiSkinTone: t.tone })}
                  className="grid size-7 place-items-center rounded text-[15px] hover:bg-bg-hover aria-pressed:bg-accent-soft aria-pressed:ring-1 aria-pressed:ring-accent"
                >
                  <span aria-hidden="true">{t.sample}</span>
                </button>
              ))}
            </div>
          )}
          {(onEmojiTab || query.trim()) && !emoji && (
            <p role="status" className="px-1 text-[12px] text-fg-faint">
              {failed ? 'Couldn’t load emoji. Close and open again to retry.' : 'Loading emoji…'}
            </p>
          )}
          <div className="grid max-h-56 grid-cols-8 gap-0.5 overflow-y-auto">
            {shown.map((s) => (
              <button
                key={s.char + s.name}
                type="button"
                aria-label={s.name}
                title={s.name}
                onClick={() => pick(s.char)}
                className="grid h-9 place-items-center rounded text-[18px] text-fg hover:bg-bg-hover"
              >
                {s.char}
              </button>
            ))}
          </div>
          {query.trim() && !shown.length && (
            <p className="px-1 text-[12px] text-fg-faint">Nothing called “{query.trim()}”.</p>
          )}
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  )
}
