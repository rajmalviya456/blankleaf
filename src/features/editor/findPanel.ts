/**
 * Compact floating find/replace widget for CodeMirror (replaces the stock search panel).
 *
 *   [▸] [ Find…            Aa ab .* ]  3 of 12  [↑] [↓] [×]
 *       [ Replace…                   ]  [Replace] [All]      ← shown after ▸
 *
 * Plain DOM (no React) because CodeMirror owns the panel's lifecycle.
 */
import {
  closeSearchPanel,
  findNext,
  findPrevious,
  getSearchQuery,
  replaceAll,
  replaceNext,
  SearchQuery,
  setSearchQuery,
} from '@codemirror/search'
import type { EditorState } from '@codemirror/state'
import type { EditorView, Panel, ViewUpdate } from '@codemirror/view'

const MAX_COUNT = 9999

const ICONS = {
  chevron: '<path d="m9 18 6-6-6-6"/>',
  up: '<path d="m18 15-6-6-6 6"/>',
  down: '<path d="m6 9 6 6 6-6"/>',
  close: '<path d="M18 6 6 18"/><path d="m6 6 12 12"/>',
}

function svg(paths: string): string {
  return `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths}</svg>`
}

function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  attrs: Record<string, string> = {},
  html = '',
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag)
  for (const [k, v] of Object.entries(attrs)) node.setAttribute(k, v)
  if (html) node.innerHTML = html
  return node
}

/** "n of m" for the current query, where n is the match under the selection (0 if none). */
export function matchStatus(state: EditorState, query: SearchQuery): string {
  if (!query.search) return ''
  if (!query.valid) return 'Invalid regex'
  const sel = state.selection.main
  let total = 0
  let current = 0
  const cursor = query.getCursor(state)
  for (let r = cursor.next(); !r.done; r = cursor.next()) {
    total++
    if (r.value.from === sel.from && r.value.to === sel.to) current = total
    if (total >= MAX_COUNT) return `${current || '?'} of ${MAX_COUNT}+`
  }
  return total ? `${current} of ${total}` : 'No results'
}

export function createFindPanel(view: EditorView): Panel {
  const dom = el('div', { class: 'np-find', role: 'search', 'aria-label': 'Find in note' })
  const q0 = getSearchQuery(view.state)

  const toggleReplace = el(
    'button',
    {
      type: 'button',
      class: 'np-find-btn np-find-expand',
      'aria-label': 'Toggle replace',
      'aria-expanded': 'false',
    },
    svg(ICONS.chevron),
  )
  const find = el('input', {
    class: 'np-find-input',
    'aria-label': 'Find',
    placeholder: 'Find',
    spellcheck: 'false',
    autocomplete: 'off',
    'main-field': 'true',
  })
  find.value = q0.search
  const opt = (label: string, text: string, on: boolean) =>
    el(
      'button',
      {
        type: 'button',
        class: 'np-find-opt',
        'aria-label': label,
        title: label,
        'aria-pressed': String(on),
      },
      text,
    )
  const caseBtn = opt('Match case', 'Aa', q0.caseSensitive)
  const wordBtn = opt('Whole word', 'ab', q0.wholeWord)
  const regexBtn = opt('Regular expression', '.*', q0.regexp)
  const field = el('div', { class: 'np-find-field' })
  field.append(find, caseBtn, wordBtn, regexBtn)

  const count = el('span', { class: 'np-find-count', 'aria-live': 'polite' })
  const prev = el(
    'button',
    {
      type: 'button',
      class: 'np-find-btn',
      'aria-label': 'Previous match',
      title: 'Previous (Shift+Enter)',
    },
    svg(ICONS.up),
  )
  const next = el(
    'button',
    { type: 'button', class: 'np-find-btn', 'aria-label': 'Next match', title: 'Next (Enter)' },
    svg(ICONS.down),
  )
  const close = el(
    'button',
    { type: 'button', class: 'np-find-btn', 'aria-label': 'Close find', title: 'Close (Esc)' },
    svg(ICONS.close),
  )

  const row1 = el('div', { class: 'np-find-row' })
  row1.append(toggleReplace, field, count, prev, next, close)

  const replace = el('input', {
    class: 'np-find-input',
    'aria-label': 'Replace',
    placeholder: 'Replace',
    spellcheck: 'false',
    autocomplete: 'off',
  })
  replace.value = q0.replace
  const replaceOne = el(
    'button',
    {
      type: 'button',
      class: 'np-find-text-btn',
      'aria-label': 'Replace',
      title: 'Replace (Enter)',
    },
    'Replace',
  )
  const replaceEvery = el(
    'button',
    {
      type: 'button',
      class: 'np-find-text-btn',
      'aria-label': 'Replace all',
      title: 'Replace all (⌘/Ctrl+Enter)',
    },
    'All',
  )
  const row2 = el('div', { class: 'np-find-row np-find-replace', hidden: '' })
  const replaceField = el('div', { class: 'np-find-field' })
  replaceField.append(replace)
  row2.append(el('span', { class: 'np-find-spacer' }), replaceField, replaceOne, replaceEvery)
  dom.append(row1, row2)

  const pressed = (b: HTMLButtonElement) => b.getAttribute('aria-pressed') === 'true'

  const commit = () => {
    const query = new SearchQuery({
      search: find.value,
      replace: replace.value,
      caseSensitive: pressed(caseBtn),
      wholeWord: pressed(wordBtn),
      regexp: pressed(regexBtn),
    })
    if (!query.eq(getSearchQuery(view.state))) view.dispatch({ effects: setSearchQuery.of(query) })
    refresh(view.state)
  }

  const refresh = (state: EditorState) => {
    const query = getSearchQuery(state)
    const status = matchStatus(state, query)
    count.textContent = status
    count.dataset.empty = String(status === 'No results' || status === 'Invalid regex')
    find.setAttribute('aria-invalid', String(Boolean(query.search) && !query.valid))
  }

  const focusEditor = () => {
    closeSearchPanel(view)
    view.focus()
  }

  find.addEventListener('input', commit)
  replace.addEventListener('input', commit)
  for (const b of [caseBtn, wordBtn, regexBtn])
    b.addEventListener('click', () => {
      b.setAttribute('aria-pressed', String(!pressed(b)))
      commit()
      find.focus()
    })
  toggleReplace.addEventListener('click', () => {
    const open = row2.hasAttribute('hidden')
    if (open) row2.removeAttribute('hidden')
    else row2.setAttribute('hidden', '')
    toggleReplace.setAttribute('aria-expanded', String(open))
    dom.classList.toggle('np-find-open', open)
    ;(open ? replace : find).focus()
  })
  const go = (dir: 1 | -1) => {
    commit()
    if (dir === 1) findNext(view)
    else findPrevious(view)
    refresh(view.state)
  }
  next.addEventListener('click', () => go(1))
  prev.addEventListener('click', () => go(-1))
  close.addEventListener('click', focusEditor)
  replaceOne.addEventListener('click', () => {
    commit()
    replaceNext(view)
    refresh(view.state)
  })
  replaceEvery.addEventListener('click', () => {
    commit()
    replaceAll(view)
    refresh(view.state)
  })

  dom.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      e.preventDefault()
      focusEditor()
    } else if (e.key === 'Enter' && e.target === find) {
      e.preventDefault()
      go(e.shiftKey ? -1 : 1)
    } else if (e.key === 'Enter' && e.target === replace) {
      e.preventDefault()
      commit()
      if (e.metaKey || e.ctrlKey) replaceAll(view)
      else replaceNext(view)
      refresh(view.state)
    }
  })

  return {
    dom,
    top: true,
    mount() {
      find.focus()
      find.select()
      refresh(view.state)
    },
    update(u: ViewUpdate) {
      const query = getSearchQuery(u.state)
      if (!query.eq(getSearchQuery(u.startState)) && document.activeElement !== find) {
        // Query changed from outside (e.g. Cmd+F with a selection): mirror it.
        find.value = query.search
        caseBtn.setAttribute('aria-pressed', String(query.caseSensitive))
        wordBtn.setAttribute('aria-pressed', String(query.wholeWord))
        regexBtn.setAttribute('aria-pressed', String(query.regexp))
      }
      if (u.docChanged || u.selectionSet || !query.eq(getSearchQuery(u.startState)))
        refresh(u.state)
    },
  }
}
