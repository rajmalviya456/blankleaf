/**
 * What was typed into the palette while its code was still loading. The real palette starts
 * with it, so a fast ⌘K-then-type never loses letters (or sends them into the note).
 */
let pending = ''
let submitted = false

export function setPendingQuery(q: string) {
  pending = q
  submitted = false
}

/** Enter was pressed while loading: the palette runs its top result once it is ready. */
export function submitPendingQuery() {
  submitted = true
}

export function takePendingSubmit(): boolean {
  const s = submitted
  submitted = false
  return s
}

/** Read without clearing: safe in a render, which React may run more than once. */
export function peekPendingQuery(): string {
  return pending
}

export function takePendingQuery(): string {
  const q = pending
  pending = ''
  return q
}
