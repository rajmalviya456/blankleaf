/**
 * The spell checker the editor talks to: an English (US) Hunspell dictionary in a Web Worker.
 * The dictionary (~550 KB) downloads the first time spell check is turned on.
 */
import affUrl from '../../../node_modules/dictionary-en/index.aff?url'
import dicUrl from '../../../node_modules/dictionary-en/index.dic?url'
import type { SpellRequest } from './spellWorker'

export interface SpellService {
  /** Which of these words are misspelled. */
  check(words: string[]): Promise<Set<string>>
  suggest(word: string): Promise<string[]>
  /** Remember a word as spelled right, here and next time. */
  add(word: string): void
}

const PERSONAL_KEY = 'blankleaf:dictionary'

function personalWords(): string[] {
  try {
    const list = JSON.parse(localStorage.getItem(PERSONAL_KEY) ?? '[]')
    return Array.isArray(list) ? list.filter((w) => typeof w === 'string') : []
  } catch {
    return []
  }
}

function rememberWord(word: string) {
  try {
    const words = new Set(personalWords())
    words.add(word)
    localStorage.setItem(PERSONAL_KEY, JSON.stringify([...words]))
  } catch {
    // Storage blocked: the word is known for this visit only.
  }
}

type Strip<T> = T extends unknown ? Omit<T, 'id'> : never

function workerService(): SpellService {
  const worker = new Worker(new URL('./spellWorker.ts', import.meta.url), { type: 'module' })
  const pending = new Map<number, { resolve(v: unknown): void; reject(e: unknown): void }>()
  let next = 1
  worker.onmessage = (e: MessageEvent<{ id: number; result?: unknown; error?: string }>) => {
    const p = pending.get(e.data.id)
    pending.delete(e.data.id)
    if (e.data.error) p?.reject(new Error(e.data.error))
    else p?.resolve(e.data.result)
  }
  const ask = <T>(req: Strip<SpellRequest>): Promise<T> =>
    new Promise((resolve, reject) => {
      const id = next++
      pending.set(id, { resolve: resolve as (v: unknown) => void, reject })
      worker.postMessage({ ...req, id })
    })
  const ready = ask<boolean>({
    type: 'init',
    aff: new URL(affUrl, location.href).href,
    dic: new URL(dicUrl, location.href).href,
    personal: personalWords(),
  })
  return {
    check: async (words) => {
      await ready
      return new Set(await ask<string[]>({ type: 'check', words }))
    },
    suggest: async (word) => {
      await ready
      return ask<string[]>({ type: 'suggest', word })
    },
    add: (word) => {
      rememberWord(word)
      void ready.then(() => ask({ type: 'add', word }))
    },
  }
}

let service: SpellService | null = null
let override: SpellService | null = null

export function getSpellService(): SpellService {
  if (override) return override
  service ??= workerService()
  return service
}

export function setSpellServiceForTests(s: SpellService | null): void {
  override = s
}
