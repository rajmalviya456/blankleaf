/// <reference lib="webworker" />
/** Spell checking off the main thread, so typing never waits for the dictionary. */
import { createChecker, type Checker } from './checker'

export type SpellRequest =
  | { id: number; type: 'init'; aff: string; dic: string; personal: string[] }
  | { id: number; type: 'check'; words: string[] }
  | { id: number; type: 'suggest'; word: string }
  | { id: number; type: 'add'; word: string }

let checker: Checker | null = null

self.onmessage = async (e: MessageEvent<SpellRequest>) => {
  const m = e.data
  try {
    if (m.type === 'init') {
      const [aff, dic] = await Promise.all([
        fetch(m.aff).then((r) => r.text()),
        fetch(m.dic).then((r) => r.text()),
      ])
      checker = createChecker(aff, dic, m.personal)
      self.postMessage({ id: m.id, result: true })
    } else if (!checker) {
      throw new Error('Spell checker not ready')
    } else if (m.type === 'check') {
      self.postMessage({ id: m.id, result: m.words.filter((w) => !checker!.correct(w)) })
    } else if (m.type === 'suggest') {
      self.postMessage({ id: m.id, result: checker.suggest(m.word) })
    } else {
      checker.add(m.word)
      self.postMessage({ id: m.id, result: true })
    }
  } catch (err) {
    self.postMessage({ id: m.id, error: String(err) })
  }
}
