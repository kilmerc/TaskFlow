# TaskFlow Implementation Plan

## Document Control
- Plan version: 1.0
- Date: 2026-02-12
- Source docs: `docs/TaskFlow_PRD.md`, `docs/TaskFlow_TechStack_Spec.md`
- Platform: Static web app (GitHub Pages), localStorage persistence

## Implementation Baseline
To avoid ambiguity for implementation, this plan uses the stack defined in `docs/TaskFlow_TechStack_Spec.md`:
- Vue 2.7 via CDN
- SortableJS + `vuedraggable@2`
- Font Awesome via CDN
- No build system

Note: `docs/TaskFlow_PRD.md` mentions Vue 3, but this plan follows the technical spec as the execution source of truth.

## Delivery Principles
- Keep all state writes inside store mutation functions.
- Persist to localStorage after every mutation (debounced 300ms).
- Keep file structure modular (`css/`, `js/`, `js/components/`, `js/utils/`) even without a build step.
- Ship each phase behind a working UI state so the app is usable after every phase.

---

## [x] Phase 0: Foundation and Scaffolding

### Feature 0.1: Project skeleton and dependency bootstrapping
**Goal:** Create a runnable zero-build SPA shell with deterministic load order and failure handling.

**Implementation steps:**
1. Create files/folders:
   - `index.html`
   - `css/style.css`
   - `js/app.js`, `js/store.js`
   - `js/components/` (empty placeholders)
   - `js/utils/id.js`, `js/utils/tagParser.js`, `js/utils/io.js`, `js/utils/print.js`
2. In `index.html`, add CDN assets in this order:
   - Font Awesome CSS
   - Vue 2.7 script
   - SortableJS script
   - Vue.Draggable script
   - Local scripts (`store.js`, utils, components, `app.js`)
3. Add root mount element: `<div id="app"></div>`.
4. Add dependency guard script:
   - If `window.Vue` or `window.vuedraggable` is missing, render a visible error banner in `#app` and skip bootstrapping.
5. Initialize `new Vue({ el: '#app', ... })` with a minimal template showing app header and placeholder body.

**Acceptance criteria:**
- Opening `index.html` in a browser renders the app shell with no console errors.
- If Vue CDN is intentionally broken, a user-friendly load error is displayed.

---

### Feature 0.2: Theme token system and base layout
**Goal:** Implement light/dark theming with CSS variables and shared card/layout tokens.

**Implementation steps:**
1. In `css/style.css`, define `:root` and `[data-theme="dark"]` token blocks:
   - Surface/background/text tokens
   - Border and shadow tokens
   - 8 task color tokens (light pastel + dark muted variants)
2. Add base element styles for:
   - `body`, buttons, inputs, cards, modal surface, tag pills
3. Add main layout wrappers:
   - App header bar
   - Content viewport
   - Horizontal kanban scroll region
4. Implement theme toggle control in header (temporary button in this phase).
5. On toggle, set `document.documentElement.dataset.theme` and persist theme in store.

**Acceptance criteria:**
- Theme toggle switches all key surfaces/text/colors.
- Task color tokens are available as CSS custom properties.
- UI remains readable in both themes.

---

### Feature 0.3: Central store and persistence pipeline
**Goal:** Stand up reactive app state, default seed data, and durable localStorage hydration.

**Implementation steps:**
1. In `js/store.js`, define reactive state using `Vue.observable` with keys:
   - `appVersion`, `theme`, `currentWorkspaceId`, `currentView`, `activeFilter`
   - `workspaces`, `columns`, `tasks`, `columnTaskOrder`
2. Implement `getDefaultState()` returning one workspace with columns: To Do, In Progress, Done.
3. Implement `hydrateFromLocalStorage()`:
   - Read `taskflow_data`
   - Parse JSON safely with `try/catch`
   - Fallback to defaults on parse or schema failure
4. Implement `persist()` with 300ms debounce.
5. Expose mutation stubs for upcoming phases (`addWorkspace`, `addColumn`, `addTask`, etc.)
6. On app bootstrap, hydrate state, apply theme, and render current workspace.

**Acceptance criteria:**
- Reloading page keeps theme and seeded data.
- Corrupt `taskflow_data` does not crash app; defaults load.

---

## [x] Phase 1: Workspace and Column Management

### Feature 1.1: Workspace CRUD and switching
**Goal:** Let users create, rename, delete, and switch isolated workspaces.

**Implementation steps:**
1. Create `WorkspaceSwitcher` component (`js/components/WorkspaceSwitcher.js`).
2. Render current workspace selector in header with actions:
   - Create workspace (prompt or inline input)
   - Rename current workspace
   - Delete workspace with confirmation
3. Mutation rules:
   - New workspace gets unique id + default columns
   - Delete must also remove its columns/tasks/order maps
   - If deleting current workspace, switch to remaining workspace; block deletion if only 1 exists
4. Ensure switch action updates both kanban and calendar views instantly.
5. Persist after each mutation.

**Acceptance criteria:**
- Workspaces are fully isolated (tasks/columns do not leak).
- Switching workspace updates both views without refresh.
- Deletion flow confirms intent and handles edge cases.

---

### Feature 1.2: Column CRUD
**Goal:** Support adding, renaming, deleting columns with safe behavior when tasks exist.

**Implementation steps:**
1. Create `KanbanBoard` and `KanbanColumn` components.
2. Add column creation control at board level (inline input + Enter).
3. Add per-column menu actions:
   - Rename column title inline or prompt
   - Delete column
4. Deletion rule:
   - If column contains tasks, require explicit confirmation that tasks will be deleted.
   - Remove task ids from `tasks` and `columnTaskOrder`.
5. Keep column id list ordered in `workspace.columns`.

**Acceptance criteria:**
- Columns can be added/renamed/deleted in current workspace.
- Deleting populated column warns user and removes related tasks cleanly.

---

### Feature 1.3: Column reorder drag-and-drop
**Goal:** Enable horizontal drag reorder for columns.

**Implementation steps:**
1. Apply `vuedraggable` to column container list.
2. Bind draggable model directly to `workspace.columns` array.
3. Configure animation/ghost styles and horizontal scroll support.
4. On drag end, persist state.
5. Add regression check: task-to-column mapping remains intact after reorder.

**Acceptance criteria:**
- Columns reorder visually and persist across reloads.
- No task data loss after repeated reorders.

---

## Phase 2: Kanban Task Lifecycle

### Feature 2.1: Quick add task + inline tag parsing
**Goal:** Create tasks quickly from column UI and auto-extract `#tags` from title input.

**Implementation steps:**
1. Build `parseTagsFromTitle(rawTitle)` in `js/utils/tagParser.js`:
   - Extract `#tag` tokens (`[a-zA-Z0-9_-]`)
   - Normalize to lowercase
   - Remove tags from visible title
   - Deduplicate tags
2. Add quick-add input in each column (+ button toggles input).
3. On Enter:
   - Parse title/tags
   - Create task object with defaults:
     - `description: ''`, `subtasks: []`, `dueDate: null`, `color: 'gray'`, `isCompleted: false`
   - Insert into `tasks` and append id to `columnTaskOrder[columnId]`
4. Prevent blank-title creation after tag stripping.

**Acceptance criteria:**
- Typing `Write report #work #urgent` creates title `Write report` with tags `work`, `urgent`.
- Task appears instantly and persists.

---

### Feature 2.2: Task card rendering and computed metadata
**Goal:** Render task cards with title, tags, due date, and subtask progress.

**Implementation steps:**
1. Create `TaskCard` component.
2. Render fields:
   - Title (required)
   - Due date badge (if set)
   - Tag pills
   - Subtask progress (e.g., `1/3`) only when subtasks exist
3. Resolve card color class/style via task color token.
4. Add click handler to open task modal (next phase).
5. Keep visual density compact for multi-task columns.

**Acceptance criteria:**
- Cards show all required metadata accurately.
- Progress text updates when subtask state changes.

---

### Feature 2.3: Task drag-and-drop across columns
**Goal:** Support reorder within column and move between columns.

**Implementation steps:**
1. Wrap each column task list in `vuedraggable` group `tasks`.
2. On drop event:
   - Update source and destination `columnTaskOrder` arrays
   - Update `task.columnId` when crossing columns
3. Persist once at drag end (avoid per-frame writes).
4. Add guard checks:
   - Ignore no-op drops
   - Ensure task id exists before move
5. Apply drag classes for `ghost`, `chosen`, `drag` for clear UX.

**Acceptance criteria:**
- Task reorder in same column persists.
- Task move between columns persists and keeps task metadata untouched.

---

## Phase 3: Task Detail Editing and Filtering

### Feature 3.1: Task details modal
**Goal:** Implement full task editor modal launched from any task card.

**Implementation steps:**
1. Create `TaskModal` component with controlled open/close state.
2. Fields to edit:
   - Title (single-line)
   - Description (textarea)
   - Due date (`input type="date"`)
   - Color selector (8 preset options)
3. Actions:
   - Delete task (confirm)
   - Close modal
4. Mutation rules:
   - Deleting task removes it from `tasks` and all order arrays
   - Edits save immediately through store mutations
5. Add keyboard behavior:
   - `Esc` closes modal
   - Clicking backdrop closes modal (unless mid-confirm flow)

**Acceptance criteria:**
- Every field updates card/calendar data in real time.
- Delete removes task everywhere with no stale references.

---

### Feature 3.2: Subtask checklist management
**Goal:** Add per-task checklist with add/toggle/delete interactions.

**Implementation steps:**
1. In modal, render list of `subtasks[]` objects with `text`, `done`.
2. Add input row for new subtask + Enter to append.
3. Checkbox toggles `done` boolean.
4. Delete button removes one subtask item.
5. Recompute progress label on each mutation.

**Acceptance criteria:**
- Subtasks can be added, toggled, and removed.
- Progress on task card matches modal data exactly.

---

### Feature 3.3: Global tag filter
**Goal:** Filter visible tasks by tag while keeping column shells visible.

**Implementation steps:**
1. Create `FilterBar` component in header.
2. Build available tag set from all tasks in current workspace.
3. Provide controls:
   - Tag select/dropdown
   - Clear filter button
4. Filtering logic:
   - If no filter, show all tasks
   - If tag selected, show only tasks with matching tag
   - Columns with 0 matches remain visible and empty
5. Apply same filtering rule to kanban and calendar task lists where applicable.

**Acceptance criteria:**
- Selecting a tag hides non-matching tasks only.
- Clearing filter restores all tasks.
- Empty columns still render.

---

## Phase 4: Calendar View and Scheduling

### Feature 4.1: Calendar view scaffold (month/week)
**Goal:** Provide calendar UI with navigable date range and task rendering by due date.

**Implementation steps:**
1. Create `CalendarView` component.
2. Implement state for:
   - Active date anchor
   - Mode (`month` or `week`)
3. Generate visible day cells for active mode.
4. For each day cell, render tasks whose `dueDate` matches that date.
5. Add header controls:
   - Prev/next period
   - Today shortcut
   - Month/week toggle

**Acceptance criteria:**
- Switching to calendar shows correct date grid.
- Due-dated tasks appear on the correct day.

---

### Feature 4.2: Unscheduled sidebar and drag-to-schedule
**Goal:** Let users drag unscheduled tasks onto calendar days to set due dates.

**Implementation steps:**
1. Create `CalendarSidebar` component listing tasks with `dueDate == null`.
2. Configure draggable group behavior:
   - Sidebar tasks can be dragged into day cells
3. On drop into day cell:
   - Set `task.dueDate` to target date (`YYYY-MM-DD`)
   - Persist state
4. Ensure card disappears from unscheduled sidebar and appears on target day.
5. Provide non-drag fallback action in task menu: "Schedule for selected day".

**Acceptance criteria:**
- Dragging unscheduled task to day sets due date and updates all views instantly.
- Sidebar and calendar stay in sync after each move.

---

### Feature 4.3: Calendar reschedule and sync guarantees
**Goal:** Support moving scheduled tasks between dates and maintain kanban consistency.

**Implementation steps:**
1. Make day cell task pills draggable between day cells.
2. On reschedule drop, update `dueDate` only (no column changes).
3. Clicking a calendar task opens shared `TaskModal`.
4. Any modal change (title/color/subtasks/date) reflects immediately in kanban and calendar.
5. Add date formatting helper for consistent display.

**Acceptance criteria:**
- Scheduled tasks can move day-to-day.
- Kanban card due-date badge updates immediately after calendar changes.

---

## Phase 5: Data Management, Printing, and Reliability

### Feature 5.1: JSON export/import
**Goal:** Provide backup and restore of complete app state.

**Implementation steps:**
1. In `js/utils/io.js`, implement `exportData(snapshot)`:
   - Create JSON blob
   - Trigger file download: `taskflow-backup-YYYY-MM-DD.json`
2. Implement `importData(fileText)`:
   - Parse JSON safely
   - Validate required structure keys
   - Normalize/clean invalid references
3. Add header menu entries for Export and Import.
4. On successful import:
   - Hydrate store
   - Re-apply theme to DOM
   - Re-render current view
5. On validation failure, show clear error and keep existing data untouched.

**Acceptance criteria:**
- Exported JSON can be re-imported and restores workspaces/columns/tasks/order.
- Invalid file import is rejected safely with message.

---

### Feature 5.2: Column print list
**Goal:** Print a single column as a clean checklist for paper usage.

**Implementation steps:**
1. In each column menu, add action: `Print List`.
2. Build print helper in `js/utils/print.js`:
   - Clone selected column title + visible tasks
   - Render print-only container with checkbox glyphs `[ ]`
3. Add `@media print` rules in `css/style.css`:
   - Hide all non-print elements
   - Force white background / black text
4. Trigger `window.print()` and clean up temporary print DOM after print.

**Acceptance criteria:**
- Printing from a column shows only that column list in black-on-white format.
- Other UI chrome is excluded from print output.

---

### Feature 5.3: Storage guardrails and recovery paths
**Goal:** Prevent silent data loss from storage limits or corruption.

**Implementation steps:**
1. Before persist, estimate serialized size; if >4 MB, show non-blocking warning banner.
2. Maintain last known-good snapshot in memory during session.
3. If persist throws quota error:
   - Show actionable message (export backup, remove old data)
   - Keep app usable without crash
4. On hydrate failure, log reason and fall back to defaults.
5. Add debug utility method to print state integrity checks in console.

**Acceptance criteria:**
- Quota errors do not crash UI.
- User receives clear recovery guidance.

---

## Phase 6: Polish, QA, and Deployment

### Feature 6.1: Responsive behavior and mobile fallbacks
**Goal:** Ensure usable behavior from desktop to mobile with desktop-first interactions.

**Implementation steps:**
1. Add breakpoints:
   - `>=1024px`: full desktop
   - `768-1023px`: horizontally scrollable kanban
   - `<768px`: simplified interactions
2. On mobile (`<768px`): disable complex drag and expose tap-based alternatives (move menu actions).
3. Make modal full-screen on small screens.
4. Verify typography spacing and control hit targets.

**Acceptance criteria:**
- App is fully usable on desktop and functionally usable on mobile.
- No layout overflow or unusable controls at supported widths.

---

### Feature 6.2: Manual QA checklist and regression pass
**Goal:** Produce repeatable verification for each critical user flow.

**Implementation steps:**
1. Create `docs/TaskFlow_QA_Checklist.md` with test cases for:
   - Workspace CRUD
   - Column CRUD/reorder
   - Task create/edit/delete/move
   - Subtasks + filter
   - Calendar schedule/reschedule
   - Export/import
   - Print output
   - Theme persistence
2. Run full checklist in Chrome and one secondary browser (Edge or Firefox).
3. Record defects and fix before release.

**Acceptance criteria:**
- All checklist items pass in at least two browsers.
- No critical bugs in core flows.

---

### Feature 6.3: Production deployment
**Goal:** Publish stable static build to GitHub Pages.

**Implementation steps:**
1. Confirm final file set is static-only (no build commands required).
2. Commit and push to `main`.
3. Configure GitHub Pages to deploy from repository root.
4. Validate deployed URL behavior:
   - App loads dependencies
   - localStorage persistence works
   - import/export and print function in hosted environment
5. Tag release as `v1.0.0` with release notes.

**Acceptance criteria:**
- Public GitHub Pages URL serves fully functional app.
- Post-deploy smoke test passes.

---

## Implementation Order and Dependency Graph
1. Complete Phase 0 before any feature work.
2. Phase 1 and 2 are required before modal/filter/calendar work.
3. Phase 3 depends on task card and store mutation maturity.
4. Phase 4 depends on stable task and due-date model.
5. Phase 5 depends on finalized state shape.
6. Phase 6 is final hardening and release.

## Definition of Done (Project)
- All MVP features from PRD are implemented and validated.
- State persists reliably across reloads.
- Export/import round-trip works.
- Calendar and kanban stay synchronized for all task mutations.
- Print output matches PRD format.
- App is deployed and accessible on GitHub Pages.
