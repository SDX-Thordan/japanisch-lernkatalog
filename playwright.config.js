import { defineConfig } from '@playwright/test';

// E2E-Smokes gegen die statisch ausgelieferte Seite (echter Browser).
export default defineConfig({
  testDir: 'tests/e2e',
  timeout: 30000,
  use: { baseURL: 'http://localhost:8080', headless: true },
  reporter: 'list',
  webServer: {
    command: 'python3 -m http.server 8080',
    port: 8080,
    reuseExistingServer: true,
    timeout: 30000,
  },
});
