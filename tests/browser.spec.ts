import { test, expect } from '@playwright/test';
test('all routes render and do not overflow', async ({ page }) => {
  const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
  for (const path of ['/', '/explore', '/pairs', '/analytics', '/docs', '/coin/not-configured']) {
    await page.goto(path); await expect(page.locator('main')).toBeVisible();
    await expect(page.locator('body')).not.toContainText('Application error');
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBeTruthy();
  }
  expect(errors).toEqual([]);
});
test('theme persists and navigation works', async ({ page, isMobile }) => {
  await page.goto('/'); await page.getByRole('button', { name: 'Use dark theme' }).click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark'); await page.reload();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  if (isMobile) await page.getByRole('button', { name: 'Open menu' }).click();
  await page.getByRole('navigation', { name: isMobile ? 'Mobile navigation' : 'Main navigation', exact: true }).getByRole('link', { name: 'Explore', exact: true }).click();
  await expect(page).toHaveURL(/\/explore$/);
});
test('search and sorting are reflected in URL and survive refresh', async ({ page }) => {
  await page.goto('/explore'); await page.getByRole('textbox', { name: 'Search ticker or creator' }).fill('@alice'); await page.getByRole('button', { name: 'Search', exact: true }).click(); await expect(page).toHaveURL(/q=%40alice/);
  await page.getByRole('combobox', { name: 'Sort launches' }).selectOption('oldest'); await expect(page).toHaveURL(/sort=oldest/); await page.reload(); await expect(page.getByRole('textbox')).toHaveValue('@alice');
});
test('unconfigured data is explicit and no fake posting handle is linked', async ({ page }) => {
  await page.goto('/'); await expect(page.getByText('Awaiting live data · no activity is simulated.')).toBeVisible();
  await expect(page.locator('a[href*="x.com/intent"]')).toHaveCount(0);
});
test('copy control reports success', async ({ page, context }) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  await page.goto('/'); await page.getByRole('button', { name: 'Copy format' }).click(); await expect(page.getByText('Copied', { exact: true })).toBeVisible();
  expect(await page.evaluate(() => navigator.clipboard.readText())).toBe('@YOUR_BOT $TICKER #AAPL');
});
