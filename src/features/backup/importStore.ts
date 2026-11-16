import { createStore } from 'zustand'
import type { ImportPlan } from './backup'

interface ImportState {
  open: boolean
  fileName: string
  plan: ImportPlan | null
  error: string | null
  show(p: { fileName: string; plan?: ImportPlan; error?: string }): void
  close(): void
}

/** State of the "Import backup" dialog. */
export const importStore = createStore<ImportState>()((set) => ({
  open: false,
  fileName: '',
  plan: null,
  error: null,
  show: ({ fileName, plan, error }) =>
    set({ open: true, fileName, plan: plan ?? null, error: error ?? null }),
  close: () => set({ open: false, plan: null, error: null }),
}))
