import { createStore } from 'zustand'
export const symbolStore = createStore<{ open: boolean; setOpen(o: boolean): void }>()((set) => ({
  open: false,
  setOpen: (open) => set({ open }),
}))
