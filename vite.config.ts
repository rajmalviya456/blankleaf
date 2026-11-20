/// <reference types="vitest/config" />
import { fileURLToPath } from 'node:url'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig, type Plugin } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'
import pkg from './package.json' with { type: 'json' }
import { PAGES, renderPage, renderSitemap } from './site/pages.ts'
import { OPENABLE_EXTENSIONS } from './src/domain/fileExtensions.ts'

/** Writes the static landing pages and the sitemap into the build. */
function sitePages(): Plugin {
  return {
    name: 'blankleaf-site-pages',
    apply: 'build',
    generateBundle() {
      for (const page of PAGES)
        this.emitFile({
          type: 'asset',
          fileName: `${page.slug}/index.html`,
          source: renderPage(page),
        })
      this.emitFile({ type: 'asset', fileName: 'sitemap.xml', source: renderSitemap() })
    },
  }
}

const pageSlugs = PAGES.map((p) => p.slug).join('|')

const CODEMIRROR_SETUP_STUB = fileURLToPath(
  new URL('./src/lib/stubs/codemirrorSetup.ts', import.meta.url),
)

const DIAGRAM_MODULES =
  /node_modules\/(@mermaid-js|mermaid|cytoscape[^/]*|d3[^/]*|dagre-d3-es|khroma|langium|chevrotain[^/]*|roughjs|@iconify|stylis|vscode-[^/]*)\//

// GitHub Pages serves the app from /blankleaf/; dev server stays at /.
export default defineConfig(({ command }) => ({
  base: command === 'build' ? '/blankleaf/' : '/',
  resolve: {
    alias: {
      '@uiw/codemirror-extensions-basic-setup': CODEMIRROR_SETUP_STUB,
      '@codemirror/theme-one-dark': CODEMIRROR_SETUP_STUB,
    },
  },
  plugins: [
    react(),
    tailwindcss(),
    sitePages(),
    VitePWA({
      // Ask before swapping in a new version so nobody loses a half-typed note to a reload.
      registerType: 'prompt',
      includeAssets: ['favicon.ico', 'apple-touch-icon-180x180.png', 'logo.svg'],
      manifest: {
        id: './',
        name: 'Blankleaf — Online Notepad',
        short_name: 'Blankleaf',
        description:
          'A free online notepad with tabs, Markdown and code highlighting that keeps everything in your browser.',
        categories: ['productivity', 'utilities'],
        lang: 'en',
        // Installed, Blankleaf appears in the phone's Share menu and can open text files.
        share_target: {
          action: './',
          method: 'GET',
          params: { title: 'title', text: 'text', url: 'url' },
        },
        file_handlers: [
          {
            action: './',
            accept: {
              'text/markdown': ['.md', '.markdown'],
              'text/plain': OPENABLE_EXTENSIONS.filter((e) => e !== '.md' && e !== '.markdown'),
            },
          },
        ],
        start_url: '.',
        scope: '.',
        display: 'standalone',
        theme_color: '#111318',
        background_color: '#111318',
        icons: [
          { src: 'pwa-64x64.png', sizes: '64x64', type: 'image/png' },
          { src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png' },
          {
            src: 'maskable-icon-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
        // Right-click (computer) or long-press (phone) the installed app's icon.
        shortcuts: [
          { name: 'New note', short_name: 'New', url: './?shortcut=new' },
          { name: "Today's note", short_name: 'Today', url: './?shortcut=today' },
          { name: 'Search notes', short_name: 'Search', url: './?shortcut=search' },
        ].map((s) => ({ ...s, icons: [{ src: 'pwa-192x192.png', sizes: '192x192' }] })),
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,ico,woff2}'],
        // Link previews and landing pages aren't part of the offline app. Diagrams are a large
        // download only some notes need, so they're cached the first time a note uses them.
        globIgnores: ['**/og-image.png', 'assets/diagrams/**', ...PAGES.map((p) => `${p.slug}/**`)],
        runtimeCaching: [
          {
            urlPattern: /\/assets\/diagrams\//,
            handler: 'CacheFirst',
            options: { cacheName: 'diagrams', expiration: { maxEntries: 120 } },
          },
          // The spell check dictionary (~550 KB): only for people who turn spell check on.
          {
            urlPattern: /\/assets\/[^/]+\.(dic|aff)$/,
            handler: 'CacheFirst',
            options: { cacheName: 'dictionary', expiration: { maxEntries: 4 } },
          },
        ],
        maximumFileSizeToCacheInBytes: 4 * 1024 * 1024,
        navigateFallback: 'index.html',
        // Real files and landing pages opened directly (sitemap, preview image, FAQ…) must come from the
        // server, not be answered with the app.
        navigateFallbackDenylist: [
          /^[^?]*\.(xml|txt|png|ico|svg|webmanifest|json)(\?.*)?$/,
          new RegExp(`^[^?]*/(${pageSlugs})/?(\\?.*)?$`),
        ],
      },
    }),
  ],
  build: {
    // Only the diagram library (loaded just for notes with diagrams) is bigger than the usual
    // 500 KB; what loads at startup has its own budget in e2e/first-paint.spec.ts.
    chunkSizeWarningLimit: 700,
    rolldownOptions: {
      output: {
        // Keep the diagram library apart, so it isn't downloaded for offline use by everyone.
        chunkFileNames: (chunk) =>
          chunk.moduleIds.some((id) => DIAGRAM_MODULES.test(id))
            ? 'assets/diagrams/[name]-[hash].js'
            : 'assets/[name]-[hash].js',
        // Libraries that change rarely get files of their own: an update to Blankleaf then
        // downloads only Blankleaf's code, and the browser fetches the parts side by side.
        codeSplitting: {
          groups: [
            // Not react-dom/server: only the web page export uses it, and it loads then.
            {
              name: 'react',
              test: /node_modules[\\/](react|scheduler)[\\/]|node_modules[\\/]react-dom[\\/](?!server|cjs[\\/]react-dom-server)/,
            },
            { name: 'dexie', test: /node_modules[\\/]dexie[\\/]/ },
            { name: 'dnd', test: /node_modules[\\/]@dnd-kit[\\/]/ },
          ],
        },
      },
    },
  },
  define: { __APP_VERSION__: JSON.stringify(pkg.version) },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./tests/setup.ts'],
    // Headroom for busy CI runners and machines; individual waits are capped in tests/setup.ts.
    testTimeout: 15_000,
    include: ['src/**/*.test.{ts,tsx}', 'site/**/*.test.ts'],
    css: false,
  },
}))
