# TaskFlow V2 Detailed Implementation Plan (4 Phases)

## Summary
This plan turns the review findings into an implementation-ready roadmap with explicit feature scope, code touchpoints, step-by-step instructions, and acceptance criteria.  
Default target document path: `docs/TaskFlow_Implementation_Plan_v2.md`.

## Phase Order and Release Gates
1. **Phase 1 (UX + Reliability Foundation)**: Must complete before deeper refactors.
2. **Phase 2 (State + Architecture Cleanup)**: Must complete before large test expansion.
3. **Phase 3 (Quality + Maintainability System)**: Must complete before net-new product features.
4. **Phase 4 (Feature Expansion)**: Implement in order listed, with each feature behind clear acceptance tests.

## Phase 1: UX + Reliability Foundation

### Feature 1.1: Semantic Controls and Keyboard Accessibility
**Goal**: Remove keyboard traps and make all primary interactions operable with keyboard/screen readers.  
**Primary files**: `js/components/WorkspaceSwitcher.js`, `js/components/KanbanBoard.js`, `js/components/KanbanColumn.js`, `index.html`, `css/style.css`.  
**Implementation instructions**:
1. Replace clickable non-button elements used as actions with semantic `<button>` elements.
2. Add accessible names for icon-only controls using `aria-label`.
3. Ensure dropdown triggers expose state via `aria-expanded` and `aria-controls`.
4. Add keyboard handlers for open/close/select on workspace and column menus.
5. Add visible focus states in CSS for all interactive controls.
6. Validate tab order from header to board to modal actions.
**Acceptance criteria**:
1. Every interactive control is reachable and usable via keyboard.
2. No action depends on pointer-only events.
3. Focus ring is consistently visible in both themes.

### Feature 1.2: Replace Native `prompt/confirm/alert` with App Dialog System
**Goal**: Improve UX consistency, accessibility, and testability.  
**Primary files**: `js/components/WorkspaceSwitcher.js`, `js/components/KanbanColumn.js`, `js/components/TaskModal.js`, `js/utils/io.js`, `js/app.js`, new `js/components/AppDialog.js`, new `js/components/AppToast.js`, `js/store.js`.  
**Implementation instructions**:
1. Add global dialog state in store for confirmation and text-input dialogs.
2. Implement reusable dialog component supporting confirm, cancel, destructive confirm, and text input.
3. Route all current destructive confirmations and rename/create prompts through the dialog component.
4. Add toast system for import/export success/failure and non-blocking warnings.
5. Remove all `prompt`, `confirm`, and `alert` calls from app code.
**Acceptance criteria**:
1. No browser-native blocking dialogs remain.
2. All dialog actions are keyboard and screen-reader accessible.
3. E2E tests can reliably interact with modal dialogs and toasts.

### Feature 1.3: Workspace-Scoped Filters
**Goal**: Filter options should only show values relevant to active workspace.  
**Primary files**: `js/components/FilterBar.js`, `js/store.js`, `js/utils/taskFilters.js`.  
**Implementation instructions**:
1. Build tag options from tasks whose columns belong to current workspace only.
2. Preserve active filter values but clear invalid tag filters when workspace changes.
3. Keep priority filters global by value set, but apply matching only on visible workspace tasks.
4. Add deterministic behavior when switching to workspace with no matching tags.
**Acceptance criteria**:
1. Filter menu never shows tags from other workspaces.
2. Existing filter behavior (OR within group, AND across groups) remains unchanged.
3. Switching workspaces cannot produce stale hidden filter state.

### Feature 1.4: Input Normalization and Validation Contracts
**Goal**: Prevent empty/dirty names and inconsistent state.  
**Primary files**: `js/store.js`, `js/components/TaskModal.js`, `js/components/WorkspaceSwitcher.js`, `js/components/KanbanColumn.js`.  
**Implementation instructions**:
1. Centralize string normalization helper for workspace names, column names, and task titles.
2. Enforce trim, non-empty, and max length at mutation boundary.
3. Ensure duplicate column name handling is deterministic per workspace.
4. Surface inline validation errors in UI dialogs/modals.
**Acceptance criteria**:
1. Invalid names are rejected consistently in all create/update flows.
2. No empty or whitespace-only workspace/column/title can be persisted.
3. Validation logic lives in store-level mutation contracts.

### Feature 1.5: User Feedback Consistency for Import/Export/Storage
**Goal**: Improve reliability visibility and user trust.  
**Primary files**: `js/utils/io.js`, `js/store.js`, `index.html`.  
**Implementation instructions**:
1. Replace hard-coded inline warning styles with reusable warning component class.
2. Show non-blocking success/error toasts for import/export outcomes.
3. Keep quota warning in store but route display through consistent header notification UI.
4. Add structured error messages for invalid backup schema.
**Acceptance criteria**:
1. All import/export outcomes are visible and non-blocking.
2. No `alert` dialogs are used for IO feedback.
3. Storage warnings are visible and styled consistently.

## Phase 2: State + Architecture Cleanup

### Feature 2.1: Single Task Movement Pipeline
**Goal**: Eliminate split responsibility for drag/move behavior.  
**Primary files**: `js/store.js`, `js/components/KanbanColumn.js`, `js/components/CalendarView.js`, `js/components/CalendarSidebar.js`, `js/components/EisenhowerView.js`.  
**Implementation instructions**:
1. Define one canonical store mutation path for any task location change.
2. Remove direct task column mutation from component watchers.
3. Ensure cross-column reorder and intra-column reorder both update order and ownership atomically.
4. Add guardrails for invalid source/target columns.
**Acceptance criteria**:
1. All UI movement paths call centralized mutation logic.
2. Column order and task `columnId` never diverge.
3. Reload after drag preserves exact order and location.

### Feature 2.2: Persisted Snapshot Serializer and Migration Boundary
**Goal**: Persist domain state only; exclude transient UI state.  
**Primary files**: `js/store.js`, `js/utils/io.js`, `tests/store.test.js`.  
**Implementation instructions**:
1. Add explicit `buildPersistedSnapshot()` function.
2. Persist only domain fields (`theme`, workspace/column/task data, filters as needed).
3. Exclude modal and UI-only flags (`activeTaskId`, modal draft/mode, warnings unless intentionally persisted).
4. Keep hydrate migration for legacy `activeFilter`.
5. Add schema version bump and migration tests.
**Acceptance criteria**:
1. Persisted payload is stable and minimal.
2. Reload never restores stale modal/open-state UI.
3. Existing user backups remain import-compatible.

### Feature 2.3: Shared UI Utilities and Directive Extraction
**Goal**: Remove repeated logic and reduce bug surface.  
**Primary files**: new `js/directives/clickOutside.js`, new `js/utils/tagStyle.js`, `js/components/*`.  
**Implementation instructions**:
1. Extract `v-click-outside` into one global directive registration.
2. Extract tag color generation into one utility function.
3. Replace component-local duplicates with shared imports/registration.
4. Add small unit tests for helper determinism.
**Acceptance criteria**:
1. No duplicated click-outside directive definitions remain.
2. Tag visual style is consistent across all components.
3. Utility behavior is test-covered.

### Feature 2.4: Decompose Large Components
**Goal**: Improve readability and maintainability.  
**Primary files**: `js/components/TaskModal.js`, `js/components/KanbanColumn.js`, new subcomponents in `js/components/`.  
**Implementation instructions**:
1. Split `TaskModal.js` into focused subcomponents (column selector, tag combobox, subtasks editor, footer actions).
2. Split `KanbanColumn.js` into header/actions, task list, and quick-add module.
3. Keep state ownership clear: store mutations remain centralized.
4. Preserve current UI behavior exactly during refactor.
**Acceptance criteria**:
1. No behavior regression in modal and column interactions.
2. Each new component has single responsibility.
3. E2E tests from Phase 1 still pass unchanged.

### Feature 2.5: Remove Placeholder/Dead Artifacts
**Goal**: Reduce confusion and drift.  
**Primary files**: `js/components/ThemeToggle.js`, `js/app.js`, docs files.  
**Implementation instructions**:
1. Remove placeholder component if unused or implement actual reusable theme toggle component and use it.
2. Remove stale “placeholder” comments in active imports.
3. Ensure docs reflect actual component map.
**Acceptance criteria**:
1. No placeholder/dead component remains in runtime path.
2. Import list and docs accurately match real architecture.

## Phase 3: Quality + Maintainability System

### Feature 3.1: Standardized npm Scripts and Local Developer Flow
**Goal**: Make quality checks deterministic.  
**Primary files**: `package.json`, `README.md`.  
**Implementation instructions**:
1. Add scripts: `serve`, `test:e2e`, `test:unit`, `test`, `test:ci`.
2. Ensure `test` runs unit + e2e in a stable order.
3. Update README with exact run commands.
**Acceptance criteria**:
1. New contributor can run all checks via documented scripts.
2. CI uses same scripts as local.

### Feature 3.2: CI Browser Matrix Stabilization
**Goal**: Remove CI flake risk from channel mismatch.  
**Primary files**: `playwright.config.js`, `.github/workflows/playwright.yml`.  
**Implementation instructions**:
1. Split local vs CI browser projects (Chromium baseline on CI).
2. Keep optional Edge project for local smoke or dedicated Windows CI job.
3. Add artifact retention for traces/videos on failure.
**Acceptance criteria**:
1. CI passes consistently on PRs without browser-channel failures.
2. Failed runs provide actionable artifacts.

### Feature 3.3: Test Coverage Expansion
**Goal**: Cover high-risk behavior not currently tested.  
**Primary files**: `e2e/*.spec.js`, `tests/store.test.js`, `tests/utils/*.test.js`.  
**Implementation instructions**:
1. Add E2E tests for keyboard interaction, drag persistence, import/export, print flow, dialog system.
2. Add store tests for snapshot serialization boundaries and movement invariants.
3. Add utility tests for tag style, validation helpers, parser/autocomplete boundary rules.
**Acceptance criteria**:
1. Critical flows from Phases 1 and 2 are covered by automated tests.
2. Regressions in movement/persistence/filter scoping are caught in CI.

### Feature 3.4: CSS Architecture Refactor
**Goal**: Make styling scalable and easier to modify.  
**Primary files**: split `css/style.css` into `css/base.css`, `css/layout.css`, `css/components/*.css`, update `index.html` links.  
**Implementation instructions**:
1. Extract tokens and resets first, then layout, then component blocks.
2. Remove inline styles from templates into CSS classes.
3. Preserve cascade and theme tokens.
4. Validate responsive behavior after each extraction segment.
**Acceptance criteria**:
1. No inline style attributes remain except unavoidable runtime positioning.
2. Styles are organized by domain with no visual regressions.

### Feature 3.5: Documentation Source-of-Truth Alignment
**Goal**: Eliminate product/tech drift.  
**Primary files**: `README.md`, `docs/TaskFlow_PRD.md`, `docs/TaskFlow_TechStack_Spec.md`, `docs/TaskFlow_QA_Checklist.md`.  
**Implementation instructions**:
1. Align framework/runtime statements to Vue 2.7 current architecture.
2. Update QA checklist to include new accessibility and dialog behaviors.
3. Add migration notes for persisted schema version changes.
**Acceptance criteria**:
1. Docs describe the running code accurately.
2. QA checklist maps directly to automated test scenarios.

## Phase 4: Feature Expansion

### Feature 4.1: Global Workspace Search
**Goal**: Fast title/description/tag search in current workspace.  
**Primary files**: `js/store.js`, `js/components/FilterBar.js` or new `js/components/SearchBar.js`, `js/utils/taskFilters.js`.  
**Implementation instructions**:
1. Add search query state scoped to current view/workspace.
2. Extend filter predicate to include query matching across title, description, and tags.
3. Debounce input for performance and maintain instant clear/reset.
**Acceptance criteria**:
1. Search updates all views consistently.
2. Search combines correctly with existing tag/priority filters.

### Feature 4.2: Sort and Group Controls
**Goal**: Improve task triage speed.  
**Primary files**: `js/store.js`, `js/components/KanbanColumn.js`, `js/components/CalendarView.js`.  
**Implementation instructions**:
1. Add sort mode options (manual, due date, priority, created date).
2. Keep manual order as default and preservable.
3. Add deterministic tie-breaker rules.
**Acceptance criteria**:
1. Sort mode changes are predictable and reversible.
2. Manual order is not lost when toggling sort modes.

### Feature 4.3: Bulk Selection and Bulk Actions
**Goal**: Reduce repetitive task management actions.  
**Primary files**: `js/store.js`, `js/components/TaskCard.js`, `js/components/KanbanColumn.js`, `js/components/TaskModal.js`.  
**Implementation instructions**:
1. Add multi-select mode with task checkmarks distinct from completion checkboxes.
2. Implement bulk actions: move column, set priority, set due date, delete.
3. Add clear selection and safety confirmation for destructive bulk delete.
**Acceptance criteria**:
1. Bulk actions apply atomically and persist correctly.
2. Selection state resets safely on workspace change.

### Feature 4.4: Undo for Destructive Actions
**Goal**: Recover from accidental deletes/resets.  
**Primary files**: `js/store.js`, new `js/utils/history.js`, `js/components/AppToast.js`.  
**Implementation instructions**:
1. Capture reversible snapshots for delete task, delete column, delete workspace, and full reset.
2. Present timed undo toast after destructive action.
3. Ensure undo restores both entities and ordering.
**Acceptance criteria**:
1. User can undo each supported destructive action within time window.
2. Undo never corrupts `columnTaskOrder` integrity.

### Feature 4.5: Recurring Tasks
**Goal**: Add practical scheduling automation.  
**Primary files**: `js/store.js`, `js/components/TaskModal.js`, `js/components/CalendarView.js`, docs/tests.  
**Implementation instructions**:
1. Extend task schema with `recurrence` object (`none|daily|weekly|monthly`, interval, end condition).
2. On completion of recurring task, generate next occurrence according to rule.
3. Preserve original recurrence metadata and prevent duplicate generation.
**Acceptance criteria**:
1. Recurring task completion reliably creates next task.
2. Calendar and Kanban reflect new occurrences immediately.

### Feature 4.6: Archive and Completed History
**Goal**: Keep active boards clean while preserving records.  
**Primary files**: `js/store.js`, `js/components/KanbanColumn.js`, new `js/components/ArchiveView.js`.  
**Implementation instructions**:
1. Add archive action and archived timestamp.
2. Exclude archived tasks from active boards by default.
3. Add archive view with restore and permanent delete actions.
**Acceptance criteria**:
1. Archived tasks are hidden from active workflows but retrievable.
2. Restore and delete operations preserve data integrity rules.

## Public APIs / Interface / Type Changes
1. Add `buildPersistedSnapshot()` and optional `migrateSnapshot(versionedData)` in `js/store.js`.
2. Standardize task movement interface to one mutation contract for all move operations.
3. Add global `dialog` and `toast` state contracts in store.
4. Add workspace-scoped filter option resolver interface.
5. Add optional Phase 4 schema fields: `searchQuery`, `bulkSelection`, `undoStack`, `task.recurrence`, `task.archivedAt`.

## Test Cases and Scenarios (Required)
1. Keyboard-only task creation, modal editing, dropdown operations, and destructive confirmations.
2. Cross-column drag and reorder persistence after reload.
3. Workspace switch with filters and search active.
4. Import valid/invalid backup and verify UX messaging plus state integrity.
5. Print list flow with cleanup validation.
6. CI run stability under configured browser matrix.
7. Snapshot migration tests across old and new schema versions.
8. Recurring task generation and archive/restore integrity tests (Phase 4).

## Assumptions and Defaults
1. The app remains Vue 2.7, no-build, CDN-loaded in this roadmap.
2. Backward compatibility for existing `taskflow_data` is mandatory.
3. Desktop-first remains default, with keyboard accessibility elevated to required quality bar.
4. Playwright remains primary E2E framework; current browser-based unit tests remain unless explicitly replaced later.
5. Security hardening (SRI/CSP baseline) is included in Phase 3 and treated as mandatory before Phase 4 rollout.
