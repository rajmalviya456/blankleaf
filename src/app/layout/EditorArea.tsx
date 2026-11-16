import type { ReactNode } from 'react'

/** Fills all remaining space; hosts the editor (Task 6). */
export function EditorArea({ children }: { children?: ReactNode }) {
  return <main className="relative flex min-h-0 min-w-0 flex-1 flex-col bg-bg">{children}</main>
}
