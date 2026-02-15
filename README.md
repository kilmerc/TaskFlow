# TaskFlow

TaskFlow is a lightweight, no-build personal task management app (Kanban, Calendar, Eisenhower) with local-first persistence.

TaskFlow is also installable as a Progressive Web App (PWA) with offline support after the first successful online load.

## Runtime

- Vue 3.5.28 (CDN global build)
- SortableJS 1.15.7 + Vue.Draggable 4.1.0 (CDN)
- Font Awesome (CDN)
- Static HTML/CSS/JS (no bundler)
- PWA manifest + service worker (install + offline cache)

## PWA

- Install:
  - Desktop Chrome/Edge: open TaskFlow, then use browser install action from the address bar/menu.
  - Mobile (Android/iOS): open TaskFlow in the browser and use "Add to Home Screen".
- Offline behavior:
  - After first online load, app shell assets and pinned CDN runtime dependencies are cached.
  - Reloading TaskFlow offline should still open the app and keep localStorage-backed data.
- Update behavior:
  - New service worker versions activate on a later visit/reload lifecycle.
  - Active sessions are not force-refreshed by service worker updates.

### PWA Release Versioning

- Service worker cache versions live in `service-worker.js`:
  - `PRECACHE_VERSION`
  - `RUNTIME_VERSION`
- Bump both versions when releasing any change that affects cached assets or cache strategy:
  - `index.html`, `manifest.webmanifest`, `service-worker.js`
  - files under `css/`, `js/`, or `img/`
  - pinned CDN dependency URLs
- Suggested release checklist:
  1. Increment versions in `service-worker.js`.
  2. Run `npm run test:ci`.
  3. Deploy.
  4. Verify in browser DevTools that a new `taskflow-precache-v*` and `taskflow-runtime-v*` pair is created and older `taskflow-*` caches are removed.
  5. Confirm update semantics: existing open tab keeps current worker; new worker controls on next reload/visit.

## Local Setup

1. Install dependencies:
   ```bash
   npm ci
   ```
2. Install Playwright browser binaries:
   ```bash
   npx playwright install chromium
   ```
3. Start the app locally:
   ```bash
   npm run serve
   ```
4. Open `http://localhost:3000`.

## Test Commands

- Unit harness (browser-Mocha via Playwright):
  ```bash
  npm run test:unit
  ```
  Expected: Playwright reports one `@unit` suite passing and zero failures.

- E2E test suite:
  ```bash
  npm run test:e2e
  ```
  Expected: Playwright runs all non-`@unit` specs in Chromium.

- Optional local Edge smoke run:
  ```bash
  $env:PW_EDGE='1'; npm run test:e2e
  ```
  Expected: Same E2E suite runs in Chromium + Microsoft Edge.

- Full local gate (unit then e2e):
  ```bash
  npm run test
  ```
  Expected: `test:unit` completes first, then `test:e2e`, with no manual steps between.

- CI-equivalent run:
  ```bash
  npm run test:ci
  ```
  Expected: Chromium-only run with line + HTML reporting.

## CI

GitHub Actions uses:

1. `npm ci`
2. `npx playwright install --with-deps chromium`
3. `npm run test:ci`

On failure, CI uploads:

- `playwright-report/`
- `test-results/`

## Data Notes

- Persisted data key: `taskflow_data`
- Snapshot persistence uses `buildPersistedSnapshot()` and excludes transient UI state (`dialog`, `toasts`, active modal state).
- Current hydrated schema target version is `appVersion: '1.4'`.
