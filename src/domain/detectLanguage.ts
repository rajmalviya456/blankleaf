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
  // "Name: Bob" lines alone are a note, not YAML: needs nesting, a list, or code-like keys.
  const structured =
    body.some((l) => /^\s+\S/.test(l)) ||
    items > 0 ||
    body.some((l) => /^\s*[a-z_][\w-]*:(\s|$)/.test(l))
  return body.length >= 3 && keys >= 2 && (keys + items) / body.length >= 0.8 && structured
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
  if (/^<!doctype html|^<html[\s>]/i.test(first)) return 'html'
  if (/^#!.*\bperl\b/.test(first) || has(/^use strict;/m) || has(/^\s*my [$@%]\w+\s*=/m))
    return 'perl'
  if (/^#!.*\b(ba|z|fi)?sh\b/.test(first) || share(/^\$ \S/) >= 0.5) return 'shell'
  // Markdown that embeds code: fences, or a heading plus inline markdown. Checked before the
  // code rules so a ```js block doesn't make the whole note JavaScript.
  if (has(/^```/m)) return 'markdown'
  if (/^#{1,6} \S/.test(first) && has(/\*\*\S|`[^`\n]+`|\[[^\]]+\]\([^)]+\)|^\s*[-*] \[[ x]\]/m))
    return 'markdown'
  // JSX: tags inside JavaScript.
  const jsLines = /^\s*(import|export|const|let|function|return)\b/m
  if (has(jsLines) && has(/<[A-Za-z][\w.]*[\s>/]/))
    return has(/\w+\s*:\s*(string|number|boolean)\b/) ? 'typescript' : 'javascript'
  if (/^#{1,6} \S/.test(first) && (has(/\*\*\S/) || (has(/^\s*[-*] \S/m) && !looksLikeYaml(lines))))
    return 'markdown'
  if (has(/<(div|span|body|head|p|a|ul|li|table|section)[\s>]/i) && has(/<\/\w+>/)) return 'html'
  if (/^diff --git /.test(first) || (has(/^@@ -\d+(,\d+)? \+\d+/m) && has(/^[+-]/m))) return 'diff'
  const firstCode = lines.find((l) => !/^\s*#/.test(l))?.trim() ?? ''
  if (/^FROM \S+/.test(firstCode) && has(/^(RUN|CMD|COPY|WORKDIR|ENTRYPOINT) /m))
    return 'dockerfile'
  if (has(/\b(Get|Set|New|Write|Remove|Invoke|Import)-[A-Z]\w+/) && has(/\$\w+/))
    return 'powershell'
  if (
    has(/^\s*(server|http|location|upstream)\b[^{\n]*\{/m) &&
    has(/^\s*(listen|server_name|proxy_pass|root)\s+[^;\n]+;/m)
  )
    return 'nginx'
  if (
    lines.length >= 2 &&
    share(/^\s*(#|[A-Z][A-Z0-9_]*=)/) === 1 &&
    share(/^[A-Z][A-Z0-9_]*=/) >= 0.5
  )
    return 'ini'
  if (has(/^package \w+\s*$/m) && has(/^func /m)) return 'go'
  if (
    has(/^import (SwiftUI|Foundation|UIKit|Combine)\b/m) ||
    (has(/^\s*func \w+\(/m) && has(/\b(let|var) \w+\s*[:=]/))
  )
    return 'swift'
  if (has(/^\s*fun \w+\s*\(/m) && has(/\b(val|var) \w+|println\(/)) return 'kotlin'
  if (
    has(/^using System[.;]/m) ||
    (has(/^\s*namespace [\w.]+/m) && has(/\b(public|private) (static )?(class|void)\b/))
  )
    return 'csharp'
  if ((has(/^\s*local (function )?\w+/m) || has(/^\s*function [\w.:]+\(/m)) && has(/^\s*end\b/m))
    return 'lua'
  if (has(/[\w.]+\s*<-\s*\S/) && has(/\b(library|c|function|data\.frame|summary|read\.csv)\(/))
    return 'r'
  if (has(/^\s*fn \w+\s*\(/m) && has(/\blet (mut )?\w+|println!|->/)) return 'rust'
  // Before Python and JavaScript: Ruby's `def f(x)` and `=>` would match those.
  if (
    has(/^\s*end\s*$/m) &&
    (has(/^\s*(def|class|module)\s+[\w:.]+/m) || has(/\bdo(\s*\|[^|]*\|)?\s*$/m))
  )
    return 'ruby'
  if (has(/^#include\s*[<"]/m)) return 'cpp'
  if (has(/^\s*(public |private )?(final )?class \w+/m) && has(/\b(public|static|void)\b/))
    return 'java'
  if (
    has(/^\s*(def \w+\(|class \w+(\(.*\))?:|from [\w.]+ import |import \w+\s*$)/m) &&
    !has(/;\s*$/m) &&
    !has(/^\s*(const|let|var|function)\s/m)
  )
    return 'python'
  const sql =
    /\b(SELECT\s[\s\S]{1,400}?\sFROM|INSERT\s+INTO|UPDATE\s+\w+\s+SET|CREATE\s+TABLE|DELETE\s+FROM)\b/
  if (has(sql) || (has(new RegExp(sql.source, 'i')) && has(/;\s*$/m))) return 'sql'
  // Keywords count only in code's shape: "let Sam know" and "type the letter" are prose.
  const declaration = /^\s*(const|let|var)\s+[\w$]+\s*(=|:|;|$)/m
  if (
    has(/^\s*(export )?(interface \w+\s*(\{|extends\b)|type \w+\s*(<[^>\n]*>)?\s*=)/m) ||
    has(/(\b(const|let|var)\s+[\w$]+|\(\s*[\w$]+)\s*:\s*(string|number|boolean|void)\b/) ||
    has(/\)\s*:\s*(string|number|boolean|void)\s*\{/)
  )
    return 'typescript'
  if (
    has(declaration) ||
    has(/^\s*(async\s+)?function\s*\*?\s*[\w$]*\s*\(/m) ||
    has(/^\s*import\s+(['"]|[\w$*{][^\n]*\bfrom\s*['"])/m) ||
    has(/^\s*export\s+(default|const|let|var|function|class|async|\{|\*)/m) ||
    (has(/(\)|\b\w+)\s*=>\s*[{(\w'"`[]/) && has(/[;{}()]/) && !has(/,\s*\w+\s*=>/))
  )
    return 'javascript'
  if (has(/^[.#@]?[\w-]+[^{\n]*\{\s*$/m) && has(/^\s+[\w-]+\s*:\s*[^;]+;\s*$/m)) {
    if (has(/^\s*\$[\w-]+\s*:/m) || has(/^\s*&[:.\w-]/m) || has(/^\s*@(mixin|include|use)\b/m))
      return 'scss'
    if (has(/^\s*@[\w-]+\s*:/m) || has(/^\s*\.[\w-]+\(\);/m)) return 'less'
    return 'css'
  }
  if (has(/^\[[\w.-]+\]\s*$/m) && has(/^[\w-]+\s*=\s*\S/m)) return 'toml'
  if (looksLikeYaml(lines)) return 'yaml'
  if (has(/^#{1,6} \S/m) || (has(/^\s*[-*] \S/m) && has(/\*\*\S|`\S|\[.+\]\(.+\)|^#/m)))
    return 'markdown'
  return 'plaintext'
}
