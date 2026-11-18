import { defineConfig } from '@playwright/test'

const PORT = 4174

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? 'github' : 'list',
  use: {
    baseURL: `http://localhost:${PORT}/blankleaf/`,
    // Most tests run without the service worker; the offline test turns it on.
    serviceWorkers: 'block',
    trace: 'retain-on-failure',
  },
  // No device preset: it spoofs a Windows user agent, which would make the app (correctly)
  // expect Ctrl shortcuts on a Mac runner.
  projects: [
    {
      name: 'chromium',
      testIgnore: /\.phone\.spec\.ts$/,
      use: { browserName: 'chromium', viewport: { width: 1280, height: 800 } },
    },
    // Phone layout: a 390×844 touch screen (no device preset, see above).
    {
      name: 'phone',
      testMatch: /\.phone\.spec\.ts$/,
      use: {
        browserName: 'chromium',
        viewport: { width: 390, height: 844 },
        hasTouch: true,
        isMobile: true,
      },
    },
  ],
  webServer: {
    command: `npm run build && npx vite preview --base /blankleaf/ --port ${PORT} --strictPort`,
    url: `http://localhost:${PORT}/blankleaf/`,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
})
