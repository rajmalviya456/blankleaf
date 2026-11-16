/** Slim bottom bar. Real content (position, counts, save state) in Task 6. */
export function StatusBar() {
  return (
    <footer
      role="status"
      className="flex h-6 shrink-0 items-center gap-4 border-t border-border bg-bg-sunken px-3 text-[11px] text-fg-faint"
    >
      <span className="ml-auto">Ready</span>
    </footer>
  )
}
