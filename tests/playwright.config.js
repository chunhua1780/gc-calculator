// @ts-check
const { defineConfig } = require('@playwright/test');

module.exports = defineConfig({
  testDir: '.',
  timeout: 30000,
  use: {
    headless: true,
    viewport: { width: 390, height: 844 },
  },
  reporter: 'list',
});
