import { defineConfig } from '@playwright/test'

const PORT = 4174

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? 'github' : 'list',
  use: {
    baseURL: `http://localhost:${PORT}/notepadz/`,
    // Most tests run without the service worker; the offline test turns it on.
    serviceWorkers: 'block',
    trace: 'retain-on-failure',
  },
  // No device preset: it spoofs a Windows user agent, which would make the app (correctly)
  // expect Ctrl shortcuts on a Mac runner.
  projects: [
    { name: 'chromium', use: { browserName: 'chromium', viewport: { width: 1280, height: 800 } } },
  ],
  webServer: {
    command: `npm run build && npx vite preview --base /notepadz/ --port ${PORT} --strictPort`,
    url: `http://localhost:${PORT}/notepadz/`,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
})
