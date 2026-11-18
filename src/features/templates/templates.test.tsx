import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it } from 'vitest'
import { stubMedia } from '../../../tests/media'
import { App } from '../../app/App'
import { COMMANDS } from '../../commands/registry'
import { createAppStore, initStore } from '../../store/store'
import { phoneStore } from '../phone/phoneStore'
import { newFromTemplate, TEMPLATES } from './templates'

let media: ReturnType<typeof stubMedia> | undefined
afterEach(() => media?.restore())

const NOW = new Date(2026, 10, 18, 9, 30).getTime()

describe('note templates', () => {
  it('offers journal, meeting notes, checklist and to-do', () => {
    expect(TEMPLATES.map((t) => t.label)).toEqual([
      'Daily journal',
      'Meeting notes',
      'Checklist',
      'To-do list',
    ])
  })

  it.each(TEMPLATES.map((t) => [t.label, t.id] as const))(
    '%s opens as a new Markdown note with the cursor at the end',
    (_, id) => {
      const store = initStore(createAppStore())
      const s = () => store.getState()
      const note = newFromTemplate(store, id, NOW)
      expect(s().session.activeTabId).toBe(note)
      expect(s().notes[note].mode).toBe('markdown')
      expect(s().notes[note].content).toMatch(/^# /)
      expect(s().session.perTab[note].head).toBe(s().notes[note].content.length)
    },
  )

  it('dates the journal and meeting notes', () => {
    const date = new Date(NOW).toLocaleDateString(undefined, { dateStyle: 'long' })
    for (const id of ['journal', 'meeting'] as const)
      expect(TEMPLATES.find((t) => t.id === id)!.content(NOW)).toContain(date)
  })

  it('checklists are real task lists', () => {
    for (const id of ['checklist', 'todo'] as const)
      expect(TEMPLATES.find((t) => t.id === id)!.content(NOW)).toContain('- [ ] ')
  })

  it('each template is a palette command', () => {
    const titles = COMMANDS.filter((c) => c.id.startsWith('note.template.')).map((c) => c.title)
    expect(titles).toEqual(TEMPLATES.map((t) => `New from template: ${t.label}`))
  })

  it.each([
    ['laptop', false],
    ['phone', true],
  ])('can be picked from the app (%s)', async (_, phone) => {
    media = stubMedia({ phone, touch: phone })
    phoneStore.setState({ stack: phone ? ['tabs'] : [] })
    const store = initStore(createAppStore())
    store.getState().newNote()
    const user = userEvent.setup()
    render(<App />)
    await user.click(await screen.findByRole('button', { name: 'New from template' }))
    await user.click(await screen.findByRole('menuitem', { name: 'Checklist' }))
    const s = store.getState()
    expect(s.notes[s.session.activeTabId!].content).toContain('# Checklist')
    expect(phoneStore.getState().stack).toEqual([])
    phoneStore.setState({ stack: [] })
  })
})
