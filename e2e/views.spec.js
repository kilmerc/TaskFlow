// @ts-check
const { test, expect } = require('@playwright/test');
const { gotoWithDependencies } = require('./helpers');

test.describe('Views & Filtering', () => {
    test.beforeEach(async ({ page }) => {
        await page.addInitScript(() => {
            window.localStorage.clear();
        });
        await gotoWithDependencies(page, '/');

        // Setup: Create a task with date and tag
        const firstColumn = page.locator('.kanban-column').first();
        await firstColumn.locator('.column-quick-add-trigger').click();
        await firstColumn.locator('.quick-add-input-wrapper textarea').fill('Scheduled Task #work');
        await firstColumn.locator('.add-actions .btn-primary').click();

        // Open modal to set date
        await page.locator('.task-card').filter({ hasText: 'Scheduled Task' }).locator('.task-open-btn').click();

        // input[type="date"]
        await page.locator('.modal-content input[type="date"]').fill(new Date().toISOString().split('T')[0]); // Set to today

        // Click OK
        await page.locator('.modal-footer .btn-primary').filter({ hasText: 'OK' }).click();
    });

    test('should show tasks in calendar view', async ({ page }) => {
        // button[title="Calendar View"]
        await page.locator('button[title="Calendar View"]').click();

        // Verify task exists in calendar view
        // CalendarView.js root is .calendar-layout, grids are .calendar-grid
        await expect(page.locator('.calendar-layout')).toBeVisible();
        await expect(page.locator('.calendar-layout')).toContainText('Scheduled Task');
    });

    test('should show tasks in eisenhower matrix', async ({ page }) => {
        // Assign priority first
        await page.locator('button[title="Kanban Board"]').click();
        await page.locator('.task-card').filter({ hasText: 'Scheduled Task' }).locator('.task-open-btn').click();

        // Select priority using value 'I'
        await page.locator('.modal-content select').first().selectOption('I'); // Urgent & Important
        await page.locator('.modal-footer .btn-primary').filter({ hasText: 'OK' }).click();

        await page.locator('button[title="Eisenhower Matrix View"]').click();

        // Check presence using .eisenhower-layout (from component template)
        await expect(page.locator('.eisenhower-layout')).toBeVisible();
        await expect(page.locator('.eisenhower-layout')).toContainText('Scheduled Task');
    });

    test('should filter tasks by tag', async ({ page }) => {
        // Open Filter Dropdown: .filter-btn
        await page.locator('.filter-btn').click();

        // Select Tag: .filter-item containing #work
        await page.locator('.filter-item').filter({ hasText: 'work' }).locator('input').check();

        // Close dropdown
        await page.locator('.filter-btn').click();

        // Should be visible
        await expect(page.locator('.task-card').filter({ hasText: 'Scheduled Task' })).toBeVisible();

        // Add another task without tag
        const firstColumn = page.locator('.kanban-column').first();
        await firstColumn.locator('.column-quick-add-trigger').click();
        await firstColumn.locator('.quick-add-input-wrapper textarea').fill('Normal Task');
        await firstColumn.locator('.add-actions .btn-primary').click();

        // Normal Task should be hidden because filter is active
        await expect(page.locator('.task-card').filter({ hasText: 'Normal Task' })).toBeHidden();
        await expect(page.locator('.task-card').filter({ hasText: 'Scheduled Task' })).toBeVisible();
    });

    test('should scope tag filters to active workspace and clear invalid tags on switch', async ({ page }) => {
        await page.locator('.ws-current-btn').click();
        await page.locator('.ws-create').click();
        await page.locator('.app-dialog-input').fill('Second Workspace');
        await page.locator('.app-dialog-panel .btn-primary').click();

        const firstColumn = page.locator('.kanban-column').first();
        await firstColumn.locator('.column-quick-add-trigger').click();
        await firstColumn.locator('.quick-add-input-wrapper textarea').fill('Second task #personal');
        await firstColumn.locator('.add-actions .btn-primary').click();

        await page.locator('.ws-current-btn').click();
        await page.locator('.ws-item-btn', { hasText: 'My Workspace' }).click();

        await page.locator('.filter-btn').click();
        await expect(page.locator('.filter-item').filter({ hasText: 'work' })).toBeVisible();
        await expect(page.locator('.filter-item').filter({ hasText: 'personal' })).toHaveCount(0);
        await page.locator('.filter-item').filter({ hasText: 'work' }).locator('input').check();
        await page.locator('.filter-btn').click();
        await expect(page.locator('.filter-badge')).toHaveText('1');

        await page.locator('.ws-current-btn').click();
        await page.locator('.ws-item-btn', { hasText: 'Second Workspace' }).click();

        await expect(page.locator('.filter-badge')).toHaveCount(0);
        await page.locator('.filter-btn').click();
        await expect(page.locator('.filter-item').filter({ hasText: 'personal' })).toBeVisible();
        await expect(page.locator('.filter-item').filter({ hasText: 'work' })).toHaveCount(0);
    });

    test('should apply search across kanban, calendar sidebar, and eisenhower', async ({ page }) => {
        const firstColumn = page.locator('.kanban-column').first();
        await firstColumn.locator('.column-quick-add-trigger').click();
        await firstColumn.locator('.quick-add-input-wrapper textarea').fill('Another Task');
        await firstColumn.locator('.add-actions .btn-primary').click();

        await page.locator('.workspace-search-input').fill('work');
        await page.locator('.workspace-search-input').press('Enter');
        await page.waitForTimeout(250);

        await expect(page.locator('.task-card').filter({ hasText: 'Scheduled Task' })).toBeVisible();
        await expect(page.locator('.task-card').filter({ hasText: 'Another Task' })).toHaveCount(0);

        await page.locator('button[title="Calendar View"]').click();
        await expect(page.locator('.calendar-layout')).toContainText('Scheduled Task');
        await expect(page.locator('.calendar-layout')).not.toContainText('Another Task');

        await page.locator('button[title="Eisenhower Matrix View"]').click();
        await expect(page.locator('.eisenhower-layout')).toContainText('Scheduled Task');
        await expect(page.locator('.eisenhower-layout')).not.toContainText('Another Task');
    });

    test('should allow kanban drag reorder while search is active and preserve hidden tasks', async ({ page }) => {
        const firstColumn = page.locator('.kanban-column').first();
        await firstColumn.locator('.column-quick-add-trigger').click();
        await firstColumn.locator('.quick-add-input-wrapper textarea').fill('Alpha One');
        await firstColumn.locator('.add-actions .btn-primary').click();

        await firstColumn.locator('.column-quick-add-trigger').click();
        await firstColumn.locator('.quick-add-input-wrapper textarea').fill('Buffer Task');
        await firstColumn.locator('.add-actions .btn-primary').click();

        await firstColumn.locator('.column-quick-add-trigger').click();
        await firstColumn.locator('.quick-add-input-wrapper textarea').fill('Alpha Two');
        await firstColumn.locator('.add-actions .btn-primary').click();

        await page.locator('.workspace-search-input').fill('Alpha');
        await page.waitForTimeout(250);

        await firstColumn
            .locator('.task-card')
            .filter({ hasText: 'Alpha One' })
            .dragTo(firstColumn.locator('.task-card').filter({ hasText: 'Alpha Two' }));

        await page.locator('.workspace-search-clear').click();

        const titles = await firstColumn.locator('.task-card .task-title').allTextContents();
        const alphaOneIndex = titles.indexOf('Alpha One');
        const bufferIndex = titles.indexOf('Buffer Task');
        const alphaTwoIndex = titles.indexOf('Alpha Two');

        expect(alphaOneIndex).toBeGreaterThan(-1);
        expect(bufferIndex).toBeGreaterThan(-1);
        expect(alphaTwoIndex).toBeGreaterThan(-1);
        expect(alphaOneIndex).toBeLessThan(bufferIndex);
        expect(bufferIndex).toBeLessThan(alphaTwoIndex);
    });

    test('should allow cross-column drag while tag filter is active', async ({ page }) => {
        const firstColumn = page.locator('.kanban-column').first();
        const secondColumn = page.locator('.kanban-column').nth(1);

        await firstColumn.locator('.column-quick-add-trigger').click();
        await firstColumn.locator('.quick-add-input-wrapper textarea').fill('Filter Move Task #ops');
        await firstColumn.locator('.add-actions .btn-primary').click();

        await secondColumn.locator('.column-quick-add-trigger').click();
        await secondColumn.locator('.quick-add-input-wrapper textarea').fill('Second Hidden Task #misc');
        await secondColumn.locator('.add-actions .btn-primary').click();

        await secondColumn.locator('.column-quick-add-trigger').click();
        await secondColumn.locator('.quick-add-input-wrapper textarea').fill('Second Visible Task #ops');
        await secondColumn.locator('.add-actions .btn-primary').click();

        await page.locator('.filter-btn').click();
        await page.locator('.filter-item').filter({ hasText: 'ops' }).locator('input').check();
        await page.locator('.filter-btn').click();

        await firstColumn
            .locator('.task-card')
            .filter({ hasText: 'Filter Move Task' })
            .dragTo(secondColumn.locator('.task-card').filter({ hasText: 'Second Visible Task' }));

        await expect(secondColumn.locator('.task-card').filter({ hasText: 'Filter Move Task' })).toBeVisible();

        await page.locator('.filter-btn').click();
        await page.locator('.btn-text-sm', { hasText: 'Clear' }).click();
        await page.locator('.filter-btn').click();

        await expect(secondColumn.locator('.task-card').filter({ hasText: 'Filter Move Task' })).toBeVisible();
        await expect(secondColumn.locator('.task-card').filter({ hasText: 'Second Hidden Task' })).toBeVisible();
        await expect(firstColumn.locator('.task-card').filter({ hasText: 'Filter Move Task' })).toHaveCount(0);
    });
});
