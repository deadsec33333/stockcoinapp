import { defineConfig, devices } from '@playwright/test';
export default defineConfig({ testDir: './tests', testMatch: 'browser.spec.ts', use: { baseURL: 'http://127.0.0.1:3000', ...devices['Desktop Chrome'] }, reporter: 'list', projects: [{ name: 'desktop' }, { name: 'mobile', use: { ...devices['iPhone 13'], defaultBrowserType: 'chromium' } }] });
