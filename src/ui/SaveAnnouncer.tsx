/**
 * Tells screen readers about saving only when it matters: when the latest changes couldn't be
 * saved, and when saving works again after that. Saving itself happens after every pause in
 * typing, so announcing it would talk over the writing. The visible state is shown elsewhere.
 */
import { useState } from 'react'
import { useAppStore } from '../store/store'

export function SaveAnnouncer() {
  const status = useAppStore((s) => s.ui.saveStatus)
  const [seen, setSeen] = useState(status)
  const [hadError, setHadError] = useState(status === 'error')
  const [text, setText] = useState(status === 'error' ? 'Not saved' : '')
  // React's way to follow a change between renders: adjust state while rendering.
  if (status !== seen) {
    setSeen(status)
    if (status === 'error') {
      setHadError(true)
      setText('Not saved')
    } else if (status === 'saved') {
      setText(hadError ? 'Saved' : '')
      setHadError(false)
    } else setText('')
  }
  return (
    <span role="status" aria-label="Save status" className="sr-only">
      {text}
    </span>
  )
}
