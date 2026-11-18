/** Ready-made Markdown notes, offered next to "New note". */
import type { StoreApi } from 'zustand'
import type { AppStore } from '../../store/store'

export type TemplateId = 'journal' | 'meeting' | 'checklist' | 'todo'

export interface Template {
  id: TemplateId
  label: string
  content(now: number): string
}

const longDate = (now: number) => new Date(now).toLocaleDateString(undefined, { dateStyle: 'long' })

export const TEMPLATES: readonly Template[] = [
  {
    id: 'journal',
    label: 'Daily journal',
    content: (now) => `# Journal: ${longDate(now)}

## Grateful for

-

## Today's focus

- [ ]

## Notes

`,
  },
  {
    id: 'meeting',
    label: 'Meeting notes',
    content: (now) => `# Meeting notes: ${longDate(now)}

**Attendees:**

## Agenda

-

## Decisions

-

## Action items

- [ ]

## Notes

`,
  },
  {
    id: 'checklist',
    label: 'Checklist',
    content: () => `# Checklist

- [ ]
- [ ]
- [ ] `,
  },
  {
    id: 'todo',
    label: 'To-do list',
    content: () => `# To-do

## Today

- [ ]

## This week

- [ ]

## Later

- [ ] `,
  },
]

/** Open a new note from a template, ready to type at its end. Returns the note's id. */
export function newFromTemplate(
  store: StoreApi<AppStore>,
  id: TemplateId,
  now: number = Date.now(),
): string {
  const template = TEMPLATES.find((t) => t.id === id)!
  const content = template.content(now)
  const s = store.getState()
  const note = s.newNote({ content, mode: 'markdown', language: 'markdown' })
  s.setViewState(note, { anchor: content.length, head: content.length })
  return note
}
