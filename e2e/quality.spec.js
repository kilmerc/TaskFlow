// @ts-check
const { test, expect } = require('@playwright/test');
const { gotoWithDependencies } = require('./helpers');

test.describe('Quality System Coverage', () => {
    test.beforeEach(async ({ page }) => {
        await gotoWithDependencies(page, '/');
        await page.evaluate(() => {
            window.localStorage.clear();
        });
        await page.reload();
    });

    test('should persist cross-column drag movement after reload', async ({ page }) => {
        const firstColumn = page.locator('.kanban-column').first();
        const secondColumn = page.locator('.kanban-column').nth(1);

        await firstColumn.locator('.column-quick-add-trigger').click();
        await firstColumn.locator('.quick-add-input-wrapper textarea').fill('Drag Persist Task');
        await firstColumn.locator('.add-actions .btn-primary').click();

        await secondColumn.locator('.column-quick-add-trigger').click();
        await secondColumn.locator('.quick-add-input-wrapper textarea').fill('Drop Anchor Task');
        await secondColumn.locator('.add-actions .btn-primary').click();

        await firstColumn
            .locator('.task-card')
            .filter({ hasText: 'Drag Persist Task' })
            .dragTo(secondColumn.locator('.task-card').filter({ hasText: 'Drop Anchor Task' }));

        await expect(secondColumn.locator('.task-card').filter({ hasText: 'Drag Persist Task' })).toBeVisible();
        await page.waitForTimeout(400);

        await page.reload();

        const secondColumnAfterReload = page.locator('.kanban-column').nth(1);
        await expect(secondColumnAfterReload.locator('.task-card').filter({ hasText: 'Drag Persist Task' })).toBeVisible();
    });

    test('should append to the bottom when dropped in lower column whitespace', async ({ page }) => {
        const firstColumn = page.locator('.kanban-column').first();
        const secondColumn = page.locator('.kanban-column').nth(1);

        await firstColumn.locator('.column-quick-add-trigger').click();
        await firstColumn.locator('.quick-add-input-wrapper textarea').fill('Whitespace Drop Task');
        await firstColumn.locator('.add-actions .btn-primary').click();

        await secondColumn.locator('.column-quick-add-trigger').click();
        await secondColumn.locator('.quick-add-input-wrapper textarea').fill('Anchor One');
        await secondColumn.locator('.add-actions .btn-primary').click();
        await secondColumn.locator('.column-quick-add-trigger').click();
        await secondColumn.locator('.quick-add-input-wrapper textarea').fill('Anchor Two');
        await secondColumn.locator('.add-actions .btn-primary').click();

        await firstColumn
            .locator('.task-card')
            .filter({ hasText: 'Whitespace Drop Task' })
            .dragTo(secondColumn.locator('.column-drop-spacer'));

        await expect(secondColumn.locator('.task-card .task-title').last()).toHaveText('Whitespace Drop Task');
    });

    test('should export then import a valid backup and restore data', async ({ page }) => {
        const firstColumn = page.locator('.kanban-column').first();
        await firstColumn.locator('.column-quick-add-trigger').click();
        await firstColumn.locator('.quick-add-input-wrapper textarea').fill('Backup Restore Task #ops');
        await firstColumn.locator('.add-actions .btn-primary').click();
        await expect(page.locator('.task-card').filter({ hasText: 'Backup Restore Task' })).toBeVisible();

        await page.locator('button[title="Export Data"]').click();
        await expect(page.locator('.app-toast-success')).toContainText('Backup exported successfully');

        await page.waitForTimeout(400);
        const rawBackup = await page.evaluate(() => window.localStorage.getItem('taskflow_data'));
        expect(rawBackup).toBeTruthy();
        const backupTaskCount = JSON.parse(rawBackup).columnTaskOrder;
        expect(Object.values(backupTaskCount).flat().length).toBeGreaterThan(0);

        await page.locator('button[title="Delete All Data (Reset App)"]').click();
        await page.locator('.app-dialog-panel .btn-danger').click();
        await expect(page.locator('.task-card').filter({ hasText: 'Backup Restore Task' })).toHaveCount(0);

        await page.setInputFiles('input[type="file"]', {
            name: 'taskflow-valid-backup.json',
            mimeType: 'application/json',
            buffer: Buffer.from(rawBackup, 'utf-8')
        });

        await expect(page.locator('.app-toast-success')).toContainText('Import successful');
        await expect.poll(async () => page.evaluate(() => {
            const raw = window.localStorage.getItem('taskflow_data');
            if (!raw) return 0;
            return Object.keys(JSON.parse(raw).tasks || {}).length;
        })).toBeGreaterThan(0);
        await expect(page.locator('.task-card').filter({ hasText: 'Backup Restore Task' })).toBeVisible();
        await expect(page.locator('.task-card .tag-pill').first()).toHaveText('ops');
    });

    test('should invoke print flow and clean up print container', async ({ page }) => {
        await page.evaluate(() => {
            window.__PRINT_CALL_COUNT__ = 0;
            window.print = () => {
                window.__PRINT_CALL_COUNT__ += 1;
            };
        });

        await page.locator('.column-menu-trigger').first().click();
        await page.locator('.dropdown-menu .menu-item', { hasText: 'Print List' }).first().click();

        await expect(page.locator('.print-container')).toBeVisible();

        const printCalls = await page.evaluate(() => window.__PRINT_CALL_COUNT__);
        expect(printCalls).toBe(1);

        await page.waitForTimeout(700);
        await expect(page.locator('.print-container')).toHaveCount(0);
    });

    test('should support keyboard create, edit, and dialog confirmation flow', async ({ page }) => {
        const firstColumn = page.locator('.kanban-column').first();

        await firstColumn.locator('.column-quick-add-trigger').focus();
        await page.keyboard.press('Enter');
        await page.keyboard.type('Keyboard Flow Task');
        await page.keyboard.press('Enter');

        const taskOpenButton = firstColumn.locator('.task-card').filter({ hasText: 'Keyboard Flow Task' }).locator('.task-open-btn');
        await taskOpenButton.focus();
        await page.keyboard.press('Enter');
        await expect(page.locator('.modal-content')).toBeVisible();

        await page.locator('.modal-title-input').focus();
        await page.keyboard.press('Control+A');
        await page.keyboard.type('Keyboard Flow Task Updated');
        await page.locator('.modal-footer .btn-primary', { hasText: 'OK' }).focus();
        await page.keyboard.press('Enter');

        await expect(page.locator('.task-card').filter({ hasText: 'Keyboard Flow Task Updated' })).toBeVisible();

        await page.locator('button[title="Delete All Data (Reset App)"]').focus();
        await page.keyboard.press('Enter');
        await expect(page.locator('.app-dialog-panel')).toBeVisible();
        await page.locator('.app-dialog-panel .btn-danger').focus();
        await page.keyboard.press('Enter');

        await expect(page.locator('.task-card')).toHaveCount(0);
    });
});
