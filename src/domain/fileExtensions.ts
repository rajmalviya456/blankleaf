// No imports: vite.config.ts reads this for the installed app's "Open with" list.

/** Each format's own extension (the same as `ext` in LANGUAGES; a test keeps them in step). */
const FORMAT_EXTENSIONS = [
  'txt',
  'md',
  'log',
  'json',
  'yaml',
  'toml',
  'xml',
  'dockerfile',
  'diff',
  'js',
  'ts',
  'py',
  'sql',
  'html',
  'css',
  'sh',
  'java',
  'cpp',
  'go',
  'rs',
  'php',
  'rb',
] as const

/** Other extensions and the format they open as. */
export const ALIASES = {
  markdown: 'markdown',
  mjs: 'javascript',
  cjs: 'javascript',
  jsx: 'javascript',
  tsx: 'typescript',
  mts: 'typescript',
  cts: 'typescript',
  jsonc: 'json',
  svg: 'xml',
  cxx: 'cpp',
  hh: 'cpp',
  yml: 'yaml',
  bash: 'shell',
  zsh: 'shell',
  htm: 'html',
  c: 'cpp',
  h: 'cpp',
  hpp: 'cpp',
  cc: 'cpp',
  patch: 'diff',
  text: 'plaintext',
  rake: 'ruby',
  gemspec: 'ruby',
  ru: 'ruby',
} as const

/** Every extension the app opens as a note: for file pickers and "Open with". */
export const OPENABLE_EXTENSIONS: readonly string[] = [
  ...new Set<string>([...FORMAT_EXTENSIONS, ...Object.keys(ALIASES)]),
].map((e) => `.${e}`)
