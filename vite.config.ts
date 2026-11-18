/// <reference types="vitest/config" />
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'
import pkg from './package.json' with { type: 'json' }

// GitHub Pages serves the app from /notepadz/; dev server stays at /.
export default defineConfig(({ command }) => ({
  base: command === 'build' ? '/notepadz/' : '/',
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      // Ask before swapping in a new version so nobody loses a half-typed note to a reload.
      registerType: 'prompt',
      includeAssets: ['favicon.ico', 'apple-touch-icon-180x180.png', 'logo.svg'],
      manifest: {
        name: 'Notepadz',
        short_name: 'Notepadz',
        description: 'A full-window, tabbed notepad that keeps everything in your browser.',
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
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,ico,woff2}'],
        maximumFileSizeToCacheInBytes: 4 * 1024 * 1024,
        navigateFallback: 'index.html',
      },
    }),
  ],
  define: { __APP_VERSION__: JSON.stringify(pkg.version) },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./tests/setup.ts'],
    // Headroom for busy CI runners and machines; individual waits are capped in tests/setup.ts.
    testTimeout: 15_000,
    include: ['src/**/*.test.{ts,tsx}'],
    css: false,
  },
}))
