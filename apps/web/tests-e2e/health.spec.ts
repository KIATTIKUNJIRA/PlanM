import { test, expect } from '@playwright/test';

test('health drawer open/close', async ({ page }) => {
  await page.goto('/home');
  await page.getByRole('button', { name: /Health|Healthy|Degraded|Unhealthy/i }).click();
  const drawer = page.getByTestId('health-drawer');
  await expect(drawer).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(drawer).not.toBeVisible();
});
