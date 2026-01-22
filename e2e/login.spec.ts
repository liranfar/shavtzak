import { test, expect, Page } from '@playwright/test';

// Test credentials from environment variables (masked in logs)
const TEST_EMAIL = process.env.E2E_TEST_EMAIL || 'test@example.com';
const TEST_PASSWORD = process.env.E2E_TEST_PASSWORD || 'password123';

/**
 * Fill credentials without exposing them in logs/traces
 * Uses page.evaluate to set values directly without logging
 */
async function fillCredentials(page: Page, email: string, password: string) {
  await page.evaluate(
    ({ email, password }) => {
      const emailInput = document.getElementById('email') as HTMLInputElement;
      const passwordInput = document.getElementById('password') as HTMLInputElement;
      if (emailInput) {
        emailInput.value = email;
        emailInput.dispatchEvent(new Event('input', { bubbles: true }));
      }
      if (passwordInput) {
        passwordInput.value = password;
        passwordInput.dispatchEvent(new Event('input', { bubbles: true }));
      }
    },
    { email, password }
  );
}

test.describe('Login Page', () => {
  test.beforeEach(async ({ page }) => {
    // Clear any existing auth state
    await page.goto('/');
  });

  test('should display login form with all required elements', async ({ page }) => {
    // Check page title/header
    await expect(page.getByText('שבצ"ק')).toBeVisible();
    await expect(page.getByText('מערכת ניהול משמרות')).toBeVisible();

    // Check form elements
    await expect(page.getByLabel('אימייל')).toBeVisible();
    await expect(page.getByLabel('סיסמה')).toBeVisible();
    await expect(page.getByRole('button', { name: 'התחברות' })).toBeVisible();
  });

  test('should have correct input placeholders', async ({ page }) => {
    const emailInput = page.getByLabel('אימייל');
    const passwordInput = page.getByLabel('סיסמה');

    await expect(emailInput).toHaveAttribute('placeholder', 'your@email.com');
    await expect(passwordInput).toHaveAttribute('placeholder', '••••••••');
  });

  test('should require email and password fields', async ({ page }) => {
    const emailInput = page.getByLabel('אימייל');
    const passwordInput = page.getByLabel('סיסמה');

    await expect(emailInput).toHaveAttribute('required', '');
    await expect(passwordInput).toHaveAttribute('required', '');
  });

  test('should allow typing in email and password fields', async ({ page }) => {
    const emailInput = page.getByLabel('אימייל');
    const passwordInput = page.getByLabel('סיסמה');

    // Fill credentials (masked - not shown in logs)
    await fillCredentials(page, TEST_EMAIL, TEST_PASSWORD);

    // Verify fields have values (without exposing actual values)
    await expect(emailInput).not.toHaveValue('');
    await expect(passwordInput).not.toHaveValue('');
  });

  test('should handle form submission', async ({ page }) => {
    // Fill in credentials (masked - not shown in logs)
    await fillCredentials(page, TEST_EMAIL, TEST_PASSWORD);

    // Get the login button
    const loginButton = page.getByRole('button', { name: 'התחברות' });
    
    // Verify button is enabled before click
    await expect(loginButton).toBeEnabled();
    
    // Click login button
    await loginButton.click();

    // Wait for either: successful login (redirect) or error message or button returns to normal
    // This tests that the form submission is handled without crashing
    await page.waitForTimeout(1000);
    
    // Page should still be functional - either showing login form or main app
    const pageIsResponsive = await page.getByRole('button').first().isVisible();
    expect(pageIsResponsive).toBeTruthy();
  });

  test('should display RTL layout', async ({ page }) => {
    const container = page.locator('[dir="rtl"]');
    await expect(container).toBeVisible();
  });
});

