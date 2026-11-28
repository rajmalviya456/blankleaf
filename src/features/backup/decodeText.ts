/**
 * A file's text, in whichever encoding it was saved. Most files are UTF-8, but Windows tools
 * still write UTF-16 marked with a byte order mark (PowerShell 5.1's `>`, Excel's "Unicode
 * Text", .reg exports), and older programs Windows-1252 ("ANSI"), which is rarely valid UTF-8.
 */
const MARKED: [encoding: string, bom: number[]][] = [
  ['utf-8', [0xef, 0xbb, 0xbf]],
  ['utf-16le', [0xff, 0xfe]],
  ['utf-16be', [0xfe, 0xff]],
]

export async function decodeText(file: Blob): Promise<string> {
  const bytes = new Uint8Array(await file.arrayBuffer())
  const marked = MARKED.find(([, bom]) => bom.every((b, i) => bytes[i] === b))
  // The decoder drops the byte order mark itself.
  if (marked) return new TextDecoder(marked[0]).decode(bytes)
  try {
    return new TextDecoder('utf-8', { fatal: true }).decode(bytes)
  } catch {
    return new TextDecoder('windows-1252').decode(bytes)
  }
}
