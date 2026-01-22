import { test, expect } from '@playwright/test';

/**
 * Navigation tests - tests the main app navigation and layout
 */
test.describe('App Navigation', () => {
  test('should show login page when not authenticated', async ({ page }) => {
    await page.goto('/');
    
    // Wait for the page to load (either login or loading state)
    await page.waitForLoadState('networkidle');
    
    // Should show login page title
    await expect(page.getByText('שבצ"ק')).toBeVisible({ timeout: 10000 });
  });

  test('login page should have proper structure', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // Check for Shield icon container (the login logo area)
    const logoArea = page.locator('.bg-blue-100.rounded-full');
    await expect(logoArea).toBeVisible({ timeout: 10000 });
    
    // Check form exists
    const form = page.locator('form');
    await expect(form).toBeVisible();
  });
});

test.describe('Responsive Design', () => {
  test('login page should be responsive on mobile', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/');

    // Login form should still be visible and usable
    await expect(page.getByLabel('אימייל')).toBeVisible();
    await expect(page.getByLabel('סיסמה')).toBeVisible();
    await expect(page.getByRole('button', { name: 'התחברות' })).toBeVisible();
  });

  test('login page should be responsive on tablet', async ({ page }) => {
    // Set tablet viewport
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.goto('/');

    // Login form should still be visible and usable
    await expect(page.getByLabel('אימייל')).toBeVisible();
    await expect(page.getByLabel('סיסמה')).toBeVisible();
    await expect(page.getByRole('button', { name: 'התחברות' })).toBeVisible();
  });

  test('login page should be responsive on desktop', async ({ page }) => {
    // Set desktop viewport
    await page.setViewportSize({ width: 1920, height: 1080 });
    await page.goto('/');

    // Login form should still be visible and centered
    await expect(page.getByLabel('אימייל')).toBeVisible();
    await expect(page.getByLabel('סיסמה')).toBeVisible();
    await expect(page.getByRole('button', { name: 'התחברות' })).toBeVisible();
  });
});

