// @ts-check
const { test, expect } = require('@playwright/test');
const {
    gotoWithDependencies,
    waitForServiceWorkerReady,
    ensureServiceWorkerControlled
} = require('./helpers');

test.describe('PWA', () => {
    test.describe.configure({ mode: 'serial' });

    test('should expose a valid web app manifest', async ({ page }) => {
        await gotoWithDependencies(page, '/');

        const manifestData = await page.evaluate(async () => {
            const link = document.querySelector('link[rel="manifest"]');
            if (!link) {
                return null;
            }

            const href = link.getAttribute('href');
            const resolvedUrl = link.href;
            const response = await fetch(resolvedUrl);
            const manifest = await response.json();

            return {
                href,
                ok: response.ok,
                manifest
            };
        });

        expect(manifestData).not.toBeNull();
        expect(manifestData.ok).toBeTruthy();
        expect(manifestData.href).toBe('./manifest.webmanifest');
        expect(manifestData.manifest.name).toBe('TaskFlow');
        expect(manifestData.manifest.short_name).toBe('TaskFlow');
        expect(manifestData.manifest.start_url).toBe('./');
        expect(manifestData.manifest.scope).toBe('./');
        expect(manifestData.manifest.display).toBe('standalone');
        expect(manifestData.manifest.theme_color).toBe('#2563eb');
        expect(manifestData.manifest.background_color).toBe('#f8fafc');

        const iconSizes = manifestData.manifest.icons.map(icon => icon.sizes);
        expect(iconSizes).toContain('192x192');
        expect(iconSizes).toContain('512x512');
    });

    test('should register service worker and control the app on reload', async ({ page }) => {
        await gotoWithDependencies(page, '/');
        await waitForServiceWorkerReady(page);

        const initialController = await page.evaluate(() => {
            return !!(navigator.serviceWorker && navigator.serviceWorker.controller);
        });
        expect(initialController).toBeFalsy();

        const hasRegistration = await page.evaluate(async () => {
            const registration = await navigator.serviceWorker.getRegistration();
            return !!registration;
        });
        expect(hasRegistration).toBeTruthy();

        await page.reload();
        await waitForServiceWorkerReady(page);
        await page.waitForFunction(() => {
            return !!(navigator.serviceWorker && navigator.serviceWorker.controller);
        });

        const controlledAfterReload = await page.evaluate(() => {
            return !!(navigator.serviceWorker && navigator.serviceWorker.controller);
        });
        expect(controlledAfterReload).toBeTruthy();
    });

    test('should load offline after first controlled online load', async ({ page }) => {
        await gotoWithDependencies(page, '/');
        await waitForServiceWorkerReady(page);
        await ensureServiceWorkerControlled(page);

        const firstColumn = page.locator('.kanban-column').first();
        await firstColumn.locator('.column-quick-add-trigger').click();
        await firstColumn.locator('.quick-add-input-wrapper textarea').fill('Offline Cached Task');
        await firstColumn.locator('.add-actions .btn-primary').click();
        await expect(page.locator('.task-card').filter({ hasText: 'Offline Cached Task' })).toBeVisible();

        await expect.poll(async () => {
            return page.evaluate(() => {
                const raw = window.localStorage.getItem('taskflow_data');
                return typeof raw === 'string' && raw.includes('Offline Cached Task');
            });
        }).toBeTruthy();

        await page.context().setOffline(true);
        try {
            await page.evaluate(() => window.location.reload());
            await page.waitForLoadState('domcontentloaded');
            await page.waitForFunction(() => window.__DEPENDENCIES_LOADED__ === true);
            await expect(page.locator('.kanban-board')).toBeVisible();
            await expect.poll(async () => {
                return page.evaluate(() => {
                    const raw = window.localStorage.getItem('taskflow_data');
                    return typeof raw === 'string' && raw.includes('Offline Cached Task');
                });
            }).toBeTruthy();
        } finally {
            await page.context().setOffline(false);
        }
    });
});
