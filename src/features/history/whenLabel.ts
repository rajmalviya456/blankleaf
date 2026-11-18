const MIN = 60_000

/** "Just now", "12 min ago", "Today, 14:05", "Yesterday, 09:30" or a full date. */
export function whenLabel(at: number, now = Date.now()): string {
  const ago = now - at
  if (ago < MIN) return 'Just now'
  if (ago < 60 * MIN) return `${Math.floor(ago / MIN)} min ago`
  const d = new Date(at)
  const time = d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })
  const day = (n: number) => new Date(n).toDateString()
  if (day(at) === day(now)) return `Today, ${time}`
  if (day(at) === day(now - 86_400_000)) return `Yesterday, ${time}`
  return d.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })
}
