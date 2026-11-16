import { createStore } from 'zustand'

export type ToastTone = 'info' | 'warn' | 'error'

export interface ToastAction {
  label: string
  run(): void
}

export interface ToastItem {
  id: number
  msg: string
  tone: ToastTone
  action?: ToastAction
  /** 0 = stays until dismissed. */
  durationMs: number
}

export interface ToastOptions {
  action?: ToastAction
  tone?: ToastTone
  durationMs?: number
}

interface ToastState {
  toasts: ToastItem[]
  push(t: Omit<ToastItem, 'id'>): number
  dismiss(id: number): void
  clear(): void
}

let nextId = 1

export const toastStore = createStore<ToastState>()((set, get) => ({
  toasts: [],
  push(t) {
    const id = nextId++
    // Keep the stack short; newest last.
    set({ toasts: [...get().toasts, { ...t, id }].slice(-4) })
    return id
  },
  dismiss(id) {
    set({ toasts: get().toasts.filter((t) => t.id !== id) })
  },
  clear() {
    set({ toasts: [] })
  },
}))

/** Show a small non-blocking message. Returns its id (for dismiss). */
export function toast(msg: string, opts: ToastOptions = {}): number {
  return toastStore.getState().push({
    msg,
    tone: opts.tone ?? 'info',
    action: opts.action,
    durationMs: opts.durationMs ?? (opts.action ? 8000 : 4000),
  })
}
