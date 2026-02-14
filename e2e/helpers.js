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

module.exports = {
    gotoWithDependencies
};
