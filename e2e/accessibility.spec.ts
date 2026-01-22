import { test, expect } from '@playwright/test';

// Test credentials from environment variables
const TEST_EMAIL = process.env.E2E_TEST_EMAIL || 'test@example.com';
const TEST_PASSWORD = process.env.E2E_TEST_PASSWORD || 'password123';

/**
 * Accessibility tests for Shavtzak
 * Tests basic accessibility requirements
 */
test.describe('Accessibility', () => {
  test('login form inputs should have proper labels', async ({ page }) => {
    await page.goto('/');

    // Check that inputs have associated labels
    const emailInput = page.getByLabel('אימייל');
    const passwordInput = page.getByLabel('סיסמה');

    await expect(emailInput).toBeVisible();
    await expect(passwordInput).toBeVisible();

    // Check that inputs have proper IDs linked to labels
    await expect(emailInput).toHaveAttribute('id', 'email');
    await expect(passwordInput).toHaveAttribute('id', 'password');
  });

  test('login button should be keyboard accessible', async ({ page }) => {
    await page.goto('/');

    // Fill in the form
    await page.getByLabel('אימייל').fill(TEST_EMAIL);
    await page.getByLabel('סיסמה').fill(TEST_PASSWORD);

    // Tab to the button and check it's focused
    await page.keyboard.press('Tab');
    
    // The button should be focusable
    const loginButton = page.getByRole('button', { name: 'התחברות' });
    await expect(loginButton).toBeVisible();
  });

  test('form should be navigable with keyboard', async ({ page }) => {
    await page.goto('/');

    // Start with email input
    const emailInput = page.getByLabel('אימייל');
    await emailInput.focus();
    await expect(emailInput).toBeFocused();

    // Tab to password
    await page.keyboard.press('Tab');
    const passwordInput = page.getByLabel('סיסמה');
    await expect(passwordInput).toBeFocused();

    // Tab to button
    await page.keyboard.press('Tab');
    const loginButton = page.getByRole('button', { name: 'התחברות' });
    await expect(loginButton).toBeFocused();
  });

  test('should have proper heading structure', async ({ page }) => {
    await page.goto('/');

    // Check for main heading
    const heading = page.getByRole('heading', { level: 1 });
    await expect(heading).toContainText('שבצ"ק');
  });

  test('inputs should have proper types', async ({ page }) => {
    await page.goto('/');

    const emailInput = page.getByLabel('אימייל');
    const passwordInput = page.getByLabel('סיסמה');

    await expect(emailInput).toHaveAttribute('type', 'email');
    await expect(passwordInput).toHaveAttribute('type', 'password');
  });
});

test.describe('Visual Regression', () => {
  test('login page should match snapshot', async ({ page }) => {
    await page.goto('/');
    
    // Wait for the page to fully load
    await page.waitForLoadState('networkidle');
    
    // Take a screenshot for visual comparison
    await expect(page).toHaveScreenshot('login-page.png', {
      maxDiffPixels: 100, // Allow small differences
    });
  });

  test('login page mobile should match snapshot', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/');
    
    await page.waitForLoadState('networkidle');
    
    await expect(page).toHaveScreenshot('login-page-mobile.png', {
      maxDiffPixels: 100,
    });
  });
});

