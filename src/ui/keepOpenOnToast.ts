/**
 * For a dialog's onInteractOutside: a tap on a toast (its Undo, say) isn't a tap "outside" the
 * dialog, so the dialog stays open. On touch screens Radix decides on the click, by which time
 * a tapped toast button may already be gone from the page, so a detached target counts too.
 * Menus don't use this: a click on a toast closes them like any other outside click.
 */
export function keepOpenOnToast(e: Event): void {
  const t = e.target
  if (t instanceof Element && (!t.isConnected || t.closest('[data-toaster]'))) e.preventDefault()
}
