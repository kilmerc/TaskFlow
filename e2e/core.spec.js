// @ts-check
const { test, expect } = require('@playwright/test');

test.describe('Core Features', () => {
    test.beforeEach(async ({ page }) => {
        // Clear localStorage before each test to start fresh
        await page.addInitScript(() => {
            window.localStorage.clear();
        });
        await page.goto('/');
    });

    test('should load the application with default state', async ({ page }) => {
        await expect(page).toHaveTitle(/TaskFlow/);
        await expect(page.locator('.kanban-board')).toBeVisible();

        // Check default columns
        await expect(page.locator('.kanban-column').filter({ hasText: 'To Do' })).toBeVisible();
        await expect(page.locator('.kanban-column').filter({ hasText: 'In Progress' })).toBeVisible();
        await expect(page.locator('.kanban-column').filter({ hasText: 'Done' })).toBeVisible();
    });

    test('should handle workspace management', async ({ page }) => {
        // Verify default workspace
        await expect(page.locator('.workspace-switcher')).toBeVisible();
        // Assuming "My Workspace" is default
        // We can check if it exists in the DOM, possibly in a span or button
        await expect(page.locator('.workspace-switcher')).toContainText('My Workspace');
    });

    test('should toggle theme', async ({ page }) => {
        const html = page.locator('html');
        // Check initial state (likely not light or not present)

        // Toggle button has title="Toggle Theme"
        const themeToggle = page.locator('button[title="Toggle Theme"]');
        await themeToggle.click();

        // Verify data-theme attribute changes to light or dark
        // The implementation toggles between 'dark' and 'light'.
        await expect(html).toHaveAttribute('data-theme', /light|dark/);
    });
});
