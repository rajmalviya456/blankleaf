/**
 * Static pages for people arriving from search: what Blankleaf does, in text search engines can
 * read. Generated at build time (see vite.config.ts) with no JavaScript, so they load instantly.
 * Keep every claim true to the app: these pages are promises.
 */
export const BASE_PATH = '/blankleaf/'
export const HOME_URL = `https://rajmalviya456.github.io${BASE_PATH}`

export interface Section {
  heading: string
  text?: string
  list?: string[]
  steps?: string[]
}

export interface Page {
  slug: string
  /** Shown in search results and the browser tab. */
  title: string
  description: string
  /** Short name for links between pages. */
  name: string
  h1: string
  intro: string
  sections: Section[]
  faq?: { q: string; a: string }[]
}

export const PAGES: Page[] = [
  {
    slug: 'features',
    title: 'Blankleaf Features: Tabs, Markdown, Autosave and More',
    description:
      'Everything in Blankleaf, the free online notepad: tabs, Markdown preview, code highlighting, version history, offline use and encrypted sharing.',
    name: 'Features',
    h1: 'Everything Blankleaf can do',
    intro:
      'Blankleaf is a free online notepad that opens straight to a blank page. There is nothing to install and no account to create.',
    sections: [
      {
        heading: 'Writing',
        list: [
          'Keep many notes open in tabs, and pin the ones you always need',
          'Autosave in your browser as you type',
          'Markdown with edit, split and preview views',
          'Syntax highlighting for more than 20 formats, including JSON, YAML, Python, SQL and logs',
          'Find and replace, word wrap and adjustable text size',
          'Zen mode, which hides everything except your page',
        ],
      },
      {
        heading: 'Keeping your work safe',
        list: [
          'Version history: read an earlier version of a note and restore it',
          'Trash keeps deleted notes for 30 days',
          'Export a backup file of all your notes and import it again at any time',
          'Works offline after your first visit, and can be installed like an app',
        ],
      },
      {
        heading: 'Tools for text and code',
        list: [
          'Format or minify JSON',
          'Convert JSON to YAML and YAML to JSON',
          'Encode and decode Base64 and URLs',
          'Sort lines, remove duplicate lines and change case',
          'Tick checklist items right in the Markdown preview',
        ],
      },
      {
        heading: 'Sharing',
        text: 'Share a note with a private link that is encrypted end to end. Choose when it expires, from 5 minutes to 7 days, and add a password if you want one. Keep Blankleaf open until the other person has opened the link, because the note is sent straight from your browser.',
      },
      {
        heading: 'On your phone',
        text: 'Blankleaf has a layout made for phones, with the same notes, formats and tools as on a laptop, and a toolbar that sits right above the keyboard.',
      },
    ],
  },
  {
    slug: 'faq',
    title: 'Blankleaf FAQ: Privacy, Saving, Sharing and Offline Use',
    description:
      'Answers about Blankleaf: is it free, where are notes saved, is it private, does it work offline, and how do you back up or share a note?',
    name: 'FAQ',
    h1: 'Frequently asked questions',
    intro: 'Short answers about how Blankleaf works and where your notes are kept.',
    sections: [],
    faq: [
      {
        q: 'Is Blankleaf free?',
        a: 'Yes. Blankleaf is free to use, with no account, no sign-up and no paid plan.',
      },
      {
        q: 'Do I need an account?',
        a: 'No. Open the page and start typing. Your notes are saved automatically in your browser.',
      },
      {
        q: 'Where are my notes saved?',
        a: 'In your own browser, on your own device. Blankleaf has no server that stores notes, so nothing you write is uploaded.',
      },
      {
        q: 'Can anyone else read my notes?',
        a: 'Your notes stay on your device unless you choose to share one. A shared note is encrypted end to end and goes directly from your browser to the person you send the link to.',
      },
      {
        q: 'Will I lose my notes if I close the tab?',
        a: 'No. Notes are saved as you type, and your open tabs come back the next time you visit in the same browser.',
      },
      {
        q: 'How could I lose my notes?',
        a: 'Clearing your browser’s site data deletes them, and they only exist in the browser where you wrote them. Export a backup now and then from Settings, under Data.',
      },
      {
        q: 'Do my notes sync between devices?',
        a: 'No, notes stay on the device where you wrote them. To move them, export a backup file and import it on the other device, or share a single note by link.',
      },
      {
        q: 'Does Blankleaf work offline?',
        a: 'Yes. After your first visit it opens and saves without a connection. You can also install it from your browser so it opens like an app.',
      },
      {
        q: 'Can I get back an earlier version of a note?',
        a: 'Yes. Blankleaf saves versions every few minutes while you write and keeps the latest 50 for each note on your device. Open Version history to read one and restore it.',
      },
      {
        q: 'What happens to notes I delete?',
        a: 'They move to Trash, where you can restore them for 30 days. After that they are deleted permanently.',
      },
      {
        q: 'How does sharing a note work?',
        a: 'Create a link, choose when it expires, and optionally add a password. Keep Blankleaf open until the link has been opened, because the note is sent straight from your browser.',
      },
      {
        q: 'Does Blankleaf work on phones?',
        a: 'Yes. On a phone you get a layout designed for small screens, with the same notes, formats and tools.',
      },
    ],
  },
  {
    slug: 'notepad-with-tabs',
    title: 'Online Notepad with Tabs: Free, No Sign-Up',
    description:
      'Keep many notes open at once in a free online notepad with tabs. Blankleaf saves every tab in your browser and brings them back on your next visit.',
    name: 'Notepad with tabs',
    h1: 'An online notepad with tabs',
    intro:
      'Most online notepads give you a single text box. Blankleaf gives you tabs, so a to-do list, a code snippet and a long draft can all stay open side by side in one window.',
    sections: [
      {
        heading: 'Why tabs help',
        list: [
          'Switch between notes without losing your place',
          'Your open tabs, cursor and scroll position come back after a reload',
          'Pin the notes you use every day',
          'Drag tabs into the order you want',
          'Search across all your notes at once',
        ],
      },
      {
        heading: 'How to start',
        steps: [
          'Open Blankleaf. A blank page is ready straight away.',
          'Add a new tab for each note you want to keep open.',
          'Close the window whenever you like. Your tabs will be there next time.',
        ],
      },
    ],
  },
  {
    slug: 'markdown-notepad',
    title: 'Online Markdown Notepad with Live Preview',
    description:
      'Write Markdown online with a live preview, a formatting toolbar, clickable checklists and highlighted code. Free, private and no sign-up needed.',
    name: 'Markdown notepad',
    h1: 'An online Markdown notepad with live preview',
    intro:
      'Write Markdown in your browser and see the result as you type. Blankleaf needs no account, and your notes stay on your device.',
    sections: [
      {
        heading: 'Made for writing Markdown',
        list: [
          'Edit, split and preview views',
          'A toolbar for headings, bold, italic, lists, quotes, links and code blocks',
          'Tables, task lists and strikethrough (GitHub-flavored Markdown)',
          'Highlighted code blocks',
          'Checklists you can tick right in the preview',
          'Download any note as a Markdown file',
        ],
      },
      {
        heading: 'How to start',
        steps: [
          'Open Blankleaf and start a new note.',
          'Choose Markdown as the note’s format.',
          'Switch to split view to see the preview next to your text.',
        ],
      },
    ],
  },
  {
    slug: 'online-notepad-no-sign-up',
    title: 'Online Notepad with No Sign-Up or Account',
    description:
      'A private online notepad with no sign-up, no account and no email. Blankleaf saves your notes in your own browser, and nothing is uploaded.',
    name: 'No sign-up notepad',
    h1: 'An online notepad with no sign-up',
    intro:
      'No email, no password and no account. Open Blankleaf and start typing. Your notes are saved in your own browser as you write.',
    sections: [
      {
        heading: 'Private by design',
        list: [
          'Notes are stored on your device, not on a server',
          'Nothing you write is uploaded',
          'Shared notes are encrypted end to end',
          'Works offline after your first visit',
        ],
      },
      {
        heading: 'Good to know',
        text: 'Because your notes live only in your browser, clearing its site data deletes them, and they do not sync to other devices. Export a backup file now and then to keep a copy.',
      },
    ],
  },
  {
    slug: 'json-formatter-notepad',
    title: 'Format JSON Online in a Private Notepad',
    description:
      'Format, minify and convert JSON to YAML in your browser. Blankleaf is a free online notepad that keeps your data on your device, with no upload.',
    name: 'JSON formatter',
    h1: 'Format JSON online, without uploading it',
    intro:
      'Paste JSON into Blankleaf and format it in one click. The work happens in your browser, so API responses and config files stay on your device.',
    sections: [
      {
        heading: 'What you can do',
        list: [
          'Format JSON with clean indentation',
          'Minify JSON to a single line',
          'Convert JSON to YAML and YAML to JSON',
          'Encode and decode Base64 and URLs',
          'Work on the whole note or only the text you select',
          'See a clear message when the JSON isn’t valid',
        ],
      },
      {
        heading: 'How to format JSON',
        steps: [
          'Open Blankleaf and paste your JSON into a note.',
          'Open the Transform menu on the toolbar.',
          'Choose Format JSON. One Undo puts the original text back.',
        ],
      },
    ],
  },
]

const esc = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

/** JSON for a <script> block: "<" can't close the tag early. */
const ld = (data: unknown) =>
  `<script type="application/ld+json">${JSON.stringify(data).replace(/</g, '\\u003c')}</script>`

const LOGO = `<svg viewBox="0 0 512 512" width="28" height="28" aria-hidden="true"><rect width="512" height="512" rx="112" fill="#14161c"/><g fill="none" stroke="#5fd39a" stroke-width="40" stroke-linecap="round" stroke-linejoin="round"><path d="M136 376C136 236 236 136 376 136C376 276 276 376 136 376Z"/><path d="M136 376L300 212"/></g></svg>`

const CSS = `:root{color-scheme:light dark;--bg:#fff;--fg:#1b1e25;--muted:#555c6b;--line:#e2e5ea;--soft:#f4f6f8;--btn:#146c43;--btn-fg:#fff;--link:#0f5f3a}
@media (prefers-color-scheme:dark){:root{--bg:#111318;--fg:#eef0f4;--muted:#aab1bf;--line:#2a2e38;--soft:#181b22;--btn:#5fd39a;--btn-fg:#0d1512;--link:#7fe0b0}}
*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--fg);font:17px/1.6 system-ui,-apple-system,"Segoe UI",Roboto,sans-serif}
a{color:var(--link)}a:focus-visible{outline:2px solid var(--link);outline-offset:2px;border-radius:4px}
.wrap{max-width:46rem;margin:0 auto;padding:0 16px}
header{border-bottom:1px solid var(--line)}header .wrap{display:flex;align-items:center;gap:16px;min-height:60px;flex-wrap:wrap;padding-block:8px}
.brand{display:flex;align-items:center;gap:8px;font-weight:700;color:var(--fg);text-decoration:none;margin-right:auto}
nav a{display:inline-block;padding:10px 4px;margin-right:8px;color:var(--muted);text-decoration:none}nav a:hover{color:var(--fg)}
.btn{display:inline-block;background:var(--btn);color:var(--btn-fg);font-weight:600;text-decoration:none;padding:11px 18px;border-radius:8px}
main.wrap{padding-block:40px}h1{font-size:clamp(1.9rem,6vw,2.6rem);line-height:1.15;margin:0 0 16px;letter-spacing:-.02em}
h2{font-size:1.3rem;margin:36px 0 8px}.intro{font-size:1.15rem;color:var(--muted);margin:0 0 24px}
ul,ol{padding-left:1.3rem}li{margin:6px 0}details{border-bottom:1px solid var(--line);padding:14px 0}
summary{font-weight:600;cursor:pointer}details p{margin:8px 0 0;color:var(--muted)}
.cta{background:var(--soft);border-radius:12px;padding:24px;margin-top:40px}.cta h2{margin-top:0}
footer{border-top:1px solid var(--line);color:var(--muted);font-size:.95rem;padding-block:24px}
@media (max-width:480px){header nav{display:none}header .wrap{flex-wrap:nowrap;gap:8px}header .btn{padding:9px 12px;font-size:.9rem;white-space:nowrap}}
@media (max-width:360px){.brand span{position:absolute;width:1px;height:1px;overflow:hidden;clip-path:inset(50%);white-space:nowrap}}
footer ul{list-style:none;padding:0;margin:0;display:flex;flex-wrap:wrap;gap:4px 18px}footer a{display:inline-block;padding:6px 0}`

function section(s: Section): string {
  return [
    `<h2>${esc(s.heading)}</h2>`,
    s.text ? `<p>${esc(s.text)}</p>` : '',
    s.list ? `<ul>${s.list.map((i) => `<li>${esc(i)}</li>`).join('')}</ul>` : '',
    s.steps ? `<ol>${s.steps.map((i) => `<li>${esc(i)}</li>`).join('')}</ol>` : '',
  ].join('')
}

export function renderPage(page: Page): string {
  const url = `${HOME_URL}${page.slug}/`
  const image = `${HOME_URL}og-image.png`
  const crumbs = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Blankleaf', item: HOME_URL },
      { '@type': 'ListItem', position: 2, name: page.name, item: url },
    ],
  }
  const faqData = page.faq && {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: page.faq.map((f) => ({
      '@type': 'Question',
      name: f.q,
      acceptedAnswer: { '@type': 'Answer', text: f.a },
    })),
  }
  const faq = (page.faq ?? [])
    .map((f) => `<details open><summary>${esc(f.q)}</summary><p>${esc(f.a)}</p></details>`)
    .join('')
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(page.title)}</title>
<meta name="description" content="${esc(page.description)}">
<meta name="robots" content="index, follow, max-image-preview:large">
<link rel="canonical" href="${url}">
<link rel="icon" href="${BASE_PATH}favicon.ico" sizes="48x48">
<link rel="icon" href="${BASE_PATH}logo.svg" type="image/svg+xml">
<link rel="apple-touch-icon" href="${BASE_PATH}apple-touch-icon-180x180.png">
<meta name="theme-color" content="#111318">
<meta property="og:type" content="website">
<meta property="og:site_name" content="Blankleaf">
<meta property="og:title" content="${esc(page.title)}">
<meta property="og:description" content="${esc(page.description)}">
<meta property="og:url" content="${url}">
<meta property="og:image" content="${image}">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta property="og:image:alt" content="Blankleaf — Online Notepad">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${esc(page.title)}">
<meta name="twitter:description" content="${esc(page.description)}">
<meta name="twitter:image" content="${image}">
${ld(crumbs)}
${faqData ? ld(faqData) : ''}
<style>${CSS}</style>
</head>
<body>
<header><div class="wrap">
<a class="brand" href="${BASE_PATH}">${LOGO}<span>Blankleaf</span></a>
<nav aria-label="Main"><a href="${BASE_PATH}features/">Features</a><a href="${BASE_PATH}faq/">FAQ</a></nav>
<a class="btn" href="${BASE_PATH}">Open Blankleaf</a>
</div></header>
<main class="wrap">
<h1>${esc(page.h1)}</h1>
<p class="intro">${esc(page.intro)}</p>
${page.sections.map(section).join('\n')}
${faq}
<section class="cta"><h2>Start writing now</h2><p>Free, with nothing to install and no account to create.</p><a class="btn" href="${BASE_PATH}">Open Blankleaf</a></section>
</main>
<footer><div class="wrap"><nav aria-label="More pages"><ul>${PAGES.map((p) => `<li><a href="${BASE_PATH}${p.slug}/">${esc(p.name)}</a></li>`).join('')}<li><a href="https://github.com/rajmalviya456/blankleaf">Source code</a></li></ul></nav></div></footer>
</body>
</html>
`
}

export function renderSitemap(): string {
  const urls = [HOME_URL, ...PAGES.map((p) => `${HOME_URL}${p.slug}/`)]
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map((u) => `  <url>\n    <loc>${u}</loc>\n  </url>`).join('\n')}
</urlset>
`
}
