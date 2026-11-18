import * as DropdownMenu from '@radix-ui/react-dropdown-menu'
import type { ReactNode } from 'react'
import { getStore } from '../../store/store'
import { newFromTemplate, TEMPLATES } from './templates'

/** A menu of note templates; `onPicked` runs after the new note opens. */
export function TemplateMenu({
  className,
  children,
  onPicked,
}: {
  className: string
  children: ReactNode
  onPicked?(): void
}) {
  return (
    <DropdownMenu.Root modal={false}>
      <DropdownMenu.Trigger
        aria-label="New from template"
        title="New from template"
        className={className}
      >
        {children}
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content
          align="start"
          sideOffset={4}
          className="z-50 min-w-44 rounded-md border border-border bg-bg-elev p-1 shadow-lg"
        >
          <DropdownMenu.Label className="px-2 py-1 text-[11px] text-fg-faint">
            New from template
          </DropdownMenu.Label>
          {TEMPLATES.map((t) => (
            <DropdownMenu.Item
              key={t.id}
              onSelect={() => {
                newFromTemplate(getStore(), t.id)
                onPicked?.()
              }}
              className="flex cursor-default select-none items-center rounded px-2 py-1.5 text-[12.5px] text-fg outline-none data-[highlighted]:bg-accent-soft max-sm:min-h-11 max-sm:text-[15px]"
            >
              {t.label}
            </DropdownMenu.Item>
          ))}
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  )
}
