import * as Dialog from '@radix-ui/react-dialog'
import { X } from 'lucide-react'
import type { Settings } from '../../domain/types'
import { getStore, useAppStore } from '../../store/store'
import { AboutSection } from './sections/AboutSection'
import { AppearanceSection } from './sections/AppearanceSection'
import { DataSection } from './sections/DataSection'
import { EditorSection } from './sections/EditorSection'

/** Settings sheet (⌘,). Every change applies live and is saved. */
export function SettingsDialog() {
  const open = useAppStore((s) => s.ui.settingsOpen)
  const settings = useAppStore((s) => s.settings)
  const update = (p: Partial<Settings>) => getStore().getState().updateSettings(p)
  const setOpen = (o: boolean) => getStore().getState().setUi({ settingsOpen: o })

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Portal>
        <Dialog.Overlay className="np-overlay fixed inset-0 z-40" />
        <Dialog.Content
          aria-describedby={undefined}
          className="fixed left-1/2 top-[8vh] z-50 flex max-h-[84vh] w-[min(560px,calc(100vw-32px))] -translate-x-1/2 flex-col rounded-xl border border-border bg-bg-elev shadow-2xl outline-none"
        >
          <header className="flex items-center justify-between border-b border-border px-4 py-3">
            <Dialog.Title className="text-sm font-medium text-fg">Settings</Dialog.Title>
            <Dialog.Close
              aria-label="Close settings"
              className="grid size-7 place-items-center rounded-md text-fg-muted hover:bg-bg-hover hover:text-fg"
            >
              <X size={15} />
            </Dialog.Close>
          </header>
          <div className="space-y-5 overflow-y-auto px-4 py-4">
            <AppearanceSection settings={settings} update={update} />
            <EditorSection settings={settings} update={update} />
            <DataSection settings={settings} update={update} />
            <AboutSection />
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
