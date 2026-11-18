/** A note as one self-contained web page: no scripts, no outside files. */
import { renderToStaticMarkup } from 'react-dom/server'
import { documentTitle } from '../../domain/title'
import type { Note } from '../../domain/types'
import { MarkdownPreview } from '../editor/MarkdownPreview'
import { prepareRichContent } from '../editor/richContent'

const CSS = `:root{color-scheme:light dark;--fg:#1b1e25;--muted:#555c6b;--line:#dfe3e8;--soft:#f4f6f8;--link:#1f5fbf;--kw:#7c2fd0;--str:#116b3a;--num:#a34a00}
@media (prefers-color-scheme:dark){:root{--fg:#e6e8ee;--muted:#aab1bf;--line:#2c313c;--soft:#1a1d24;--link:#8db4ff;--kw:#c79bff;--str:#7fd8a4;--num:#f0a868}}
body{max-width:46rem;margin:0 auto;padding:32px 16px;color:var(--fg);font:16px/1.6 system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;overflow-wrap:anywhere}
a{color:var(--link)}h1,h2,h3{line-height:1.25}img{max-width:100%}
pre{background:var(--soft);border-radius:8px;padding:12px 14px;overflow-x:auto;font:14px/1.5 ui-monospace,Consolas,monospace}
.note-text{white-space:pre-wrap}code{font-family:ui-monospace,Consolas,monospace;font-size:.92em}
blockquote{margin:0;padding-left:14px;border-left:3px solid var(--line);color:var(--muted)}
table{border-collapse:collapse;display:block;overflow-x:auto}th,td{border:1px solid var(--line);padding:6px 10px}th{background:var(--soft)}
.md-diagram{margin:16px 0;text-align:center}.md-diagram svg{max-width:100%;height:auto}math[display=block]{margin:12px 0;overflow-x:auto}.contains-task-list{list-style:none;padding-left:4px}.hljs-keyword,.hljs-built_in{color:var(--kw)}.hljs-string{color:var(--str)}.hljs-number,.hljs-literal{color:var(--num)}.hljs-comment{color:var(--muted)}`

const esc = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

export async function noteToHtml(note: Note): Promise<string> {
  const title = esc(documentTitle(note))
  const body =
    note.mode === 'markdown'
      ? renderToStaticMarkup(
          <MarkdownPreview
            source={note.content}
            extras={await prepareRichContent(note.content)}
            remoteImages={false}
          />,
        )
      : `<h1>${title}</h1><pre class="note-text">${esc(note.content)}</pre>`
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; img-src data:">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="generator" content="Blankleaf">
<title>${title}</title>
<style>${CSS}</style>
</head>
<body>
${body}
</body>
</html>
`
}
