var e=Object.freeze({theme:`system`,accent:``,uiFontSize:13,editorFont:`mono`,editorFontSize:14,phoneEditorFontSize:16,lineHeight:1.6,defaultMode:`plain`,defaultWrap:!0,lineNumbers:!0,tabSize:2,highlightActiveLine:!0,codeRuler:80,spellLanguage:`auto`,showToolbar:!0,backupReminderDays:7,notesSort:`edited`,emojiSkinTone:0});function t(t){let n={...e};if(!t||typeof t!=`object`)return n;let r=n;for(let n of Object.keys(e)){let i=t[n];i!==void 0&&typeof i==typeof e[n]&&(r[n]=i)}return c(n.editorFont)||(n.editorFont=e.editorFont),[`edited`,`created`,`title`].includes(n.notesSort)||(n.notesSort=`edited`),[0,1,2,3,4,5].includes(n.emojiSkinTone)||(n.emojiSkinTone=0),[0,80,100,120].includes(n.codeRuler)||(n.codeRuler=e.codeRuler),[`auto`,`en-US`,`en-GB`,`en-AU`,`en-CA`,`es`].includes(n.spellLanguage)||(n.spellLanguage=`auto`),n}function n(){return{openTabIds:[],activeTabId:null,closedStack:[],perTab:{},sidebar:{open:!1,panel:`notes`},zen:!1}}function r(e,t,n=crypto.randomUUID()){return{id:n,title:null,content:``,mode:t.defaultMode,language:`auto`,wrap:t.defaultWrap,pinned:!1,createdAt:e,updatedAt:e,deletedAt:null,rev:0}}var i=`# Welcome to Blankleaf

This is a **sample note**. Change anything, it's yours, and delete it when you're done.
Everything saves in this browser as you type. Nothing leaves your device unless you share it.

## A checklist

Tick the boxes in the preview.

- [x] Open Blankleaf
- [ ] Write something
- [ ] Share a note with an encrypted link

## A diagram

\`\`\`mermaid
flowchart LR
  Idea --> Draft --> Share
\`\`\`

## Code

\`\`\`js
const greet = (name) => \`Hello, \${name}!\`
\`\`\`

\`\`\`python
def greet(name):
    return f"Hello, {name}!"
\`\`\`

## Math

$$
e^{i\\pi} + 1 = 0
$$

## Keys

| Keys | What it does |
| --- | --- |
| Ctrl/⌘ K | Command palette |
| Alt N (⌃⌥N on a Mac) | New note |
| Ctrl/⌘ Shift F | Search all notes |
| Ctrl/⌘ / | All keyboard shortcuts |

Back up now and then: Settings → Data → Export, or pick a backup folder there.
`;function a(e,t,n){return t?Math.max(16,n?.phoneFontSize??e.phoneEditorFontSize):n?.fontSize??e.editorFontSize}function o(e,t){let[n,r]=t?[16,72]:[10,72];return typeof e==`number`&&Number.isInteger(e)&&e>=n&&e<=r?e:void 0}var s=[{value:`mono`,label:`Monospace`},{value:`sans`,label:`Sans`},{value:`serif`,label:`Serif`},{value:`rounded`,label:`Rounded`}];function c(e){return s.some(t=>t.value===e)?e:void 0}function l(e,t){return t?.font??e.editorFont}function u(e){return{mono:`var(--font-mono)`,sans:`var(--font-ui)`,serif:`var(--font-serif)`,rounded:`var(--font-rounded)`}[e]}export{o as a,a as c,r as d,c as i,n as l,s as n,u as o,i as r,l as s,e as t,t as u};