// @ts-check
async function gotoWithDependencies(page, path = '/', maxAttempts = 3) {
    let loaded = false;

    for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
        await page.goto(path);
        loaded = await page.evaluate(() => window.__DEPENDENCIES_LOADED__ === true);
        if (loaded) {
            return;
        }
    }

    throw new Error(`Dependencies failed to load after ${maxAttempts} attempts.`);
}

async function waitForServiceWorkerReady(page, timeout = 15000) {
    await page.evaluate(async timeoutMs => {
        if (!('serviceWorker' in navigator)) {
            throw new Error('Service workers are not supported in this browser context.');
        }

        const timeoutPromise = new Promise((_, reject) => {
            setTimeout(() => reject(new Error('Timed out waiting for service worker readiness.')), timeoutMs);
        });

        await Promise.race([navigator.serviceWorker.ready, timeoutPromise]);
    }, timeout);
}

async function ensureServiceWorkerControlled(page, maxReloads = 3) {
    for (let attempt = 0; attempt <= maxReloads; attempt += 1) {
        const state = await page.evaluate(() => {
            return {
                controlled: !!(navigator.serviceWorker && navigator.serviceWorker.controller),
                dependenciesLoaded: window.__DEPENDENCIES_LOADED__ === true
            };
        });

        if (state.controlled && state.dependenciesLoaded) {
            return;
        }

        if (attempt === maxReloads) {
            break;
        }

        await page.reload();
        await waitForServiceWorkerReady(page);

        try {
            await page.waitForFunction(() => window.__DEPENDENCIES_LOADED__ === true, { timeout: 5000 });
        } catch (error) {
            // Keep retrying until control + dependency checks both pass or attempts are exhausted.
        }
    }

    throw new Error(`Service worker did not control the page after ${maxReloads} reload attempts.`);
}

module.exports = {
    gotoWithDependencies,
    waitForServiceWorkerReady,
    ensureServiceWorkerControlled
};
