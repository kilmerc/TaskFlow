// @ts-check
const { test, expect } = require('@playwright/test');
const { gotoWithDependencies } = require('./helpers');

async function addTaskToFirstColumn(page, title) {
    const firstColumn = page.locator('.kanban-column').first();
    await firstColumn.locator('.column-quick-add-trigger').click();
    await firstColumn.locator('.quick-add-input-wrapper textarea').fill(title);
    await firstColumn.locator('.add-actions .btn-primary').click();
    await expect(page.locator('.task-card').filter({ hasText: title })).toBeVisible();
}

async function openTaskModalFromKanban(page, title) {
    await page.locator('button[title="Kanban Board"]').click();
    await page.locator('.task-card').filter({ hasText: title }).locator('.task-open-btn').click();
    await expect(page.locator('.modal-content')).toBeVisible();
}

async function readSubtaskSnapshot(page) {
    return page.locator('.subtask-item').evaluateAll(items => items.map(item => {
        const input = /** @type {HTMLInputElement | null} */ (item.querySelector('.subtask-input'));
        const checkbox = /** @type {HTMLInputElement | null} */ (item.querySelector('.subtask-checkbox'));
        return {
            text: input ? input.value : '',
            done: checkbox ? checkbox.checked : false
        };
    }));
}

test.describe('Drag Parity Coverage', () => {
    test.beforeEach(async ({ page }) => {
        await gotoWithDependencies(page, '/');
        await page.evaluate(() => {
            window.localStorage.clear();
        });
        await page.reload();
    });

    test('should round-trip schedule and unschedule in calendar via drag and drop', async ({ page }) => {
        const taskTitle = 'Calendar Roundtrip Task';
        await addTaskToFirstColumn(page, taskTitle);

        await page.locator('button[title="Calendar View"]').click();
        await expect(page.locator('.calendar-layout')).toBeVisible();

        const sidebarTask = page.locator('.calendar-sidebar .task-card').filter({ hasText: taskTitle });
        const todayCellList = page.locator('.cal-cell.today .cal-task-list').first();
        await expect(sidebarTask).toBeVisible();

        await sidebarTask.dragTo(todayCellList);
        await expect(page.locator('.cal-cell.today .cal-task-pill').filter({ hasText: taskTitle })).toBeVisible();
        await expect(page.locator('.calendar-sidebar .task-card').filter({ hasText: taskTitle })).toHaveCount(0);

        const todayTask = page.locator('.cal-cell.today .cal-task-pill').filter({ hasText: taskTitle });
        const sidebarList = page.locator('.calendar-sidebar .sidebar-list');
        await todayTask.dragTo(sidebarList);

        await expect(page.locator('.calendar-sidebar .task-card').filter({ hasText: taskTitle })).toBeVisible();
        await expect(page.locator('.cal-cell.today .cal-task-pill').filter({ hasText: taskTitle })).toHaveCount(0);
    });

    test('should round-trip priority assignment in eisenhower via drag and drop', async ({ page }) => {
        const taskTitle = 'Eisenhower Roundtrip Task';
        await addTaskToFirstColumn(page, taskTitle);

        await page.locator('button[title="Eisenhower Matrix View"]').click();
        await expect(page.locator('.eisenhower-layout')).toBeVisible();

        const unassignedTask = page.locator('.eisenhower-sidebar .matrix-task-card').filter({ hasText: taskTitle });
        const q1List = page.locator('.eisenhower-quadrant.q1 .eisenhower-list');
        const q3List = page.locator('.eisenhower-quadrant.q3 .eisenhower-list');
        const unassignedList = page.locator('.eisenhower-sidebar .eisenhower-list');

        await expect(unassignedTask).toBeVisible();
        await unassignedTask.dragTo(q1List);
        await expect(page.locator('.eisenhower-quadrant.q1 .matrix-task-card').filter({ hasText: taskTitle })).toBeVisible();
        await expect(page.locator('.eisenhower-sidebar .matrix-task-card').filter({ hasText: taskTitle })).toHaveCount(0);

        const q1Task = page.locator('.eisenhower-quadrant.q1 .matrix-task-card').filter({ hasText: taskTitle });
        await q1Task.dragTo(q3List);
        await expect(page.locator('.eisenhower-quadrant.q3 .matrix-task-card').filter({ hasText: taskTitle })).toBeVisible();

        const q3Task = page.locator('.eisenhower-quadrant.q3 .matrix-task-card').filter({ hasText: taskTitle });
        await q3Task.dragTo(unassignedList);
        await expect(page.locator('.eisenhower-sidebar .matrix-task-card').filter({ hasText: taskTitle })).toBeVisible();
        await expect(page.locator('.eisenhower-quadrant.q3 .matrix-task-card').filter({ hasText: taskTitle })).toHaveCount(0);
    });

    test('should persist subtask reorder across close, reopen, and reload', async ({ page }) => {
        const taskTitle = 'Subtask Reorder Persistence Task';
        await addTaskToFirstColumn(page, taskTitle);
        await openTaskModalFromKanban(page, taskTitle);

        const subtaskInput = page.locator('.modal-content .add-subtask input');
        await subtaskInput.fill('First');
        await subtaskInput.press('Enter');
        await subtaskInput.fill('Second');
        await subtaskInput.press('Enter');
        await subtaskInput.fill('Third');
        await subtaskInput.press('Enter');

        await page.locator('.subtask-item').nth(1).locator('.subtask-checkbox').check();

        const firstHandle = page.locator('.subtask-item').first().locator('.subtask-drag-handle');
        const lastHandle = page.locator('.subtask-item').last().locator('.subtask-drag-handle');
        await firstHandle.dragTo(lastHandle);

        const expectedSnapshot = await readSubtaskSnapshot(page);
        await page.locator('.modal-footer .btn-primary', { hasText: 'OK' }).click();
        await expect(page.locator('.modal-content')).toHaveCount(0);

        await openTaskModalFromKanban(page, taskTitle);
        await expect(await readSubtaskSnapshot(page)).toEqual(expectedSnapshot);
        await page.locator('.modal-footer .btn-primary', { hasText: 'OK' }).click();
        await expect(page.locator('.modal-content')).toHaveCount(0);

        await page.reload();
        await page.waitForFunction(() => window.__DEPENDENCIES_LOADED__ === true);

        await openTaskModalFromKanban(page, taskTitle);
        await expect(await readSubtaskSnapshot(page)).toEqual(expectedSnapshot);
    });
});
