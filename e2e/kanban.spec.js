// @ts-check
const { test, expect } = require('@playwright/test');
const { gotoWithDependencies } = require('./helpers');

test.describe('Kanban Board', () => {
    test.beforeEach(async ({ page }) => {
        await page.addInitScript(() => {
            window.localStorage.clear();
        });
        await gotoWithDependencies(page, '/');
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

        await firstColumn.locator('.column-quick-add-trigger').click();

        // textarea inside .quick-add-input-wrapper
        await firstColumn.locator('.quick-add-input-wrapper textarea').fill('New Task');

        // .btn-primary inside .add-actions
        await firstColumn.locator('.add-actions .btn-primary').click();

        await expect(firstColumn.locator('.task-card')).toContainText('New Task');
    });

    test('should keep quick add open on enter and insert new tasks at the top', async ({ page }) => {
        const firstColumn = page.locator('.kanban-column').first();
        await firstColumn.locator('.column-quick-add-trigger').click();

        const quickAddInput = firstColumn.locator('.quick-add-input-wrapper textarea');
        await quickAddInput.fill('Task One');
        await quickAddInput.press('Enter');

        await expect(quickAddInput).toBeVisible();
        await quickAddInput.fill('Task Two');
        await quickAddInput.press('Enter');

        const taskTitles = firstColumn.locator('.task-card .task-title');
        await expect(taskTitles.nth(0)).toHaveText('Task Two');
        await expect(taskTitles.nth(1)).toHaveText('Task One');
    });

    test('should keep header search focused after closing a column menu via outside click', async ({ page }) => {
        const firstColumn = page.locator('.kanban-column').first();
        await firstColumn.locator('.column-menu-trigger').click();
        await expect(firstColumn.locator('.dropdown-menu')).toBeVisible();

        const searchInput = page.locator('.workspace-search-input');
        await searchInput.click();
        await expect(searchInput).toBeFocused();
        await searchInput.fill('menu focus');
        await expect(searchInput).toHaveValue('menu focus');
    });

    test('should create and close quick add on outside click without stealing search focus', async ({ page }) => {
        const firstColumn = page.locator('.kanban-column').first();
        await firstColumn.locator('.column-quick-add-trigger').click();

        await firstColumn.locator('.quick-add-input-wrapper textarea').fill('Outside Click Task');

        const searchInput = page.locator('.workspace-search-input');
        await searchInput.click();

        await expect(searchInput).toBeFocused();
        await expect(firstColumn.locator('.quick-add-input-wrapper')).toHaveCount(0);
        await expect(firstColumn.locator('.task-card')).toContainText('Outside Click Task');

        await searchInput.fill('outside submit');
        await expect(searchInput).toHaveValue('outside submit');
    });

    test('should keep quick add open with template error on outside click and preserve search focus', async ({ page }) => {
        const firstColumn = page.locator('.kanban-column').first();
        await firstColumn.locator('.column-quick-add-trigger').click();

        await firstColumn.locator('.quick-add-input-wrapper textarea').fill('/unknown-template Task title');

        const searchInput = page.locator('.workspace-search-input');
        await searchInput.click();

        await expect(searchInput).toBeFocused();
        await expect(firstColumn.locator('.quick-add-input-wrapper')).toBeVisible();
        await expect(firstColumn.locator('.quick-add-input-wrapper .form-error')).toContainText('Select an existing template.');
        await expect(firstColumn.locator('.task-card', { hasText: 'Task title' })).toHaveCount(0);

        await searchInput.fill('template error');
        await expect(searchInput).toHaveValue('template error');
    });

    test('should keep focus on modal controls when task actions menu closes from outside click', async ({ page }) => {
        const firstColumn = page.locator('.kanban-column').first();
        await firstColumn.locator('.column-quick-add-trigger').click();
        await firstColumn.locator('.quick-add-input-wrapper textarea').fill('Modal Focus Task');
        await firstColumn.locator('.add-actions .btn-primary').click();

        await page.locator('.task-card').filter({ hasText: 'Modal Focus Task' }).locator('.task-open-btn').click();
        await expect(page.locator('.modal-content')).toBeVisible();

        await page.locator('.modal-task-actions .column-menu-trigger').click();
        await expect(page.locator('.modal-task-actions .dropdown-menu')).toBeVisible();

        const titleInput = page.locator('.modal-title-input');
        await titleInput.click();
        await expect(titleInput).toBeFocused();
        await titleInput.fill('Modal Focus Task Updated');
        await expect(titleInput).toHaveValue('Modal Focus Task Updated');

        await page.locator('.modal-task-actions .column-menu-trigger').click();
        await expect(page.locator('.modal-task-actions .dropdown-menu')).toBeVisible();

        const prioritySelect = page.locator('.modal-content select').first();
        await prioritySelect.click();
        await expect(prioritySelect).toBeFocused();
        await prioritySelect.selectOption('I');
        await expect(prioritySelect).toHaveValue('I');
    });

    test('should edit task details via modal', async ({ page }) => {
        // Create task first
        const firstColumn = page.locator('.kanban-column').first();
        await firstColumn.locator('.column-quick-add-trigger').click();
        await firstColumn.locator('.quick-add-input-wrapper textarea').fill('Task to Edit');
        await firstColumn.locator('.add-actions .btn-primary').click();

        // Open modal
        await page.locator('.task-card').filter({ hasText: 'Task to Edit' }).locator('.task-open-btn').click();

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
        await firstColumn.locator('.column-quick-add-trigger').click();
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
        await firstColumn.locator('.column-quick-add-trigger').click();
        await firstColumn.locator('.quick-add-input-wrapper textarea').fill('Task to delete');
        await firstColumn.locator('.add-actions .btn-primary').click();

        await expect(page.locator('.task-card')).toHaveCount(1);

        await page.locator('button[title="Delete All Data (Reset App)"]').click();
        await expect(page.locator('.app-dialog-panel')).toBeVisible();
        await page.locator('.app-dialog-panel .btn-danger').click();

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
