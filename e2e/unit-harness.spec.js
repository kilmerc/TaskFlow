// @ts-check
const { test, expect } = require('@playwright/test');

test.describe('@unit Browser Unit Harness', () => {
    test('should run Mocha browser suites with zero failures', async ({ page }) => {
        await page.goto('/tests');

        await page.waitForFunction(() => {
            return window.__MOCHA_RESULTS__ && typeof window.__MOCHA_RESULTS__.failures === 'number';
        });

        const stats = await page.evaluate(() => window.__MOCHA_RESULTS__);

        expect(stats.failures).toBe(0);
        expect(stats.passes).toBeGreaterThan(0);
    });
});
