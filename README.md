# TaskFlow

TaskFlow is a lightweight, no-build personal task management app (Kanban, Calendar, Eisenhower) with local-first persistence.

## Runtime

- Vue 2.7 (CDN)
- SortableJS + Vue.Draggable (CDN)
- Font Awesome (CDN)
- Static HTML/CSS/JS (no bundler)

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
- Current hydrated schema target version is `appVersion: '1.2'`.
