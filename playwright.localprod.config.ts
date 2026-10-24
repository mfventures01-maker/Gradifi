import { defineConfig, devices } from '@playwright/test';

/**
 * HOEOS R3 - Local Production Playwright Configuration.
 *
 * Builds the current worktree in production mode with VITE_ENABLE_TEST_SEAM=true,
 * then runs the R2 specs against the built bundle via `vite preview`.
 *
 * This is a certification build, not the standard production build.
 * R1 established seam absence in the standard `npm run build`.
 * R3 establishes fixture-driven correctness in a production-mode build
 * with the seam enabled via build-time env injection.
 */

export default defineConfig({
  testDir: './e2e',
  outputDir: './test-results/.playwright-localprod-temp',
  fullyParallel: false,
  workers: 1,
  reporter: 'list',
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
    command: 'npm run build && npm run preview -- --host 127.0.0.1 --port 4173 --strictPort',
    url: 'http://127.0.0.1:4173',
    reuseExistingServer: false,
    timeout: 180_000,
    stdout: 'pipe',
    stderr: 'pipe',
    env: {
      VITE_ENABLE_TEST_SEAM: 'true',
    },
  },
});