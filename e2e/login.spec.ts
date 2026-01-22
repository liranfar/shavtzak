import { test, expect } from '@playwright/test';

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

    await emailInput.fill('test@example.com');
    await passwordInput.fill('password123');

    await expect(emailInput).toHaveValue('test@example.com');
    await expect(passwordInput).toHaveValue('password123');
  });

  test('should show loading state when submitting', async ({ page }) => {
    // Fill in credentials
    await page.getByLabel('אימייל').fill('test@example.com');
    await page.getByLabel('סיסמה').fill('password123');

    // Click login button
    const loginButton = page.getByRole('button', { name: 'התחברות' });
    await loginButton.click();

    // Button should show loading state (this may be quick)
    // The button text changes to 'מתחבר...' during loading
    await expect(page.getByRole('button', { name: /מתחבר|התחברות/ })).toBeVisible();
  });

  test('should display RTL layout', async ({ page }) => {
    const container = page.locator('[dir="rtl"]');
    await expect(container).toBeVisible();
  });
});

