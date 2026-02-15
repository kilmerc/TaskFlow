# TaskFlow Technical Stack Specification

**Version:** 1.4  
**Date:** February 15, 2026

## 1. Architecture

TaskFlow is a no-build, client-side SPA served as static files:

- Entry HTML: `index.html`
- PWA manifest: `manifest.webmanifest`
- Service worker: `service-worker.js`
- CSS: `css/base.css`, `css/layout.css`, `css/components/*.css`
- JS app entry: `js/bootstrap/startApp.js` -> `js/app.js`
- State layer: `js/store.js`
- Components: `js/components/*.js`
- Utilities: `js/utils/*.js`
- Service worker bootstrap: `js/bootstrap/registerServiceWorker.js`

There is no bundler and no server-side runtime.

## 2. Runtime Dependencies (CDN)

- Vue 3.5.28 (`vue.global.js`)
- SortableJS 1.15.7
- Vue.Draggable 4.1.0
- Font Awesome 6.5.1

All external CDN assets are loaded with SRI and `crossorigin="anonymous"`.

## 3. Security Baseline

- Enforced CSP is defined in `index.html` via `Content-Security-Policy` meta.
- Script policy allows only `self` + jsDelivr and includes `'unsafe-eval'` for CDN runtime compiler compatibility.
- Style policy allows `self` + cdnjs and `'unsafe-inline'` to support required dynamic style attributes.
- Service worker + manifest directives are restricted to self (`worker-src 'self'`, `manifest-src 'self'`).
- `object-src 'none'`, `frame-ancestors 'none'`, and `base-uri 'self'` are enforced.

## 4. Bootstrap Flow

1. CDN dependencies load.
2. `js/bootstrap/dependencyCheck.js` validates globals (`Vue`, `Sortable`, `vuedraggable`).
3. `js/bootstrap/startApp.js` dynamically imports `js/app.js` only when dependencies are present.
4. `js/bootstrap/registerServiceWorker.js` registers `./service-worker.js` on window `load`.

If dependencies fail, the app renders a non-inline styled error banner.

## 5. PWA Runtime Model

- Manifest is linked from `index.html` (`./manifest.webmanifest`) with app icons:
  - `img/icons/icon-192.png`
  - `img/icons/icon-512.png`
- Service worker cache names are versioned (`taskflow-precache-v{n}`, `taskflow-runtime-v{n}`).
- Install flow pre-caches:
  - Local app shell/runtime assets (HTML, CSS, JS, icons, manifest)
  - Pinned CDN runtime scripts (Vue, SortableJS, Vue.Draggable)
- Fetch strategy:
  - Navigation requests: network-first, fallback to cached `index.html`
  - Static assets (same-origin + approved CDN origin): cache-first, network fallback, runtime cache fill
- Update behavior:
  - No `skipWaiting`
  - No `clients.claim`
  - New service worker takes control on later navigation/reload lifecycle.

## 6. State and Persistence

- Reactive store: `Vue.reactive` in `js/store.js`.
- Persisted key: `taskflow_data`.
- Persisted payload is produced by `buildPersistedSnapshot()` and includes only domain state:
  - `appVersion`, `theme`, `currentWorkspaceId`
  - `workspaces`, `columns`, `tasks`, `taskTemplates`, `columnTaskOrder`, `activeFilters`, `workspaceViewState`
- Transient UI state is excluded from persistence:
  - `activeTaskId`, `taskModalMode`, `taskModalDraft`, `templateGalleryOpen`, `dialog`, `toasts`, `storageWarning`
- Hydration normalizes legacy and invalid data and targets `appVersion: '1.4'`.

## 7. Testing Stack

- E2E framework: Playwright (`e2e/*.spec.js`)
- PWA coverage: `e2e/pwa.spec.js`
- Unit framework: Browser Mocha/Chai (`tests/index.html`), automated via Playwright unit harness (`e2e/unit-harness.spec.js`, tag `@unit`)

Primary scripts:

- `npm run test:unit`
- `npm run test:e2e`
- `npm run test`
- `npm run test:ci`

## 8. CI Execution Model

GitHub Actions (`.github/workflows/playwright.yml`) runs:

1. `npm ci`
2. `npx playwright install --with-deps chromium`
3. `npm run test:ci`

CI browser scope is Chromium-only for stability. Local runs default to Chromium and can include optional Edge coverage with `PW_EDGE=1`.

Failure artifacts:

- `playwright-report/`
- `test-results/`

## 9. CSS Organization

- `css/base.css`: tokens, global primitives, focus styles, tag tone classes, bootstrap utility classes.
- `css/layout.css`: board/view layouts, responsive behavior, print layout shell.
- `css/components/*.css`: workspace, modal, kanban, filter/dialog/toast and component-level styling.

## 10. Versioning Notes

- Current hydrated schema target is `appVersion: '1.4'`.
- Legacy migration supported:
  - `activeFilter[]` -> `activeFilters.tags[]`
- Snapshot contract changes must update:
  - `buildPersistedSnapshot()` tests in `tests/store.test.js`
  - Import/export compatibility checks in `js/utils/io.js`
- PWA cache versioning:
  - `service-worker.js` owns `PRECACHE_VERSION` and `RUNTIME_VERSION`.
  - Increment both on any release that changes cached local assets, pinned CDN URLs, or service-worker caching strategy.
  - Expected rollout behavior remains "next visit/reload activation" (no forced live-session takeover).
