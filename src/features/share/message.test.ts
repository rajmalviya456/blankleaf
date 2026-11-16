import { formatShareMessage } from './message'

const now = Date.UTC(2026, 10, 17, 14, 32, 0)
const link = 'https://x.dev/notepadz/#/s/abc.def.p'

describe('formatShareMessage', () => {
  it('formats the message with password', () => {
    expect(
      formatShareMessage({
        link,
        password: 'kq7m-x3vr-p9tz',
        expiresAt: now + 300_000,
        now,
        locale: 'en-US',
        timeZone: 'UTC',
      }),
    ).toBe(
      `Hey! A note was shared with you on Notepadz.\n\nOpen it: ${link}\nPassword: kq7m-x3vr-p9tz\n\nThis link expires on Nov 17, 2026 at 2:37 PM (in 5 minutes).`,
    )
  })

  it('omits the password line when there is none', () => {
    const m = formatShareMessage({
      link,
      password: null,
      expiresAt: now + 300_000,
      now,
      locale: 'en-US',
      timeZone: 'UTC',
    })
    expect(m).not.toMatch(/Password/)
    expect(m).toContain(`Open it: ${link}\n\nThis link expires`)
  })

  it.each([
    [3_600_000, 'in 1 hour'],
    [86_400_000, 'in 1 day'],
    [7 * 86_400_000, 'in 7 days'],
    [60_000, 'in 1 minute'],
  ])('relative wording for %sms', (ms, text) => {
    expect(
      formatShareMessage({
        link,
        password: null,
        expiresAt: now + ms,
        now,
        locale: 'en-US',
        timeZone: 'UTC',
      }),
    ).toContain(`(${text})`)
  })
})
