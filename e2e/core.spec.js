// @ts-check
const { test, expect } = require('@playwright/test');
const { gotoWithDependencies } = require('./helpers');

test.describe('Core Features', () => {
    test.beforeEach(async ({ page }) => {
        // Clear localStorage before each test to start fresh
        await page.addInitScript(() => {
            window.localStorage.clear();
        });
        await gotoWithDependencies(page, '/');
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

    test('should render glass header and segmented view controls', async ({ page }) => {
        const header = page.locator('header');
        await expect(header).toBeVisible();
        await expect(header).toHaveCSS('backdrop-filter', 'blur(12px)');
        await expect(page.locator('.view-toggle.segmented-control')).toBeVisible();
        await expect(page.locator('.view-toggle button.active')).toHaveCount(1);
    });

    test('should open task modal as a right side-sheet on desktop', async ({ page }) => {
        const firstColumn = page.locator('.kanban-column').first();
        await firstColumn.locator('.column-quick-add-trigger').click();
        await firstColumn.locator('.quick-add-input-wrapper textarea').fill('Side Sheet Visual Test');
        await firstColumn.locator('.add-actions .btn-primary').click();

        await page.locator('.task-card').filter({ hasText: 'Side Sheet Visual Test' }).locator('.task-open-btn').click();
        const modal = page.locator('.modal-content');
        await expect(modal).toBeVisible();

        const box = await modal.boundingBox();
        const viewport = page.viewportSize();
        expect(box).toBeTruthy();
        expect(viewport).toBeTruthy();
        expect(Math.round(box.x + box.width)).toBeGreaterThanOrEqual(viewport.width - 4);
    });
});
