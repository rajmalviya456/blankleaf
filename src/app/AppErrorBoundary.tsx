/**
 * Last line of defence: if rendering ever throws, React would empty the page. This shows a way
 * out instead: save a backup of the notes (still in memory) and reload.
 */
import { Component, type ErrorInfo, type ReactNode } from 'react'
import { exportAll } from '../features/backup/actions'

export class AppErrorBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false }

  static getDerivedStateFromError() {
    return { failed: true }
  }

  componentDidCatch(error: unknown, info: ErrorInfo) {
    console.error('Blankleaf: the app stopped', error, info.componentStack)
  }

  render() {
    if (!this.state.failed) return this.props.children
    const button =
      'h-9 rounded-md border border-border px-3 text-[13px] text-fg hover:bg-bg-hover focus-visible:outline-2 focus-visible:outline-accent'
    return (
      <div className="grid min-h-dvh place-items-center bg-bg p-6 font-[family-name:var(--font-ui)] text-fg">
        <div role="alert" className="max-w-sm space-y-3 text-center">
          <h1 className="text-[15px] font-medium">Something went wrong</h1>
          <p className="text-[13px] text-fg-muted">
            Blankleaf stopped working. Download a backup of your notes first, then reload the page.
          </p>
          <div className="flex justify-center gap-2">
            {/* No dialogs can open now: saved as it is (encrypted if a backup password is set). */}
            <button
              type="button"
              className={button}
              onClick={() => void exportAll(Date.now(), 'plain')}
            >
              Download a backup
            </button>
            <button
              type="button"
              className={`${button} border-accent bg-accent text-accent-fg hover:bg-accent`}
              onClick={() => location.reload()}
            >
              Reload
            </button>
          </div>
        </div>
      </div>
    )
  }
}
