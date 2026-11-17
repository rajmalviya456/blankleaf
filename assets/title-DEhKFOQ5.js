var e=Object.freeze({theme:`system`,accent:``,uiFontSize:13,editorFont:`mono`,editorFontSize:14,lineHeight:1.6,defaultMode:`plain`,defaultWrap:!0,lineNumbers:!0,tabSize:2,highlightActiveLine:!0,showToolbar:!0,backupReminderDays:7});function t(t){let n={...e};if(!t||typeof t!=`object`)return n;let r=n;for(let n of Object.keys(e)){let i=t[n];i!==void 0&&typeof i==typeof e[n]&&(r[n]=i)}return n}function n(){return{openTabIds:[],activeTabId:null,closedStack:[],perTab:{},sidebar:{open:!1,panel:`notes`},zen:!1}}function r(e,t,n=crypto.randomUUID()){return{id:n,title:null,content:``,mode:t.defaultMode,language:`auto`,wrap:t.defaultWrap,pinned:!1,createdAt:e,updatedAt:e,deletedAt:null,rev:0}}var i=`Welcome to Notepadz

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
`,a=[{id:`plaintext`,label:`Plain text`,ext:`txt`,kind:`text`,group:`text`},{id:`markdown`,label:`Markdown`,ext:`md`,kind:`text`,group:`text`},{id:`log`,label:`Log`,ext:`log`,kind:`log`,group:`text`},{id:`json`,label:`JSON`,ext:`json`,kind:`code`,group:`data`},{id:`yaml`,label:`YAML`,ext:`yaml`,kind:`code`,group:`data`},{id:`toml`,label:`TOML`,ext:`toml`,kind:`code`,group:`data`},{id:`xml`,label:`XML`,ext:`xml`,kind:`code`,group:`data`},{id:`dockerfile`,label:`Dockerfile`,ext:`dockerfile`,kind:`code`,group:`data`},{id:`diff`,label:`Diff`,ext:`diff`,kind:`code`,group:`data`},{id:`javascript`,label:`JavaScript`,ext:`js`,kind:`code`,group:`code`},{id:`typescript`,label:`TypeScript`,ext:`ts`,kind:`code`,group:`code`},{id:`python`,label:`Python`,ext:`py`,kind:`code`,group:`code`},{id:`sql`,label:`SQL`,ext:`sql`,kind:`code`,group:`code`},{id:`html`,label:`HTML`,ext:`html`,kind:`code`,group:`code`},{id:`css`,label:`CSS`,ext:`css`,kind:`code`,group:`code`},{id:`shell`,label:`Shell`,ext:`sh`,kind:`code`,group:`code`},{id:`java`,label:`Java`,ext:`java`,kind:`code`,group:`code`},{id:`cpp`,label:`C / C++`,ext:`cpp`,kind:`code`,group:`code`},{id:`go`,label:`Go`,ext:`go`,kind:`code`,group:`code`},{id:`rust`,label:`Rust`,ext:`rs`,kind:`code`,group:`code`},{id:`php`,label:`PHP`,ext:`php`,kind:`code`,group:`code`}],o=[{id:`text`,label:`Text`},{id:`data`,label:`Data & config`},{id:`code`,label:`Code`}],s=new Map(a.map(e=>[e.id,e]));function c(e){return s.get(e)??a[0]}var l=2e6;function u(e){return e>l}var d=`Untitled`;function f(e){let t=e.title?.trim();if(t)return t;for(let t of e.content.split(`
`,50)){let e=t.trim();if(e)return e.slice(0,40)}return d}export{c as a,n as c,u as i,t as l,a as n,e as o,o as r,i as s,f as t,r as u};