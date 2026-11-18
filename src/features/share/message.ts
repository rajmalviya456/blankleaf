interface MessageOptions {
  link: string
  password: string | null
  expiresAt: number
  now: number
  locale?: string
  timeZone?: string
}

/** Some ICU builds put narrow/no-break spaces in times (e.g. before "PM"); chat apps prefer plain ones. */
const plainSpaces = (s: string) => s.replace(/[\u202f\u00a0]/g, ' ')

function relative(ms: number): string {
  const minutes = Math.max(1, Math.round(ms / 60_000))
  if (minutes < 60) return `in ${minutes} minute${minutes === 1 ? '' : 's'}`
  const hours = Math.round(minutes / 60)
  if (hours < 24) return `in ${hours} hour${hours === 1 ? '' : 's'}`
  const days = Math.round(hours / 24)
  return `in ${days} day${days === 1 ? '' : 's'}`
}

/** The ready-to-send text copied when a link is created (spec §5.1). Never includes the title. */
export function formatShareMessage(o: MessageOptions): string {
  const when = new Date(o.expiresAt)
  const date = plainSpaces(
    new Intl.DateTimeFormat(o.locale, { dateStyle: 'medium', timeZone: o.timeZone }).format(when),
  )
  const time = plainSpaces(
    new Intl.DateTimeFormat(o.locale, { timeStyle: 'short', timeZone: o.timeZone }).format(when),
  )
  const lines = ['Hey! A note was shared with you on Blankleaf.', '', `Open it: ${o.link}`]
  if (o.password) lines.push(`Password: ${o.password}`)
  lines.push('', `This link expires on ${date} at ${time} (${relative(o.expiresAt - o.now)}).`)
  return lines.join('\n')
}
