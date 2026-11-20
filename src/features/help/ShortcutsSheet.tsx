import * as Dialog from '@radix-ui/react-dialog'
import { X } from 'lucide-react'
import { COMMANDS, type CommandSection } from '../../commands/registry'
import { platform } from '../../lib/platform'
import { formatShortcut } from '../../lib/shortcuts'
import { getStore, useAppStore } from '../../store/store'
import { DialogSurface } from '../../ui/DialogSurface'
import { MARKDOWN_SHORTCUTS, shortcutText } from '../editor/markdownKeys'

const SECTIONS: CommandSection[] = ['Note', 'Tabs', 'View', 'App']

/** CodeMirror's own keys, worth knowing: [what it does, Mac keys, other keys]. */
const EDITOR_KEYS: [string, string[], string[]][] = [
  ['Find and replace', ['⌘F'], ['Ctrl+F']],
  ['Go to line', ['⌘⌥G'], ['Ctrl+Alt+G']],
  ['Select next match', ['⌘D'], ['Ctrl+D']],
  ['Comment line (code notes)', ['⌘/'], ['Ctrl+/']],
  [
    'Collapse or expand a section or block (Markdown, code)',
    ['⌘⌥[', '⌘⌥]'],
    ['Ctrl+Shift+[', 'Ctrl+Shift+]'],
  ],
  ['Collapse or expand everything (Markdown, code)', ['⌃⌥[', '⌃⌥]'], ['Ctrl+Alt+[', 'Ctrl+Alt+]']],
  ['Indent / outdent', ['Tab', '⇧Tab'], ['Tab', 'Shift+Tab']],
  ['Tidy a Markdown table, next / previous cell', ['Tab', '⇧Tab'], ['Tab', 'Shift+Tab']],
  ['Insert a heading, list, table… (Markdown, start of a line)', ['/'], ['/']],
]

const kbdClass = 'rounded border border-border bg-bg-sunken px-1.5 py-px text-[11px] text-fg-muted'
const rowClass = 'flex items-center gap-3 px-3 py-1.5 text-[12.5px]'

/** Cheat sheet generated from the command registry. */
export function ShortcutsSheet() {
  const open = useAppStore((s) => s.ui.shortcutsOpen)
  const p = platform()
  const setOpen = (o: boolean) => getStore().getState().setUi({ shortcutsOpen: o })
  const withKeys = COMMANDS.filter((c) => c.shortcuts.length && !/^tab\.goto[2-9]$/.test(c.id))

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Portal>
        <Dialog.Overlay className="np-overlay fixed inset-0 z-40" />
        <DialogSurface
          aria-describedby={undefined}
          className="fixed left-1/2 top-[10vh] z-50 max-h-[80vh] w-[min(520px,calc(100vw-32px))] -translate-x-1/2 overflow-y-auto rounded-xl border border-border bg-bg-elev p-4 shadow-2xl outline-none"
        >
          <div className="mb-3 flex items-center justify-between">
            <Dialog.Title className="text-sm font-medium text-fg">Keyboard shortcuts</Dialog.Title>
            <Dialog.Close
              aria-label="Close"
              className="grid size-7 place-items-center rounded-md text-fg-muted hover:bg-bg-hover"
            >
              <X size={15} />
            </Dialog.Close>
          </div>
          {SECTIONS.map((section) => {
            const items = withKeys.filter((c) => c.section === section)
            if (!items.length) return null
            return (
              <section key={section} className="mb-3">
                <h3 className="pb-1 text-[10.5px] font-semibold uppercase tracking-wider text-fg-faint">
                  {section}
                </h3>
                <dl className="divide-y divide-border rounded-lg border border-border bg-bg">
                  {items.map((c) => (
                    <div key={c.id} className="flex items-center gap-3 px-3 py-1.5 text-[12.5px]">
                      <dt className="flex-1 text-fg">
                        {c.id === 'tab.goto1'
                          ? 'Go to tab 1–9'
                          : c.id === 'view.sidebar'
                            ? `${c.title} (outside Markdown notes)`
                            : c.title}
                      </dt>
                      <dd className="flex gap-1.5">
                        {c.shortcuts
                          .filter((s) => !s.standaloneOnly)
                          .map((s) => (
                            <kbd
                              key={s.code}
                              className="rounded border border-border bg-bg-sunken px-1.5 py-px text-[11px] text-fg-muted"
                            >
                              {c.id === 'tab.goto1'
                                ? formatShortcut(s, p).replace(/1$/, '1…9')
                                : formatShortcut(s, p)}
                            </kbd>
                          ))}
                      </dd>
                    </div>
                  ))}
                </dl>
              </section>
            )
          })}
          <section aria-labelledby="np-editor-keys" className="mb-3">
            <h3
              id="np-editor-keys"
              className="pb-1 text-[10.5px] font-semibold uppercase tracking-wider text-fg-faint"
            >
              In the editor
            </h3>
            <dl className="divide-y divide-border rounded-lg border border-border bg-bg">
              {EDITOR_KEYS.map(([what, mac, other]) => (
                <div key={what} className={rowClass}>
                  <dt className="flex-1 text-fg">{what}</dt>
                  <dd className="flex gap-1.5">
                    {(p === 'mac' ? mac : other).map((k) => (
                      <kbd key={k} className={kbdClass}>
                        {k}
                      </kbd>
                    ))}
                  </dd>
                </div>
              ))}
            </dl>
          </section>
          <section aria-labelledby="np-markdown-keys" className="mb-3">
            <h3
              id="np-markdown-keys"
              className="pb-1 text-[10.5px] font-semibold uppercase tracking-wider text-fg-faint"
            >
              Formatting in Markdown notes
            </h3>
            <dl className="divide-y divide-border rounded-lg border border-border bg-bg">
              {MARKDOWN_SHORTCUTS.map((m) => (
                <div key={m.key} className={rowClass}>
                  <dt className="flex-1 text-fg">{m.label}</dt>
                  <dd className="flex gap-1.5">
                    <kbd className={kbdClass}>{shortcutText(m.key, p === 'mac')}</kbd>
                  </dd>
                </div>
              ))}
            </dl>
          </section>
          <p className="text-[11px] text-fg-faint">
            {p === 'mac'
              ? '⌃⌥ is Control+Option. Option alone is left alone so you can type [ ] | @.'
              : 'Alt shortcuts ignore AltGr, so you can still type [ ] | @ on any layout.'}
          </p>
        </DialogSurface>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
