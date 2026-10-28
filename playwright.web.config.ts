// Live smoke for the web app (docs/frontend-roadmap/TESTING-AND-REVIEW.md §L6).
// Specs skip themselves unless SL_WEB_URL is set, so the type check and --list work
// without the running stack.
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e-web',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: 0,
  reporter: 'list',
  use: {
    baseURL: process.env.SL_WEB_URL ?? 'http://localhost:3000',
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'chromium',
      // PW_CHANNEL=chrome uses the system Chrome instead of a downloaded Chromium.
      use: { ...devices['Desktop Chrome'], ...(process.env.PW_CHANNEL ? { channel: process.env.PW_CHANNEL } : {}) },
    },
  ],
});
