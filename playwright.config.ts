import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: 'tests/e2e',
  timeout: 60_000,
  reporter: 'list',
  use: {
    baseURL: process.env.E2E_BASE_URL || 'https://gelato.education',
    trace: 'retain-on-failure',
    viewport: { width: 390, height: 844 },
  },
});
