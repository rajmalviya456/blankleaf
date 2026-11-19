/**
 * The spell checker the editor talks to: an English (US) Hunspell dictionary in a Web Worker.
 * The dictionary (~550 KB) downloads the first time spell check is turned on.
 */
import enAuAff from '../../../node_modules/dictionary-en-au/index.aff?url'
import enAuDic from '../../../node_modules/dictionary-en-au/index.dic?url'
import enCaAff from '../../../node_modules/dictionary-en-ca/index.aff?url'
import enCaDic from '../../../node_modules/dictionary-en-ca/index.dic?url'
import enGbAff from '../../../node_modules/dictionary-en-gb/index.aff?url'
import enGbDic from '../../../node_modules/dictionary-en-gb/index.dic?url'
import enAff from '../../../node_modules/dictionary-en/index.aff?url'
import enDic from '../../../node_modules/dictionary-en/index.dic?url'
import esAff from '../../../node_modules/dictionary-es/index.aff?url'
import esDic from '../../../node_modules/dictionary-es/index.dic?url'
import type { SpellLanguage } from './languages'
import type { SpellRequest } from './spellWorker'

/** Each dictionary's files; only the chosen language's are ever downloaded. */
const FILES: Record<SpellLanguage, { aff: string; dic: string }> = {
  'en-US': { aff: enAff, dic: enDic },
  'en-GB': { aff: enGbAff, dic: enGbDic },
  'en-AU': { aff: enAuAff, dic: enAuDic },
  'en-CA': { aff: enCaAff, dic: enCaDic },
  es: { aff: esAff, dic: esDic },
}

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

function workerService(lang: SpellLanguage): SpellService {
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
    aff: new URL(FILES[lang].aff, location.href).href,
    dic: new URL(FILES[lang].dic, location.href).href,
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

const services = new Map<SpellLanguage, SpellService>()
let override: ((lang: SpellLanguage) => SpellService) | null = null

/** The checker for a language: one background worker per language used. */
export function getSpellService(lang: SpellLanguage = 'en-US'): SpellService {
  if (override) return override(lang)
  let service = services.get(lang)
  if (!service) {
    service = workerService(lang)
    services.set(lang, service)
  }
  return service
}

export function setSpellServiceForTests(
  s: SpellService | ((lang: SpellLanguage) => SpellService) | null,
): void {
  override = s === null ? null : typeof s === 'function' ? s : () => s
}
