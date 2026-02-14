# TaskFlow Technical Stack Specification

**Version:** 1.2  
**Date:** February 14, 2026

## 1. Architecture

TaskFlow is a no-build, client-side SPA served as static files:

- Entry HTML: `index.html`
- CSS: `css/base.css`, `css/layout.css`, `css/components/*.css`
- JS app entry: `js/bootstrap/startApp.js` -> `js/app.js`
- State layer: `js/store.js`
- Components: `js/components/*.js`
- Utilities: `js/utils/*.js`

There is no bundler and no server-side runtime.

## 2. Runtime Dependencies (CDN)

- Vue 2.7.16 (`vue.js`)
- SortableJS 1.15.2
- Vue.Draggable 2.24.3
- Font Awesome 6.5.1

All external CDN assets are loaded with SRI and `crossorigin="anonymous"`.

## 3. Security Baseline

- Enforced CSP is defined in `index.html` via `Content-Security-Policy` meta.
- Script policy allows only `self` + jsDelivr and includes `'unsafe-eval'` for Vue 2 runtime compiler compatibility.
- Style policy allows `self` + cdnjs and `'unsafe-inline'` to support required dynamic style attributes.
- `object-src 'none'`, `frame-ancestors 'none'`, and `base-uri 'self'` are enforced.

## 4. Bootstrap Flow

1. CDN dependencies load.
2. `js/bootstrap/dependencyCheck.js` validates globals (`Vue`, `Sortable`, `vuedraggable`).
3. `js/bootstrap/startApp.js` dynamically imports `js/app.js` only when dependencies are present.

If dependencies fail, the app renders a non-inline styled error banner.

## 5. State and Persistence

- Reactive store: `Vue.observable` in `js/store.js`.
- Persisted key: `taskflow_data`.
- Persisted payload is produced by `buildPersistedSnapshot()` and includes only domain state:
  - `appVersion`, `theme`, `currentWorkspaceId`
  - `workspaces`, `columns`, `tasks`, `columnTaskOrder`, `activeFilters`
- Transient UI state is excluded from persistence:
  - `activeTaskId`, `taskModalMode`, `taskModalDraft`, `dialog`, `toasts`, `storageWarning`
- Hydration normalizes legacy and invalid data and targets `appVersion: '1.2'`.

## 6. Testing Stack

- E2E framework: Playwright (`e2e/*.spec.js`)
- Unit framework: Browser Mocha/Chai (`tests/index.html`), automated via Playwright unit harness (`e2e/unit-harness.spec.js`, tag `@unit`)

Primary scripts:

- `npm run test:unit`
- `npm run test:e2e`
- `npm run test`
- `npm run test:ci`

## 7. CI Execution Model

GitHub Actions (`.github/workflows/playwright.yml`) runs:

1. `npm ci`
2. `npx playwright install --with-deps chromium`
3. `npm run test:ci`

CI browser scope is Chromium-only for stability. Local runs default to Chromium and can include optional Edge coverage with `PW_EDGE=1`.

Failure artifacts:

- `playwright-report/`
- `test-results/`

## 8. CSS Organization

- `css/base.css`: tokens, global primitives, focus styles, tag tone classes, bootstrap utility classes.
- `css/layout.css`: board/view layouts, responsive behavior, print layout shell.
- `css/components/*.css`: workspace, modal, kanban, filter/dialog/toast and component-level styling.

## 9. Versioning Notes

- Current hydrated schema target is `appVersion: '1.2'`.
- Legacy migration supported:
  - `activeFilter[]` -> `activeFilters.tags[]`
- Snapshot contract changes must update:
  - `buildPersistedSnapshot()` tests in `tests/store.test.js`
  - Import/export compatibility checks in `js/utils/io.js`
