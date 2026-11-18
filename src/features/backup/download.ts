/** Save a file through the browser's normal download flow. */
export function downloadBlob(name: string, blob: Blob): void {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = name
  a.rel = 'noopener'
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

/** Save text as a file. */
export function downloadText(name: string, mime: string, text: string): void {
  downloadBlob(name, new Blob([text], { type: mime }))
}
