export interface DebouncedWriter<V> {
  /** Queue `v` for `key`; replaces any pending value and restarts the delay. */
  schedule(key: string, v: V): void
  /** Write every pending value now and wait for all in-flight writes. */
  flush(): Promise<void>
  /** True if `key` (or any key) has a value waiting or a write in flight. */
  hasPending(key?: string): boolean
  cancel(key: string): void
}

/**
 * Per-key debounce with explicit flush. Writes for the same key never overlap: each
 * waits for the previous one, which matters for rev-checked saves. A write that
 * throws does not block later writes (the write function owns error reporting).
 */
export function createDebouncedWriter<V>(
  write: (key: string, v: V) => Promise<void>,
  delayMs: number,
): DebouncedWriter<V> {
  const pending = new Map<string, { value: V; timer: ReturnType<typeof setTimeout> }>()
  const chains = new Map<string, Promise<void>>()
  const inflight = new Map<string, number>()

  const run = (key: string) => {
    const entry = pending.get(key)
    if (!entry) return
    clearTimeout(entry.timer)
    pending.delete(key)
    inflight.set(key, (inflight.get(key) ?? 0) + 1)
    const prev = chains.get(key) ?? Promise.resolve()
    const next = prev
      .then(() => write(key, entry.value))
      .catch(() => {})
      .finally(() => {
        const left = (inflight.get(key) ?? 1) - 1
        if (left) inflight.set(key, left)
        else inflight.delete(key)
        if (chains.get(key) === next) chains.delete(key)
      })
    chains.set(key, next)
  }

  return {
    schedule(key, value) {
      const existing = pending.get(key)
      if (existing) clearTimeout(existing.timer)
      pending.set(key, { value, timer: setTimeout(() => run(key), delayMs) })
    },
    async flush() {
      for (const key of [...pending.keys()]) run(key)
      await Promise.all([...chains.values()])
    },
    hasPending(key) {
      if (key === undefined) return pending.size > 0 || inflight.size > 0
      return pending.has(key) || inflight.has(key)
    },
    cancel(key) {
      const entry = pending.get(key)
      if (entry) clearTimeout(entry.timer)
      pending.delete(key)
    },
  }
}
