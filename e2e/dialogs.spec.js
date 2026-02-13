// @ts-check
const { test, expect } = require('@playwright/test');

test.describe('Dialogs and Toasts', () => {
    test.beforeEach(async ({ page }) => {
        await page.addInitScript(() => {
            window.localStorage.clear();
        });
        await page.goto('/');
    });

    test('should use app dialog for delete-all and avoid native browser dialogs', async ({ page }) => {
        let nativeDialogCount = 0;
        page.on('dialog', async dialog => {
            nativeDialogCount += 1;
            await dialog.dismiss();
        });

        const firstColumn = page.locator('.kanban-column').first();
        await firstColumn.locator('.quick-add-btn').click();
        await firstColumn.locator('.quick-add-input-wrapper textarea').fill('Task to delete');
        await firstColumn.locator('.add-actions .btn-primary').click();
        await expect(page.locator('.task-card')).toHaveCount(1);

        await page.locator('button[title="Delete All Data (Reset App)"]').click();
        await expect(page.locator('.app-dialog-panel')).toBeVisible();
        await page.locator('.app-dialog-panel .btn-danger').click();

        await expect(page.locator('.task-card')).toHaveCount(0);
        expect(nativeDialogCount).toBe(0);
    });

    test('should show import/export feedback via toasts', async ({ page }) => {
        await page.locator('button[title="Export Data"]').click();
        await expect(page.locator('.app-toast-success')).toContainText('Backup exported successfully');

        await page.setInputFiles('input[type="file"]', {
            name: 'invalid.json',
            mimeType: 'application/json',
            buffer: Buffer.from('not-json')
        });

        await expect(page.locator('.app-toast-error')).toContainText('Invalid backup JSON file');
    });

    test('should create workspace with prompt dialog validation', async ({ page }) => {
        await page.locator('.ws-current-btn').click();
        await page.locator('.ws-create').click();
        await expect(page.locator('.app-dialog-panel')).toBeVisible();

        await page.locator('.app-dialog-input').fill('   ');
        await page.locator('.app-dialog-panel .btn-primary').click();
        await expect(page.locator('.app-dialog-error')).toContainText('Workspace name is required');

        await page.locator('.app-dialog-input').fill('Engineering');
        await page.locator('.app-dialog-panel .btn-primary').click();

        await expect(page.locator('.ws-current-btn')).toContainText('Engineering');
    });
});
