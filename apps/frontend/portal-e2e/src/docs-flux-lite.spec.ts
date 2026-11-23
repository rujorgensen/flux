import { expect, test } from '@playwright/test';

// The docs pages sit behind the auth guard. A stub session and network let the test open them without a real login.
test.beforeEach(async ({ page, context }) => {
    await context.grantPermissions(['clipboard-read', 'clipboard-write']);
    await page.route('**/api/auth/get-session**', (route) => route.fulfill({
        json: {
            session: { id: 's', userId: 'u', token: 't', expiresAt: '2099-01-01T00:00:00.000Z' },
            user: { id: 'u', name: 'E2E', email: 'e2e@example.test', emailVerified: true },
        },
    }));
    // Without a network, the layout sends the user to /no-network, also from the docs
    await page.route('**/api/networks', (route) => route.fulfill({
        json: [{ id: 'net-e2e', alias: 'E2E', subscription: 'free', users: [{ userId: 'u', role: 'owner' }] }],
    }));
});

test('Get Started shows flux-lite, with a working install switch and copy button', async ({ page }) => {
    await page.goto('/docs/get-started');

    await expect(page.getByRole('heading', { name: 'On a small device' })).toBeVisible({ timeout: 15_000 });
    const section = page.locator('pre', { hasText: '@persistica/flux-lite' });

    // The package manager switch changes the flux-lite install command
    await page.getByRole('button', { name: 'npm', exact: true }).first().click();
    await expect(section.first()).toContainText('npm install @persistica/flux-lite');

    // The copy button of device.ts puts the snippet on the clipboard
    const block = page.locator('div.not-prose', { hasText: 'device.ts' });
    await block.getByRole('button', { name: 'Copy' }).click();
    await expect(block.getByRole('button', { name: 'Copied!' })).toBeVisible();
    expect(await page.evaluate(() => navigator.clipboard.readText())).toContain('createFluxLiteAgent');
});

test('Introduction lists flux-lite on the FluxAgent card', async ({ page }) => {
    await page.goto('/docs/introduction');

    await expect(page.getByRole('heading', { name: 'Core Concepts' })).toBeVisible({ timeout: 15_000 });
    await expect(page.getByText('@persistica/flux-lite')).toBeVisible();
    await page.waitForTimeout(1_000); // the no-network redirect, if any, comes after the first render
    await expect(page).toHaveURL(/\/docs\/introduction$/);
});
