import { useEffect, useState } from 'react'

const pad = (n: number) => String(n).padStart(2, '0')

/** "4:07", "59:59", "1:00:00", "2d 3:04"; partial seconds round up so 0:00 means really over. */
export function formatCountdown(msLeft: number): string {
  const total = Math.max(0, Math.ceil(msLeft / 1000))
  const d = Math.floor(total / 86_400)
  const h = Math.floor((total % 86_400) / 3600)
  const m = Math.floor((total % 3600) / 60)
  const s = total % 60
  if (d > 0) return `${d}d ${h}:${pad(m)}`
  if (h > 0) return `${h}:${pad(m)}:${pad(s)}`
  return `${m}:${pad(s)}`
}

/** Live countdown that re-renders every second and stops at zero. */
export function useCountdown(
  expiresAt: number,
  now: () => number = Date.now,
): { msLeft: number; label: string; expired: boolean } {
  const [clock, setClock] = useState(() => ({ target: expiresAt, t: now() }))
  // A new target restarts the clock from the current time (adjusting state during render).
  let t = clock.t
  if (clock.target !== expiresAt) {
    t = now()
    setClock({ target: expiresAt, t })
  }
  useEffect(() => {
    if (expiresAt <= now()) return
    const id = setInterval(() => {
      const n = now()
      setClock({ target: expiresAt, t: n })
      if (n >= expiresAt) clearInterval(id)
    }, 1000)
    return () => clearInterval(id)
  }, [expiresAt, now])
  const msLeft = Math.max(0, expiresAt - t)
  return { msLeft, label: formatCountdown(msLeft), expired: msLeft === 0 }
}
