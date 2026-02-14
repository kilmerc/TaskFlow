// @ts-check
const { test, expect } = require('@playwright/test');
const { gotoWithDependencies } = require('./helpers');

test.describe('Vue Runtime Warnings', () => {
    test.beforeEach(async ({ page }) => {
        await page.addInitScript(() => {
            window.localStorage.clear();
        });
    });

    test('should not emit Vue warnings during core interactions', async ({ page }) => {
        const vueWarnings = [];

        page.on('console', msg => {
            const text = msg.text();
            if (text.includes('[Vue warn]')) {
                vueWarnings.push(text);
            }
        });

        await gotoWithDependencies(page, '/');

        await page.locator('button[title="Toggle Theme"]').click();
        await page.locator('button[title="Calendar View"]').click();
        await page.locator('button[title="Eisenhower Matrix View"]').click();
        await page.locator('button[title="Kanban Board"]').click();

        await page.locator('.workspace-switcher .ws-current-btn').click();
        const workspaceDropdown = page.locator('.workspace-switcher .ws-dropdown');
        await expect(workspaceDropdown).toBeVisible();
        await page.locator('main').click({ position: { x: 12, y: 12 } });
        await expect(workspaceDropdown).toBeHidden();

        await page.locator('button[title=\"Delete All Data (Reset App)\"]').click();
        const dialog = page.locator('.app-dialog-panel');
        await expect(dialog).toBeVisible();
        await dialog.locator('button.btn-text').click();

        expect(vueWarnings, vueWarnings.join('\n')).toEqual([]);
    });
});
