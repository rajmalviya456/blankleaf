import { createStore } from 'zustand/vanilla'

/** Why the backup password dialog is open. */
export type PasswordAsk = 'export' | 'folder' | 'set' | 'change'
export type PasswordAnswer = 'set' | 'plain' | 'cancel'

interface State {
  asking: PasswordAsk | null
  ask(why: PasswordAsk): Promise<PasswordAnswer>
  answer(a: PasswordAnswer): void
}

let resolve: ((a: PasswordAnswer) => void) | null = null

/** The "Protect your backups with a password" dialog, as a question with an answer. */
export const backupPasswordStore = createStore<State>()((set) => ({
  asking: null,
  ask: (why) => {
    resolve?.('cancel')
    set({ asking: why })
    return new Promise((r) => (resolve = r))
  },
  answer: (a) => {
    set({ asking: null })
    resolve?.(a)
    resolve = null
  },
}))
