import * as Dialog from '@radix-ui/react-dialog'
import { ExternalLink, X } from 'lucide-react'
import { MarkdownPreview } from '../editor/MarkdownPreview'
import { getStore, useAppStore } from '../../store/store'
import changelog from '../../../CHANGELOG.md?raw'
import { releaseNotes } from './whatsNew'
import { DialogSurface } from '../../ui/DialogSurface'

const NOTES = releaseNotes(changelog)

/** Release notes, generated from CHANGELOG.md at build time (no network needed). */
export function WhatsNewDialog() {
  const open = useAppStore((s) => s.ui.whatsNewOpen)
  const setOpen = (o: boolean) => getStore().getState().setUi({ whatsNewOpen: o })

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Portal>
        <Dialog.Overlay className="np-overlay fixed inset-0 z-40" />
        <DialogSurface
          aria-describedby={undefined}
          className="fixed left-1/2 top-[8vh] z-50 flex max-h-[84vh] w-[min(620px,calc(100vw-32px))] -translate-x-1/2 flex-col rounded-xl border border-border bg-bg-elev shadow-2xl outline-none"
        >
          <header className="flex items-center gap-2 border-b border-border px-4 py-3">
            <Dialog.Title className="flex-1 text-sm font-medium text-fg">What’s new</Dialog.Title>
            <span className="text-[11.5px] tabular-nums text-fg-muted">
              You have {__APP_VERSION__}
            </span>
            <Dialog.Close
              aria-label="Close"
              className="grid size-7 place-items-center rounded-md text-fg-muted hover:bg-bg-hover hover:text-fg"
            >
              <X size={15} />
            </Dialog.Close>
          </header>
          <div className="min-h-0 overflow-y-auto">
            <MarkdownPreview source={NOTES} className="release-notes" />
          </div>
          <footer className="border-t border-border px-4 py-2.5 text-[11.5px] text-fg-muted">
            <a
              href="https://github.com/rajmalviya456/blankleaf/releases"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 hover:text-fg"
            >
              All releases on GitHub <ExternalLink size={11} aria-hidden />
            </a>
          </footer>
        </DialogSurface>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
