import { createStore } from 'zustand'
import type { ImportPlan } from './backup'

interface ImportState {
  open: boolean
  fileName: string
  plan: ImportPlan | null
  error: string | null
  /** An encrypted backup waiting for its password. */
  encrypted: string | null
  show(p: { fileName: string; plan?: ImportPlan; error?: string; encrypted?: string }): void
  close(): void
}

/** State of the "Import backup" dialog. */
export const importStore = createStore<ImportState>()((set) => ({
  open: false,
  fileName: '',
  plan: null,
  error: null,
  encrypted: null,
  show: ({ fileName, plan, error, encrypted }) =>
    set({
      open: true,
      fileName,
      plan: plan ?? null,
      error: error ?? null,
      encrypted: encrypted ?? null,
    }),
  close: () => set({ open: false, plan: null, error: null, encrypted: null }),
}))
