// @ts-check
const { test, expect } = require('@playwright/test');

test.describe('Kanban Board', () => {
    test.beforeEach(async ({ page }) => {
        await page.addInitScript(() => {
            window.localStorage.clear();
        });
        await page.goto('/');
    });

    test('should add a new column', async ({ page }) => {
        // .add-column-btn
        await page.locator('.add-column-btn').click();

        // input inside .add-column-input-wrapper
        await page.locator('.add-column-input-wrapper input').fill('New Column');

        // .btn-primary inside .add-actions relative to add-column-container
        await page.locator('.add-column-container .add-actions .btn-primary').click();

        await expect(page.locator('.kanban-column').filter({ hasText: 'New Column' })).toBeVisible();
    });

    test('should add a new task', async ({ page }) => {
        const firstColumn = page.locator('.kanban-column').first();

        // .quick-add-btn
        await firstColumn.locator('.quick-add-btn').click();

        // textarea inside .quick-add-input-wrapper
        await firstColumn.locator('.quick-add-input-wrapper textarea').fill('New Task');

        // .btn-primary inside .add-actions
        await firstColumn.locator('.add-actions .btn-primary').click();

        await expect(firstColumn.locator('.task-card')).toContainText('New Task');
    });

    test('should edit task details via modal', async ({ page }) => {
        // Create task first
        const firstColumn = page.locator('.kanban-column').first();
        await firstColumn.locator('.quick-add-btn').click();
        await firstColumn.locator('.quick-add-input-wrapper textarea').fill('Task to Edit');
        await firstColumn.locator('.add-actions .btn-primary').click();

        // Open modal
        await page.locator('.task-card').filter({ hasText: 'Task to Edit' }).click();

        // .modal-content
        await expect(page.locator('.modal-content')).toBeVisible();

        // Edit title: .modal-title-input
        await page.locator('.modal-title-input').fill('Edited Task');

        // Click OK: .btn-primary in .modal-footer
        // Filter by text "OK" ensures we don't click Delete if order changed
        await page.locator('.modal-footer .btn-primary').filter({ hasText: 'OK' }).click();

        await expect(page.locator('.task-card')).toContainText('Edited Task');
    });

    test('should handle inline tagging', async ({ page }) => {
        const firstColumn = page.locator('.kanban-column').first();
        await firstColumn.locator('.quick-add-btn').click();
        await firstColumn.locator('.quick-add-input-wrapper textarea').fill('Task with #urgent tag');
        await firstColumn.locator('.add-actions .btn-primary').click();

        const taskCard = firstColumn.locator('.task-card').first();
        await expect(taskCard).toContainText('Task with');
        await expect(taskCard).not.toContainText('#urgent');
        // .tag-pill
        await expect(taskCard.locator('.tag-pill')).toHaveText('urgent');
    });

    test('should delete all data and keep it cleared after reload', async ({ page }) => {
        const firstColumn = page.locator('.kanban-column').first();
        await firstColumn.locator('.quick-add-btn').click();
        await firstColumn.locator('.quick-add-input-wrapper textarea').fill('Task to delete');
        await firstColumn.locator('.add-actions .btn-primary').click();

        await expect(page.locator('.task-card')).toHaveCount(1);

        page.on('dialog', async dialog => {
            await dialog.accept();
        });

        await page.locator('button[title="Delete All Data (Reset App)"]').click();

        await expect(page.locator('.task-card')).toHaveCount(0);
        await expect(page.locator('.kanban-column').filter({ hasText: 'To Do' })).toBeVisible();
        await expect(page.locator('.kanban-column').filter({ hasText: 'In Progress' })).toBeVisible();
        await expect(page.locator('.kanban-column').filter({ hasText: 'Done' })).toBeVisible();

        const persistedTaskCount = await page.evaluate(() => {
            const raw = window.localStorage.getItem('taskflow_data');
            if (!raw) return -1;
            const parsed = JSON.parse(raw);
            return Object.keys(parsed.tasks || {}).length;
        });
        expect(persistedTaskCount).toBe(0);

        await page.reload();

        await expect(page.locator('.task-card')).toHaveCount(0);
        await expect(page.locator('.kanban-column').filter({ hasText: 'To Do' })).toBeVisible();
        await expect(page.locator('.kanban-column').filter({ hasText: 'In Progress' })).toBeVisible();
        await expect(page.locator('.kanban-column').filter({ hasText: 'Done' })).toBeVisible();
    });
});
