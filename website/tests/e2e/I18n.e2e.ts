import { expect, test } from '@playwright/test';

test.describe('I18n', () => {
  test.describe('Persian-only site', () => {
    test('should render Persian homepage content', async ({ page }) => {
      await page.goto('/');

      await expect(page.getByText('سامانه مدیریت مدرسه')).toBeVisible();
      await expect(page.locator('html')).toHaveAttribute('lang', 'fa');
      await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');
    });
  });
});
