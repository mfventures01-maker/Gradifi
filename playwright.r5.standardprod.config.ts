import { defineConfig, devices } from '@playwright/test';

/**
 * HOEOS G4 R5 - Standard Production Build Preview Playwright Configuration.
 * Executes independent engine certification test against standard production Vite preview.
 * Test seam is strictly absent.
 */
export default defineConfig({
  testDir: './e2e',
  outputDir: './test-results/.playwright-r5-temp',
  fullyParallel: false,
  workers: 1,
  reporter: [
    ['list'],
    ['json', { outputFile: 'evidence/g4-repair-20261017T1430Z/r5/run-20261018T0035Z/r5-playwright-results.json' }]
  ],
  use: {
    baseURL: 'http://127.0.0.1:4173',
    trace: 'retain-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: {
    command: 'npm run preview -- --host 127.0.0.1 --port 4173 --strictPort',
    url: 'http://127.0.0.1:4173',
    reuseExistingServer: false,
    timeout: 120_000,
    stdout: 'pipe',
    stderr: 'pipe'
  },
});
