import { test, expect } from '@playwright/test';

test('health drawer open/close', async ({ page }) => {
  await page.goto('/login');
  await page.getByRole('button', { name: /Health|Healthy|Degraded|Unhealthy|Health: pending/i }).click();
  const drawer = page.getByTestId('health-drawer');
  await expect(drawer).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(drawer).not.toBeVisible();
});
