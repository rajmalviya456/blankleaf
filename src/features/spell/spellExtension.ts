/**
 * Blankleaf's own spell check in the editor. Words are checked in the background a moment after
 * typing stops; misspelled ones get a red underline. Clicking or tapping one (or right-clicking
 * it) offers fixes and "Add to dictionary". The word being typed is left alone until you move on.
 */
import { StateEffect, StateField, type Extension, type Range } from '@codemirror/state'
import {
  Decoration,
  EditorView,
  showTooltip,
  ViewPlugin,
  type DecorationSet,
  type Tooltip,
  type ViewUpdate,
} from '@codemirror/view'
import { getSpellService, type SpellService } from './spellService'
import { startsInFence, wordsToCheck, type Word } from './words'

const DELAY_MS = 300
/** Past this size only the part on screen is checked (it's re-checked as you scroll). */
const WHOLE_DOC_CHARS = 30_000
const mark = Decoration.mark({ class: 'np-misspelled' })

/** Ask the plugin to look again (after a fix, or a word added to the dictionary). */
const recheck = StateEffect.define<null>()

interface Suggesting {
  word: Word
}
const openSuggestions = StateEffect.define<Suggesting | null>()

/** Misspelled words found in the last check, for the click handler and the tooltip. */
let lastMisspelled = new WeakMap<EditorView, Word[]>()

class SpellPlugin {
  decorations: DecorationSet = Decoration.none
  private timer: ReturnType<typeof setTimeout> | undefined
  private known = new Map<string, boolean>()
  private destroyed = false

  private view: EditorView
  private service: SpellService

  constructor(view: EditorView, service: SpellService) {
    this.view = view
    this.service = service
    this.schedule(0)
  }

  update(u: ViewUpdate) {
    if (u.transactions.some((t) => t.effects.some((e) => e.is(recheck)))) this.known.clear()
    if (u.docChanged || u.viewportChanged || u.selectionSet || u.focusChanged)
      this.decorations = this.decorations.map(u.changes)
    if (u.docChanged || u.viewportChanged || u.focusChanged || u.selectionSet) this.schedule()
    if (u.transactions.some((t) => t.effects.some((e) => e.is(recheck)))) this.schedule(0)
  }

  private schedule(delay = DELAY_MS) {
    clearTimeout(this.timer)
    this.timer = setTimeout(() => void this.run(), delay)
  }

  /** The word the cursor is at the end of or inside, while typing: not judged yet. */
  private beingTyped(w: Word): boolean {
    const sel = this.view.state.selection.main
    return this.view.hasFocus && sel.empty && sel.head >= w.from && sel.head <= w.to
  }

  private words(): Word[] {
    const { state } = this.view
    if (state.doc.length <= WHOLE_DOC_CHARS) return wordsToCheck(state.doc.toString(), 0)
    return this.view.visibleRanges.flatMap((r) => {
      // Start and end on whole lines, so no word is cut in half.
      const from = state.doc.lineAt(r.from).from
      const to = state.doc.lineAt(r.to).to
      const inFence = startsInFence(state.sliceDoc(0, from), from)
      return wordsToCheck(state.sliceDoc(from, to), from, inFence)
    })
  }

  private async run() {
    const words = this.words()
    const unknown = [...new Set(words.map((w) => w.word))].filter((w) => !this.known.has(w))
    if (unknown.length) {
      let wrong: Set<string>
      try {
        wrong = await this.service.check(unknown)
      } catch {
        return
      }
      if (this.destroyed) return
      for (const w of unknown) this.known.set(w, !wrong.has(w))
    }
    // The text may have changed while checking: find the words again.
    const now = this.words()
    const bad = now.filter((w) => this.known.get(w.word) === false && !this.beingTyped(w))
    lastMisspelled.set(this.view, bad)
    const ranges: Range<Decoration>[] = bad.map((w) => mark.range(w.from, w.to))
    this.decorations = Decoration.set(ranges, true)
    // Repaint without changing the document.
    this.view.dispatch({})
  }

  destroy() {
    this.destroyed = true
    clearTimeout(this.timer)
  }
}

function misspelledAt(view: EditorView, pos: number): Word | undefined {
  return lastMisspelled.get(view)?.find((w) => pos >= w.from && pos <= w.to)
}

function suggestionTooltip(service: SpellService, s: Suggesting): Tooltip {
  return {
    pos: s.word.from,
    above: false,
    create: (view) => {
      const dom = document.createElement('div')
      dom.className = 'np-spell-tip'
      dom.setAttribute('role', 'group')
      dom.setAttribute('aria-label', `Spelling: ${s.word.word}`)
      const close = () => view.dispatch({ effects: openSuggestions.of(null) })
      const button = (label: string, run: () => void, extra = '') => {
        const b = document.createElement('button')
        b.type = 'button'
        b.textContent = label
        if (extra) b.className = extra
        b.addEventListener('mousedown', (e) => e.preventDefault())
        b.addEventListener('click', run)
        return b
      }
      const list = document.createElement('div')
      list.className = 'np-spell-fixes'
      list.textContent = 'Looking…'
      dom.append(list)
      dom.append(
        button(
          'Add to dictionary',
          () => {
            service.add(s.word.word)
            view.dispatch({ effects: [openSuggestions.of(null), recheck.of(null)] })
            view.focus()
          },
          'np-spell-add',
        ),
      )
      void service.suggest(s.word.word).then((fixes) => {
        list.textContent = fixes.length ? '' : 'No suggestions'
        for (const fix of fixes)
          list.append(
            button(fix, () => {
              // Only if the word is still where it was.
              if (view.state.sliceDoc(s.word.from, s.word.to) === s.word.word)
                view.dispatch({
                  changes: { from: s.word.from, to: s.word.to, insert: fix },
                  selection: { anchor: s.word.from + fix.length },
                  effects: openSuggestions.of(null),
                  userEvent: 'input.spell',
                })
              else close()
              view.focus()
            }),
          )
      })
      return { dom }
    },
  }
}

export { getSpellService }

export function spellCheck(service: SpellService = getSpellService()): Extension {
  const suggestions = StateField.define<Suggesting | null>({
    create: () => null,
    update(value, tr) {
      for (const e of tr.effects) if (e.is(openSuggestions)) return e.value
      if (tr.docChanged) return null
      if (value && tr.selection) {
        const head = tr.state.selection.main.head
        if (head < value.word.from || head > value.word.to) return null
      }
      return value
    },
    provide: (f) => showTooltip.from(f, (v) => (v ? suggestionTooltip(service, v) : null)),
  })

  const plugin = ViewPlugin.define((view) => new SpellPlugin(view, service), {
    decorations: (p) => p.decorations,
  })

  // A click or tap on an underlined word (or a right-click) opens its suggestions.
  const onPointer = EditorView.updateListener.of((u) => {
    if (!u.transactions.some((t) => t.isUserEvent('select.pointer'))) return
    const sel = u.state.selection.main
    if (!sel.empty) return
    const word = misspelledAt(u.view, sel.head)
    if (word) queueMicrotask(() => u.view.dispatch({ effects: openSuggestions.of({ word }) }))
  })
  const onContextMenu = EditorView.domEventHandlers({
    contextmenu(e, view) {
      const pos = view.posAtCoords({ x: e.clientX, y: e.clientY })
      const word = pos === null ? undefined : misspelledAt(view, pos)
      if (!word) return false
      e.preventDefault()
      view.dispatch({
        selection: { anchor: pos! },
        effects: openSuggestions.of({ word }),
      })
      return true
    },
  })

  return [plugin, suggestions, onPointer, onContextMenu]
}

/** For tests: forget the last check of every editor. */
export function resetSpellState() {
  lastMisspelled = new WeakMap()
}
