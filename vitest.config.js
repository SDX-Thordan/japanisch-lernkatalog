import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/**/*.test.js'],
    // E2E (Playwright) liegt unter tests/e2e und wird separat über `npm run e2e` gefahren.
    exclude: ['tests/e2e/**', 'node_modules/**', 'www/**', 'android/**'],
  },
});
