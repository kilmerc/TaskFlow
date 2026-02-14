// @ts-check
const { test, expect } = require('@playwright/test');
const { gotoWithDependencies } = require('./helpers');

test.describe('Task Templates', () => {
    test.beforeEach(async ({ page }) => {
        await page.addInitScript(() => {
            window.localStorage.clear();
        });
        await gotoWithDependencies(page, '/');
    });

    async function createTemplateFromFirstTask(page, templateName) {
        const firstColumn = page.locator('.kanban-column').first();
        await firstColumn.locator('.column-quick-add-trigger').click();
        await firstColumn.locator('.quick-add-input-wrapper textarea').fill('Template Source #ops');
        await firstColumn.locator('.quick-add-input-wrapper .add-actions .btn-primary').click();

        await page.locator('.task-card').filter({ hasText: 'Template Source' }).first().locator('.task-open-btn').click();
        await page.locator('.modal-content textarea').first().fill('Template description');
        await page.locator('.modal-content select').first().selectOption('II');
        await page.locator('.modal-content .color-dot[title="Set color to blue"]').click();
        await page.locator('.modal-content .add-subtask input').fill('Checklist step');
        await page.locator('.modal-content .add-subtask input').press('Enter');

        await page.locator('.modal-task-actions .column-menu-trigger').click();
        const saveTemplateItem = page.locator('.modal-task-actions .menu-item', { hasText: 'Save as template' });
        await expect(saveTemplateItem).toBeVisible();
        await saveTemplateItem.click();
        await expect(page.locator('.app-dialog-panel')).toBeVisible();
        const dialogInput = page.locator('.app-dialog-input');
        await expect(dialogInput).toBeFocused();
        await dialogInput.fill(templateName);
        await expect(dialogInput).toHaveValue(templateName);
        await page.locator('.app-dialog-panel .btn-primary').click();
        await page.locator('.close-btn').first().click();
    }

    test('should select template with slash quick-add and create task with copied properties', async ({ page }) => {
        await createTemplateFromFirstTask(page, 'Daily Ops');

        const firstColumn = page.locator('.kanban-column').first();
        await firstColumn.locator('.column-quick-add-trigger').click();
        const quickInput = firstColumn.locator('.quick-add-input-wrapper textarea');
        await quickInput.fill('/');

        await expect(firstColumn.locator('.quick-add-tag-menu .quick-add-tag-item').first()).toContainText('/daily-ops');
        await quickInput.press('Enter');

        const caretIndex = await quickInput.evaluate(el => el.selectionStart);
        expect(caretIndex).toBe('/daily-ops '.length);

        await quickInput.type('Run checklist #extra');
        await firstColumn.locator('.quick-add-input-wrapper .add-actions .btn-primary').click();

        const createdCard = firstColumn.locator('.task-card').filter({ hasText: 'Run checklist' }).first();
        await expect(createdCard).toBeVisible();
        await createdCard.locator('.task-open-btn').click();
        await expect(page.locator('.modal-content textarea').first()).toHaveValue('Template description');
        await expect(page.locator('.modal-content select').first()).toHaveValue('II');
        await expect(page.locator('.modal-content input[type="date"]')).toHaveValue('');
        await expect(page.locator('.modal-content .tag-chip', { hasText: 'ops' })).toBeVisible();
        await expect(page.locator('.modal-content .tag-chip', { hasText: 'extra' })).toBeVisible();
        await expect(page.locator('.modal-content .subtask-input').first()).toHaveValue('Checklist step');
        await expect(page.locator('.modal-content .subtask-checkbox').first()).not.toBeChecked();
    });

    test('should block create when slash token does not match an existing template', async ({ page }) => {
        const firstColumn = page.locator('.kanban-column').first();
        await firstColumn.locator('.column-quick-add-trigger').click();

        const quickInput = firstColumn.locator('.quick-add-input-wrapper textarea');
        await quickInput.fill('/unknown-template Task title');
        await quickInput.press('Enter');

        await expect(firstColumn.locator('.quick-add-input-wrapper .form-error')).toContainText('Select an existing template.');
        await expect(firstColumn.locator('.task-card', { hasText: 'Task title' })).toHaveCount(0);
    });

    test('should edit and delete templates in template gallery without native dialogs', async ({ page }) => {
        let nativeDialogCount = 0;
        page.on('dialog', async dialog => {
            nativeDialogCount += 1;
            await dialog.dismiss();
        });

        await createTemplateFromFirstTask(page, 'Daily Ops');

        await page.locator('button[title="Template Gallery"]').click();
        await expect(page.locator('.template-gallery-modal')).toBeVisible();

        await page.locator('.template-gallery-item', { hasText: 'daily-ops' }).click();
        await page.locator('.template-gallery-editor input[placeholder="Template name"]').fill('daily-ops-updated');
        await page.locator('.template-gallery-footer .btn-primary', { hasText: 'Save Changes' }).click();

        await page.locator('.close-btn[title="Close Template Gallery"]').click();

        const firstColumn = page.locator('.kanban-column').first();
        await firstColumn.locator('.column-quick-add-trigger').click();
        const quickInput = firstColumn.locator('.quick-add-input-wrapper textarea');
        await quickInput.fill('/daily');
        await expect(firstColumn.locator('.quick-add-tag-menu .quick-add-tag-item').first()).toContainText('/daily-ops-updated');

        await page.locator('button[title="Template Gallery"]').click();
        await page.locator('.template-gallery-item', { hasText: 'daily-ops-updated' }).click();
        await page.locator('.template-gallery-footer .btn-danger', { hasText: 'Delete Template' }).click();
        await expect(page.locator('.app-dialog-panel')).toBeVisible();
        await page.locator('.app-dialog-panel .btn-danger').click();

        await page.locator('.close-btn[title="Close Template Gallery"]').click();
        await quickInput.fill('/');
        await expect(firstColumn.locator('.quick-add-tag-menu')).toHaveCount(0);
        expect(nativeDialogCount).toBe(0);
    });

    test('should open save-as-template from modal menu via keyboard', async ({ page }) => {
        const firstColumn = page.locator('.kanban-column').first();
        await firstColumn.locator('.column-quick-add-trigger').click();
        await firstColumn.locator('.quick-add-input-wrapper textarea').fill('Keyboard Menu Source');
        await firstColumn.locator('.quick-add-input-wrapper .add-actions .btn-primary').click();

        await page.locator('.task-card').filter({ hasText: 'Keyboard Menu Source' }).first().locator('.task-open-btn').click();
        const trigger = page.locator('.modal-task-actions .column-menu-trigger');
        await trigger.focus();
        await trigger.press('ArrowDown');
        await page.keyboard.press('Enter');

        await expect(page.locator('.app-dialog-panel')).toBeVisible();
        await expect(page.locator('.app-dialog-title')).toContainText('Save as template');
        await page.locator('.app-dialog-panel .btn-text').click();
    });
});
