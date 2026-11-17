import * as Dialog from '@radix-ui/react-dialog'
import {
  ChevronLeft,
  Contrast,
  Info,
  Settings as SettingsIcon,
  Share2,
  Sparkles,
} from 'lucide-react'
import type { ReactNode } from 'react'
import { useCountdown } from '../share/countdown'
import { useActiveShares } from '../share/useActiveShares'
import { NotesList } from '../sidebar/NotesList'
import { SearchPanel } from '../sidebar/SearchPanel'
import { TrashPanel } from '../sidebar/TrashPanel'
import { nextThemePref } from '../../lib/theme'
import { getStore, useAppStore } from '../../store/store'
import { phoneStore, usePhone, type LibrarySection } from './phoneStore'

const SECTIONS: { id: LibrarySection; label: string }[] = [
  { id: 'notes', label: 'Notes' },
  { id: 'search', label: 'Search' },
  { id: 'trash', label: 'Trash' },
]

function FooterRow({ icon, label, onClick }: { icon: ReactNode; label: string; onClick(): void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex h-12 w-full items-center gap-3 rounded-lg px-3 text-left text-[15px] text-fg active:bg-bg-hover"
    >
      <span className="text-fg-muted">{icon}</span>
      {label}
    </button>
  )
}

function SharingRow() {
  const shares = useActiveShares()
  const { label } = useCountdown(shares[0]?.expiresAt ?? 0)
  if (!shares.length) return null
  const text =
    shares.length === 1
      ? `Sharing 1 note · ${label} left`
      : `Sharing ${shares.length} notes · next ends in ${label}`
  return (
    <FooterRow
      icon={<Share2 size={18} className="text-accent" />}
      label={text}
      onClick={() => phoneStore.getState().open('shares')}
    />
  )
}

/** Full-screen notes / search / trash on phones, with app links in the footer. */
export function Library({ open, onClose }: { open: boolean; onClose(): void }) {
  const section = usePhone((p) => p.librarySection)
  const theme = useAppStore((s) => s.settings.theme)
  const s = () => getStore().getState()
  /** Open an app dialog: close the Library first so Back returns to the note. */
  const dialog = (ui: Parameters<ReturnType<typeof s>['setUi']>[0]) => {
    phoneStore.getState().closeAll()
    s().setUi(ui)
  }
  const opened = () => phoneStore.getState().closeAll()

  return (
    <Dialog.Root open={open} onOpenChange={(o) => !o && onClose()}>
      <Dialog.Portal>
        <Dialog.Content
          aria-describedby={undefined}
          className="np-library fixed inset-0 z-40 flex flex-col bg-bg-elev pb-[env(safe-area-inset-bottom)] pt-[env(safe-area-inset-top)] outline-none"
        >
          <header className="flex h-12 shrink-0 items-center gap-1 border-b border-border px-1">
            <Dialog.Close
              aria-label="Close Library"
              className="grid size-11 place-items-center rounded-lg text-fg-muted active:bg-bg-hover"
            >
              <ChevronLeft size={22} />
            </Dialog.Close>
            <Dialog.Title className="flex-1 text-[15px] font-semibold text-fg">
              Library
            </Dialog.Title>
          </header>
          <div
            role="tablist"
            aria-label="Library sections"
            className="mx-3 my-2 grid shrink-0 grid-cols-3 rounded-lg bg-bg-hover p-0.5"
          >
            {SECTIONS.map(({ id, label }) => (
              <button
                key={id}
                type="button"
                role="tab"
                aria-selected={section === id}
                onClick={() => phoneStore.getState().setLibrarySection(id)}
                className="h-10 rounded-md text-[14px] text-fg-muted aria-selected:bg-bg-elev aria-selected:font-medium aria-selected:text-fg aria-selected:shadow-sm"
              >
                {label}
              </button>
            ))}
          </div>
          <div role="tabpanel" className="np-library-panel flex min-h-0 flex-1 flex-col">
            {section === 'notes' && <NotesList onOpened={opened} />}
            {section === 'search' && <SearchPanel onOpened={opened} />}
            {section === 'trash' && <TrashPanel />}
          </div>
          <nav aria-label="App" className="shrink-0 border-t border-border p-1">
            <SharingRow />
            <FooterRow
              icon={<SettingsIcon size={18} />}
              label="Settings"
              onClick={() => dialog({ settingsOpen: true })}
            />
            <FooterRow
              icon={<Sparkles size={18} />}
              label="What’s new"
              onClick={() => dialog({ whatsNewOpen: true })}
            />
            <FooterRow
              icon={<Info size={18} />}
              label="About"
              onClick={() => dialog({ aboutOpen: true })}
            />
            <FooterRow
              icon={<Contrast size={18} />}
              label={`Theme: ${theme[0].toUpperCase()}${theme.slice(1)}`}
              onClick={() => s().updateSettings({ theme: nextThemePref(theme) })}
            />
          </nav>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
