import { test, expect } from '@playwright/test';

/**
 * Navigation tests - tests the main app navigation and layout
 * These tests require authentication, so they mock the auth state
 */
test.describe('App Navigation', () => {
  test.beforeEach(async ({ page }) => {
    // Mock the Supabase auth state before navigating
    await page.addInitScript(() => {
      // Mock the auth state in localStorage
      const mockAuthData = {
        currentSession: {
          access_token: 'mock-token',
          refresh_token: 'mock-refresh',
          expires_in: 3600,
          token_type: 'bearer',
          user: {
            id: 'test-user-id',
            email: 'test@example.com',
            role: 'authenticated',
          },
        },
        expiresAt: Date.now() + 3600000,
      };
      
      // Supabase stores auth in localStorage with a key pattern
      const supabaseKey = Object.keys(localStorage).find(k => k.includes('supabase'));
      if (supabaseKey) {
        localStorage.setItem(supabaseKey, JSON.stringify(mockAuthData));
      }
    });
  });

  test('should show login page when not authenticated', async ({ page }) => {
    // Clear any mock and go to the page
    await page.goto('/');
    
    // Should show login page elements when not authenticated
    // (The mock may or may not take effect depending on timing)
    const loginVisible = await page.getByText('שבצ"ק').isVisible().catch(() => false);
    expect(loginVisible).toBeTruthy();
  });

  test('login page should have proper structure', async ({ page }) => {
    await page.goto('/');
    
    // Check for Shield icon container (the login logo area)
    const logoArea = page.locator('.bg-blue-100.rounded-full');
    await expect(logoArea).toBeVisible();
    
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

