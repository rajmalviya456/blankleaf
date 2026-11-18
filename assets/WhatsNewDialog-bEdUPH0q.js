import{d as e,h as t,m as n,p as r,t as i,u as a}from"./DialogSurface-C3yLJgJ3.js";import{En as o,_n as s,rn as c}from"./index-CgW3Q3gV.js";import{MarkdownPreview as l}from"./MarkdownPreview-REtVCSc4.js";import{i as u,n as d}from"./store-jYiVMnJP.js";import{t as f}from"./jsx-runtime-LKYXHABd.js";var p=`# Changelog

## [1.3.1](https://github.com/rajmalviya456/blankleaf/compare/v1.3.0...v1.3.1) (2026-11-18)


### Bug Fixes

* **pwa:** serve the sitemap and other files, not the app, once installed ([#20](https://github.com/rajmalviya456/blankleaf/issues/20)) ([d8043a5](https://github.com/rajmalviya456/blankleaf/commit/d8043a52fcf4f6686b1298194e5300e8339ca94e))

## [1.3.0](https://github.com/rajmalviya456/blankleaf/compare/v1.2.0...v1.3.0) (2026-11-18)


### Features

* rename Notepadz to Blankleaf, with full SEO ([#17](https://github.com/rajmalviya456/blankleaf/issues/17)) ([ced6ea0](https://github.com/rajmalviya456/blankleaf/commit/ced6ea057b9997a9607755d9ac32af4a1004ae72))


### Bug Fixes

* **share:** keep shared notes out of search results; verify Search Console ([#18](https://github.com/rajmalviya456/blankleaf/issues/18)) ([3bd918b](https://github.com/rajmalviya456/blankleaf/commit/3bd918b7007fe27f2ffa2f06f90bdeec1e9983be))

## [1.2.0](https://github.com/rajmalviya456/blankleaf/compare/v1.1.0...v1.2.0) (2026-11-18)


### Features

* **mobile:** phone layout with full laptop feature parity ([#4](https://github.com/rajmalviya456/blankleaf/issues/4)) ([76baf04](https://github.com/rajmalviya456/blankleaf/commit/76baf04d937a530bd05bda1d3dbf760dee22aa11))

## [1.1.0](https://github.com/rajmalviya456/blankleaf/compare/v1.0.0...v1.1.0) (2026-11-17)


### Features

* **about:** show release notes in the app ([5b7b882](https://github.com/rajmalviya456/blankleaf/commit/5b7b8826dfdb8b64560e584060e54e669d919fa6))


### Bug Fixes

* **editor:** drop the invalid label on the editor wrapper ([#3](https://github.com/rajmalviya456/blankleaf/issues/3)) ([2d574ba](https://github.com/rajmalviya456/blankleaf/commit/2d574ba68e7192a02e4f18037864004ad7b90b08))

## [1.0.0](https://github.com/rajmalviya456/blankleaf/tree/0a24e5da13ce0b10951b4d5e7e1aec6d3b717891) (2026-11-17)

First public release.

### Features

- **Full-window, tabbed notepad** with a sidebar (notes, search, trash) and zen mode. Tabs can be pinned, reordered, renamed and reopened after closing.
- **Remembers your session**: open tabs, cursor and scroll position come back after a reload, and several windows stay in sync.
- **Plain text or Markdown per note**, with edit / split / preview and highlighted code blocks in the preview.
- **Syntax highlighting for 20+ formats** (JSON, YAML, logs, diffs, JavaScript, Python, SQL, Go, Rust…), detected as you type or picked from the format menu.
- **Toolbar that fits the note**: formatting for Markdown; change case, sort / dedupe / trim lines and insert date for plain text, code and logs.
- **Share a note by link**: end-to-end encrypted, password-protected by default, expiring after 5 minutes to 7 days, sent browser to browser with no server storing it.
- **Search across all notes**, find & replace, and a trash that keeps notes for 30 days.
- **Delete notes from the list** without opening them, with Undo.
- **Backups**: export everything to one file, import it back, or drop text files onto the window.
- **Command palette** (⌘K / Ctrl+K), keyboard shortcuts sheet and an About page.
- **Light and dark themes**, accent colour, editor font, size, line numbers and tab size.
- **Works offline** and installs as an app; new versions offer a Reload instead of refreshing on their own.
`,m=f(),h=o(p);function g(){let o=u(e=>e.ui.whatsNewOpen);return(0,m.jsx)(a,{open:o,onOpenChange:e=>d().getState().setUi({whatsNewOpen:e}),children:(0,m.jsxs)(n,{children:[(0,m.jsx)(r,{className:`np-overlay fixed inset-0 z-40`}),(0,m.jsxs)(i,{"aria-describedby":void 0,className:`fixed left-1/2 top-[8vh] z-50 flex max-h-[84vh] w-[min(620px,calc(100vw-32px))] -translate-x-1/2 flex-col rounded-xl border border-border bg-bg-elev shadow-2xl outline-none`,children:[(0,m.jsxs)(`header`,{className:`flex items-center gap-2 border-b border-border px-4 py-3`,children:[(0,m.jsx)(t,{className:`flex-1 text-sm font-medium text-fg`,children:`What’s new`}),(0,m.jsxs)(`span`,{className:`text-[11.5px] tabular-nums text-fg-muted`,children:[`You have `,`1.3.1`]}),(0,m.jsx)(e,{"aria-label":`Close`,className:`grid size-7 place-items-center rounded-md text-fg-muted hover:bg-bg-hover hover:text-fg`,children:(0,m.jsx)(c,{size:15})})]}),(0,m.jsx)(`div`,{className:`min-h-0 overflow-y-auto`,children:(0,m.jsx)(l,{source:h,className:`release-notes`})}),(0,m.jsx)(`footer`,{className:`border-t border-border px-4 py-2.5 text-[11.5px] text-fg-muted`,children:(0,m.jsxs)(`a`,{href:`https://github.com/rajmalviya456/blankleaf/releases`,target:`_blank`,rel:`noreferrer`,className:`inline-flex items-center gap-1 hover:text-fg`,children:[`All releases on GitHub `,(0,m.jsx)(s,{size:11,"aria-hidden":!0})]})})]})]})})}export{g as WhatsNewDialog};