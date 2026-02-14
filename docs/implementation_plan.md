# Vue 3 Migration Plan With Full Feature Parity (TaskFlow)

## Summary
- Goal: upgrade TaskFlow from Vue 2.7 CDN runtime to Vue 3 while preserving all current behavior, especially drag/drop in Kanban, Calendar, Eisenhower, and Subtasks.
- Chosen defaults: keep no-build CDN architecture, keep Options API, execute in two hardening phases before merge.
- Skills: none used (`skill-creator` and `skill-installer` are not relevant to this migration).

## Locked Decisions
- Keep static no-build architecture (`index.html` + ES modules).
- Keep component authoring in Options API (no Composition API refactor in this migration).
- Use two-phase hardening rollout (migration pass, then parity hardening pass).
- Keep persisted data schema contract unchanged (`appVersion` stays `1.4` unless data shape changes).

## Dependency Targets (validated on February 14, 2026)
- `vue`: target `3.5.28` CDN global build.
- `sortablejs`: target `1.15.7` CDN.
- `vuedraggable`: target Vue 3 line (`vuedraggable@4.1.0`, equivalent to `@next` tag for Vue 3).
- Keep SRI + `crossorigin="anonymous"` on all CDN assets.

## Public Interface / Module Contract Changes
- `js/components/*.js`: convert from side-effect global registration (`Vue.component(...)`) to exported component objects, then register in app bootstrap.
- `js/directives/clickOutside.js`: convert from global `Vue.directive(...)` side-effect to exported directive object/function and register via app instance.
- `js/app.js`: switch from `new Vue(...)` to `Vue.createApp(...)`, including app-scoped `config.errorHandler`.
- Runtime-global dependency contract:
  - `window.__DEPENDENCIES_LOADED__` remains.
  - Add explicit draggable resolution contract in bootstrap (resolve `window.vuedraggable?.default || window.vuedraggable` once, register as `draggable`).

## Implementation Plan

## Phase 0: Baseline + Safety Gate
1. Re-run current CI-equivalent suite as baseline (`npm run test:ci`) and record green state before changes.
2. Keep migration in one feature branch with atomic commits by subsystem (bootstrap, store, components, tests/docs).

## Phase 1: Framework Runtime and Bootstrap Migration
1. Update CDN scripts in `index.html`:
   - Replace Vue 2 script with Vue 3 global build.
   - Replace Vue.Draggable 2.x with Vue.Draggable 4.x (Vue 3 line).
   - Keep SortableJS and Font Awesome, update pinned versions and SRI hashes.
2. Update `js/bootstrap/dependencyCheck.js`:
   - Vue check must validate `window.Vue.createApp`.
   - Draggable check must validate resolved export (`default` fallback).
   - Keep existing user-facing error banner behavior unchanged.
3. Update `js/app.js`:
   - Replace `new Vue({ el: '#app', ... })` with `const app = Vue.createApp({...}); app.mount('#app')`.
   - Move global error handler to `app.config.errorHandler`.
   - Keep app root template in `index.html` unchanged.
4. Add a single component/directive registration module:
   - Create `js/bootstrap/registerGlobals.js` to register all components and directives on the app instance in one place.

## Phase 2: Reactivity + Directive API Migration
1. Update `js/store.js`:
   - `Vue.observable(...)` -> `Vue.reactive(...)`.
   - Replace every `Vue.set(obj, key, value)` with direct assignment `obj[key] = value`.
   - Replace every `Vue.delete(obj, key)` with `delete obj[key]`.
   - Keep exported API unchanged (`store`, `mutations`, `hydrate`, `persist`).
2. Update custom directive in `js/directives/clickOutside.js`:
   - Hook names `bind/unbind` -> `beforeMount/unmounted`.
   - Replace `vnode.context[binding.expression]` pattern with `binding.value` function invocation.
3. Lifecycle hook renames:
   - `beforeDestroy` -> `beforeUnmount` in `js/components/AppToast.js`, `js/components/SearchControls.js`, `js/components/TaskModal.js`.

## Phase 3: Draggable Migration (Feature Parity Critical Path)
1. Register draggable explicitly on app:
   - `app.component('draggable', resolvedDraggableComponent)`.
2. Update all draggable templates to Vue 3 Vue.Draggable API:
   - Replace default child rendering with `#item` slot.
   - Add `item-key` on every draggable usage.
   - Replace legacy slot syntax (`slot="footer"`) with `#footer`.
3. File-by-file drag/drop updates:
   - `js/components/KanbanBoard.js`: columns reorder draggable -> `#item` for column ids, stable key for primitive ids.
   - `js/components/KanbanColumn.js`: task list draggable -> `#item` for task ids, `#footer` spacer retained.
   - `js/components/CalendarView.js`: day-cell task draggable -> `#item` keyed by task id.
   - `js/components/CalendarSidebar.js`: unscheduled task list draggable -> `#item` keyed by task id.
   - `js/components/EisenhowerView.js`: unassigned and quadrant draggables -> `#item` keyed by task id.
   - `js/components/TaskModalSubtasks.js`: subtasks draggable -> function-based stable `item-key` using existing WeakMap identity strategy.
4. Preserve current behavior rules:
   - Cross-column move semantics in filtered Kanban views.
   - Drop-to-whitespace append behavior.
   - Calendar schedule/unschedule drop semantics.
   - Eisenhower assign/unassign priority by drop.
   - Subtask reorder stability (text/done state preserved).

## Phase 4: Component Registration Refactor
1. Convert each component file in `js/components/*.js` from `Vue.component(...)` to exported component object.
2. Register all 18 components in one deterministic order in `registerGlobals.js`.
3. Keep component names and usage in templates unchanged to avoid selector/DOM regression in tests.

## Phase 5: Tests, QA, and Hardening
1. Update unit harness runtime in `tests/index.html` from Vue 2 CDN to Vue 3 CDN.
2. Keep all existing Playwright tests and run full gate:
   - `npm run test:ci`.
3. Add missing parity tests for drag/drop flows not fully covered today:
   - Calendar: drag unscheduled task to date cell, then back to sidebar.
   - Eisenhower: drag unassigned task into quadrant, between quadrants, and back to unassigned.
   - Subtasks: drag-reorder in modal and verify persistence after reopen/reload.
4. Run targeted manual QA checklist items for:
   - Kanban drag/reorder with active search/filter.
   - Calendar drag scheduling.
   - Eisenhower drag priority assignment.
   - Persisted state after reload/import/export.

## Phase 6: Documentation and Release Hygiene
1. Update docs/runtime references from Vue 2 to Vue 3:
   - `README.md`
   - `docs/TaskFlow_TechStack_Spec.md`
   - `docs/TaskFlow_PRD.md` (tech stack section)
2. Keep QA checklist unchanged except version references and any new test file names.
3. Verify CI workflow needs no command changes (still Playwright-based static app).

## Acceptance Criteria
- All existing automated tests pass after migration.
- New drag/drop parity tests pass.
- No regression in:
  - Workspace CRUD
  - Task CRUD and modal editing
  - Tag parsing/filtering/search
  - Calendar and Eisenhower synchronization
  - Import/export
  - Print flow
  - Persistence across reload
- Dependency failure banner still appears when CDN dependencies are missing.
- CSP, SRI, and `crossorigin` remain enforced on CDN assets.

## Assumptions and Defaults
- No data model migration is required for Vue 3 runtime migration alone.
- Browser support scope remains aligned with current test matrix (Chromium primary, Edge optional smoke).
- No design/UI rewrite is in scope.
- Composition API refactor is out of scope for this upgrade.

## Source References
- Vue 3 migration guide (overview, Vue 2 EOL context): https://v3-migration.vuejs.org/
- Vue 3 breaking changes (mount behavior, lifecycle rename): https://v3-migration.vuejs.org/breaking-changes/
- Vue 3 global API changes (`Vue.observable` replacement, `set/delete` compatibility note): https://v3-migration.vuejs.org/breaking-changes/global-api
- Vue 3 custom directives migration: https://v3-migration.vuejs.org/breaking-changes/custom-directives
- Vue 3 CDN no-build usage: https://vuejs.org/guide/quick-start.html#using-vue-from-cdn
- Vue.Draggable Vue 3 migration notes (`item` slot + `itemKey` requirement): https://github.com/SortableJS/vue.draggable.next
