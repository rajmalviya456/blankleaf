import type { LanguageId } from './types'

const SAMPLE_CHARS = 4096

const LOG_LINE =
  /^(\[?\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}|\[?\d{2}:\d{2}:\d{2}|\[?(INFO|WARN|WARNING|ERROR|DEBUG|TRACE|FATAL)\b)/

function nonEmptyLines(text: string, max: number): string[] {
  const out: string[] = []
  for (const line of text.split('\n')) {
    if (line.trim()) out.push(line)
    if (out.length >= max) break
  }
  return out
}

function looksLikeYaml(lines: string[]): boolean {
  const body = lines.filter((l) => !/^\s*#/.test(l))
  const keys = body.filter((l) => /^\s*(- )?[\w-]+:(\s|$)/.test(l)).length
  const items = body.filter((l) => /^\s*- \S/.test(l)).length
  return body.length >= 3 && keys >= 2 && (keys + items) / body.length >= 0.8
}

function looksLikeJson(text: string): boolean {
  const t = text.trim()
  if (!/^[[{]/.test(t)) return false
  try {
    JSON.parse(t)
    return true
  } catch {
    // Truncated sample of a big JSON file: accept a strong prefix.
    return t.length >= SAMPLE_CHARS && /^[[{]\s*("[^"]+"\s*:|[[{"\d])/.test(t)
  }
}

/** Best-effort guess of a note's format from its first 4KB. Order matters: most specific first. */
export function detectLanguage(text: string): LanguageId {
  const sample = text.slice(0, SAMPLE_CHARS)
  if (!sample.trim()) return 'plaintext'
  const lines = nonEmptyLines(sample, 10)
  const first = lines[0]?.trim() ?? ''
  const has = (re: RegExp) => re.test(sample)
  const share = (re: RegExp) => lines.filter((l) => re.test(l)).length / lines.length

  if (looksLikeJson(sample)) return 'json'
  if (lines.filter((l) => LOG_LINE.test(l.trim())).length >= 3) return 'log'
  if (/^<\?php/.test(first)) return 'php'
  if (/^<\?xml/.test(first)) return 'xml'
  if (/^<!doctype html|^<html[\s>]/i.test(first) || has(/<(div|span|body|head|p|a)[\s>]/i))
    return 'html'
  if (/^#!.*\b(ba|z|fi)?sh\b/.test(first) || share(/^\$ \S/) >= 0.5) return 'shell'
  // Markdown that embeds code: fences, or a heading plus inline markdown. Checked before the
  // code rules so a ```js block doesn't make the whole note JavaScript.
  if (has(/^```/m)) return 'markdown'
  if (/^#{1,6} \S/.test(first) && has(/\*\*\S|`[^`\n]+`|\[[^\]]+\]\([^)]+\)|^\s*[-*] \[[ x]\]/m))
    return 'markdown'
  if (/^diff --git /.test(first) || (has(/^@@ -\d+(,\d+)? \+\d+/m) && has(/^[+-]/m))) return 'diff'
  if (/^FROM \S+/.test(first) && has(/^(RUN|CMD|COPY|WORKDIR|ENTRYPOINT) /m)) return 'dockerfile'
  if (has(/^package \w+\s*$/m) && has(/^func /m)) return 'go'
  if (has(/^\s*fn \w+\s*\(/m) && has(/\blet (mut )?\w+|println!|->/)) return 'rust'
  // Before Python and JavaScript: Ruby's `def f(x)` and `=>` would match those.
  if (
    has(/^\s*end\s*$/m) &&
    (has(/^\s*(def|class|module)\s+[\w:.]+/m) || has(/\bdo(\s*\|[^|]*\|)?\s*$/m))
  )
    return 'ruby'
  if (has(/^\s*(public |private )?(final )?class \w+/m) && has(/\b(public|static|void)\b/))
    return 'java'
  if (has(/^#include\s*[<"]/m)) return 'cpp'
  if (
    has(/^\s*(def \w+\(|class \w+(\(.*\))?:|from [\w.]+ import |import \w+\s*$)/m) &&
    !has(/[;{}]\s*$/m)
  )
    return 'python'
  if (has(/\b(SELECT\s.+\sFROM|INSERT\s+INTO|UPDATE\s+\w+\s+SET|CREATE\s+TABLE|DELETE\s+FROM)\b/i))
    return 'sql'
  if (has(/^\s*(export )?(interface|type) \w+/m) || has(/\w+\s*:\s*(string|number|boolean|void)\b/))
    return 'typescript'
  if (has(/^\s*(const|let|var|function|import|export)\b/m) || has(/=>/)) return 'javascript'
  if (has(/^[.#@]?[\w-]+[^{\n]*\{\s*$/m) && has(/^\s+[\w-]+\s*:\s*[^;]+;\s*$/m)) return 'css'
  if (has(/^\[[\w.-]+\]\s*$/m) && has(/^[\w-]+\s*=\s*\S/m)) return 'toml'
  if (looksLikeYaml(lines)) return 'yaml'
  if (has(/^#{1,6} \S/m) || (has(/^\s*[-*] \S/m) && has(/\*\*\S|`\S|\[.+\]\(.+\)|^#/m)))
    return 'markdown'
  return 'plaintext'
}
