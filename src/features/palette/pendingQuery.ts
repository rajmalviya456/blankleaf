/**
 * What was typed into the palette while its code was still loading. The real palette starts
 * with it, so a fast ⌘K-then-type never loses letters (or sends them into the note).
 */
let pending = ''

export function setPendingQuery(q: string) {
  pending = q
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
