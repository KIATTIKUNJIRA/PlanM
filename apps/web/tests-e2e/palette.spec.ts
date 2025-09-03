import { test, expect } from '@playwright/test';

test('command palette navigation', async ({ page }) => {
  await page.goto('/home');
  await page.keyboard.press(process.platform === 'darwin' ? 'Meta+K' : 'Control+K');
  const input = page.getByTestId('command-palette-input');
  await input.waitFor({ state: 'visible' });
  await input.fill('Project');
  await page.keyboard.press('ArrowDown');
  await page.keyboard.press('Enter');
  await expect(page).toHaveURL(/projects/i);
});
