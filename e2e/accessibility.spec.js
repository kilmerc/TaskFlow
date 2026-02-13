// @ts-check
const { test, expect } = require('@playwright/test');

test.describe('Accessibility', () => {
    test.beforeEach(async ({ page }) => {
        await page.addInitScript(() => {
            window.localStorage.clear();
        });
        let loaded = false;
        for (let attempt = 0; attempt < 3; attempt += 1) {
            await page.goto('/');
            loaded = await page.evaluate(() => window.__DEPENDENCIES_LOADED__ === true);
            if (loaded) break;
        }
        expect(loaded).toBeTruthy();
    });

    test('should support keyboard navigation for workspace and column menus', async ({ page }) => {
        const wsTrigger = page.locator('.ws-current-btn');
        await wsTrigger.focus();
        await page.keyboard.press('ArrowDown');
        await expect(page.locator('.ws-dropdown')).toBeVisible();
        await page.keyboard.press('Escape');
        await expect(page.locator('.ws-dropdown')).toHaveCount(0);

        const columnMenuTrigger = page.locator('.column-menu-trigger').first();
        await columnMenuTrigger.focus();
        await page.keyboard.press('ArrowDown');
        await expect(page.locator('.dropdown-menu').first()).toBeVisible();
        await page.keyboard.press('Escape');
        await expect(page.locator('.dropdown-menu')).toHaveCount(0);
    });

    test('should open task modal with keyboard from kanban, calendar, and eisenhower cards', async ({ page }) => {
        const firstColumn = page.locator('.kanban-column').first();
        await firstColumn.locator('.quick-add-btn').click();
        await firstColumn.locator('.quick-add-input-wrapper textarea').fill('Keyboard task');
        await firstColumn.locator('.add-actions .btn-primary').click();

        await page.locator('.task-open-btn').first().focus();
        await page.keyboard.press('Enter');
        await expect(page.locator('.modal-content')).toBeVisible();
        await page.locator('.close-btn').click();

        await page.locator('button[title="Calendar View"]').click();
        await page.locator('.calendar-layout').waitFor();
        await page.locator('.calendar-sidebar .task-open-btn').first().press('Enter');
        await expect(page.locator('.modal-content')).toBeVisible();
        await page.locator('.close-btn').click();

        await page.locator('button[title="Eisenhower Matrix View"]').click();
        await page.locator('.eisenhower-layout').waitFor();
        await page.locator('.matrix-task-card .task-open-btn').first().press('Enter');
        await expect(page.locator('.modal-content')).toBeVisible();
    });
});
