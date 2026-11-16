/** Collapsible side panel (notes / search / trash). Content arrives in Task 9. */
export function SidePanel({ open }: { open: boolean }) {
  if (!open) return null
  return (
    <aside
      aria-label="Side panel"
      className="w-64 shrink-0 overflow-y-auto border-r border-border bg-bg-elev"
    />
  )
}
