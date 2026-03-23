import { test, expect } from '@playwright/test';

test('redirects unauthenticated users to sign-in', async ({ page }) => {
    await page.goto('/');

    // Unauthenticated users are redirected to the sign-in page.
    // Allow up to 15s for the auth guard's async session check to complete.
    await expect(page).toHaveURL(/sign-in/, { timeout: 15000 });
    await expect(page.locator('h2')).toContainText('Welcome back');
});
