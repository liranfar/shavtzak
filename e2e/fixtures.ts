import { test as base, expect } from '@playwright/test';

/**
 * Extended test fixtures for Shavtzak e2e tests
 */
export const test = base.extend({
  // Add custom fixtures here if needed
});

export { expect };

/**
 * Helper to mock authenticated state by setting localStorage
 * This bypasses the actual Supabase auth for testing
 */
export async function mockAuthState(page: ReturnType<typeof base['page']>) {
  // Mock Supabase auth state in localStorage
  await page.addInitScript(() => {
    const mockUser = {
      id: 'test-user-id',
      email: 'test@example.com',
      role: 'authenticated',
    };
    
    const mockSession = {
      access_token: 'mock-access-token',
      refresh_token: 'mock-refresh-token',
      expires_in: 3600,
      token_type: 'bearer',
      user: mockUser,
    };

    // Set the auth state that Supabase client looks for
    localStorage.setItem('sb-auth-token', JSON.stringify({
      currentSession: mockSession,
      expiresAt: Date.now() + 3600000,
    }));
  });
}

/**
 * Test data constants
 */
export const TEST_DATA = {
  validEmail: 'test@example.com',
  validPassword: 'testpassword123',
  invalidEmail: 'invalid@example.com',
  invalidPassword: 'wrongpassword',
};

