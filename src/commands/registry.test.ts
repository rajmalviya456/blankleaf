import { COMMANDS } from './registry'

const key = (c: (typeof COMMANDS)[number]) =>
  c.shortcuts.map((s) => `${s.mod ? 'm' : ''}${s.mod2 ? 'M' : ''}${s.shift ? 's' : ''}${s.code}`)

describe('command registry', () => {
  it('all command ids are unique', () => {
    const ids = COMMANDS.map((c) => c.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('no two commands share a shortcut', () => {
    const all = COMMANDS.flatMap(key)
    expect(new Set(all).size).toBe(all.length)
  })

  it('no shortcut uses mod+shift+KeyP (Firefox private window)', () => {
    expect(COMMANDS.flatMap(key)).not.toContain('msKeyP')
  })

  it('covers the spec shortcuts', () => {
    const byId = Object.fromEntries(COMMANDS.map((c) => [c.id, key(c)]))
    expect(byId['palette.open']).toContain('mKeyK')
    expect(byId['note.new']).toContain('MKeyN')
    expect(byId['tab.close']).toContain('MKeyW')
    expect(byId['tab.reopen']).toContain('MsKeyT')
    expect(byId['tab.next']).toContain('MBracketRight')
    expect(byId['tab.prev']).toContain('MBracketLeft')
    expect(byId['tab.goto1']).toContain('MDigit1')
    expect(byId['tab.goto9']).toContain('MDigit9')
    expect(byId['view.sidebar']).toContain('mKeyB')
    expect(byId['view.search']).toContain('msKeyF')
    expect(byId['view.zen']).toContain('mPeriod')
    expect(byId['tab.rename']).toContain('F2')
    expect(byId['app.settings']).toContain('mComma')
  })
})
