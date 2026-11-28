/**
 * Keeps one failing part of the share page from emptying the whole page: React removes
 * everything when rendering throws and nothing catches it. A Markdown preview can fail on its
 * own (its code is a separate download a deploy can delete, and a sender can share text too
 * deeply nested for it), and the recipient must still be able to save their copy.
 */
import { Component, type ErrorInfo, type ReactNode } from 'react'

export class ShareErrorBoundary extends Component<
  { fallback: ReactNode; children: ReactNode },
  { failed: boolean }
> {
  state = { failed: false }

  static getDerivedStateFromError() {
    return { failed: true }
  }

  componentDidCatch(error: unknown, info: ErrorInfo) {
    console.error('Blankleaf: part of the share page failed', error, info.componentStack)
  }

  render() {
    return this.state.failed ? this.props.fallback : this.props.children
  }
}
