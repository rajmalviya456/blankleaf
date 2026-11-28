/**
 * If a note can't be drawn as formatted text (Markdown nested thousands of levels deep runs the
 * renderer out of stack), its plain text shows instead of the whole app stopping.
 */
import { Component, type ReactNode } from 'react'

interface Props {
  /** The text being drawn: shown as it is if drawing fails. Changing it tries again. */
  source: string
  children: ReactNode
}

export class PreviewBoundary extends Component<Props, { failed: boolean; source: string }> {
  state = { failed: false, source: this.props.source }

  static getDerivedStateFromError() {
    return { failed: true }
  }

  // Fixing the text brings the preview back.
  static getDerivedStateFromProps(props: Props, state: { source: string }) {
    return props.source === state.source ? null : { failed: false, source: props.source }
  }

  render() {
    if (!this.state.failed) return this.props.children
    return (
      <div className="md-preview">
        <p className="text-warn">This part couldn’t be shown as formatted text.</p>
        <pre className="whitespace-pre-wrap break-words">{this.props.source}</pre>
      </div>
    )
  }
}
