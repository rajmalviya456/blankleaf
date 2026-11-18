var e=Object.freeze({theme:`system`,accent:``,uiFontSize:13,editorFont:`mono`,editorFontSize:14,phoneEditorFontSize:16,lineHeight:1.6,defaultMode:`plain`,defaultWrap:!0,lineNumbers:!0,tabSize:2,highlightActiveLine:!0,showToolbar:!0,backupReminderDays:7,notesSort:`edited`});function t(t){let n={...e};if(!t||typeof t!=`object`)return n;let r=n;for(let n of Object.keys(e)){let i=t[n];i!==void 0&&typeof i==typeof e[n]&&(r[n]=i)}return[`edited`,`created`,`title`].includes(n.notesSort)||(n.notesSort=`edited`),n}function n(){return{openTabIds:[],activeTabId:null,closedStack:[],perTab:{},sidebar:{open:!1,panel:`notes`},zen:!1}}function r(e,t,n=crypto.randomUUID()){return{id:n,title:null,content:``,mode:t.defaultMode,language:`auto`,wrap:t.defaultWrap,pinned:!1,createdAt:e,updatedAt:e,deletedAt:null,rev:0}}var i=`Welcome to Blankleaf

Everything you type is saved in this browser automatically. Nothing leaves your machine.

Shortcuts (⌘ = Ctrl on Windows/Linux, Mod2 = ⌃⌥ on Mac, Alt elsewhere)
  ⌘K          Command palette
  Mod2+N      New note
  Mod2+W      Close tab
  Mod2+1…9    Jump to tab
  ⌘B          Toggle sidebar
  ⌘⇧F         Search all notes
  ⌘.          Zen mode
  F2          Rename tab

Back up regularly: Settings → Data → Export.
Delete this note whenever you like — it won't come back.
`;function a(e,t){return t?Math.max(16,e.phoneEditorFontSize):e.editorFontSize}export{t as a,n as i,i as n,r as o,a as r,e as t};