# TaskFlow Bug Fixes & Features Plan

## Context
User testing revealed 9 issues: broken click targets, missing sidebar tasks, date display errors, missing UX affordances, and calendar not respecting workspace boundaries. One hidden bug was also discovered (drag permanently disabled on Kanban columns). This plan groups fixes into 3 phases: critical bugs, features, then audit/polish.

---

## Phase 1: Bug Fixes (Status: Complete)

### 1. Quick-add button plus icon not registering clicks
**Files:** `css/style.css` (~line 508)
- Font Awesome replaces `<i>` with `<svg>` at runtime, which can intercept clicks before they bubble to the parent div
- **Fix:** Add `pointer-events: none` to `.quick-add-btn i, .quick-add-btn svg` and `.add-column-btn i, .add-column-btn svg`

### 2. Unscheduled tasks not showing in calendar sidebar
**File:** `js/components/CalendarSidebar.js` (lines 42-47)
- `activeFilter` is always an array (`[]`). `![]` is `false` in JS, so the condition falls to `t.tags.includes([])` which always fails
- **Fix:** Rewrite filter logic to match the working pattern in KanbanColumn.js: check `filters.length === 0` as bypass, then use `t.tags.some(tag => filters.includes(tag))`

### 3. Calendar date off-by-one (tasks appear one day after set date)
**File:** `js/components/TaskCard.js` (lines 51-62)
- `new Date("2026-02-12")` is parsed as UTC midnight per ECMAScript spec. In US timezones, `toLocaleDateString()` then shows "Feb 11" instead of "Feb 12"
- The calendar itself is correct (pure string comparison), but the Kanban card shows the wrong date, making the calendar appear off by one day
- **Fix:** Parse dueDate string manually with `new Date(year, month-1, day)` (local time) in both `formattedDate` and `isOverdue` computed properties

### 4. Column rename should pre-select current name
**File:** `js/components/KanbanColumn.js` (lines 180-182)
- `startRenaming()` calls `focus()` but not `select()`
- **Fix:** Add `this.$refs.renameInput.select()` after `focus()` in the `$nextTick` callback

### 5. Click-outside should save task (not discard)
**File:** `js/components/KanbanColumn.js` (line 62, lines 157-159)
- `v-click-outside="cancelAddingTask"` discards without saving
- **Fix:** Change directive to point to new `finishAddingTask` method that saves if text exists, then closes. Keep `cancelAddingTask` for Escape key and X button (intentional discard)

### 6. Hidden bug: Kanban drag-and-drop permanently disabled
**File:** `js/components/KanbanColumn.js` (line 47)
- `:disabled="!!activeFilter"` - since `!![]` is always `true`, drag is always disabled
- **Fix:** Change to `:disabled="activeFilter && activeFilter.length > 0"`

---

## Phase 2: Features (Status: Complete)

### 7. Calendar workspace scoping
**Files:** `js/components/CalendarView.js` (line 83), `js/components/CalendarSidebar.js` (line 44)
- Both use `Object.values(store.tasks)` unfiltered - shows all tasks from all workspaces
- Tasks link to workspaces via `task.columnId` -> `column.workspaceId`
- **Fix (CalendarView.js):** Add `workspaceColumnIds` computed that returns a Set of column IDs for the current workspace. Filter `tasksByDate` to only include tasks whose `columnId` is in that Set
- **Fix (CalendarSidebar.js):** Same workspace filtering in `unscheduledTasks` computed (combined with the filter bug fix from #2)

### 8. Drag calendar tasks to unscheduled sidebar
**File:** `js/components/CalendarSidebar.js` (line 13)
- Currently `put: false` prevents drops into the sidebar
- **Fix:** Change to `put: true`, add `@change="onSidebarDrop"` handler that calls `mutations.scheduleTask(task.id, null)` to clear the dueDate when a task is dropped from the calendar

### 9. Add OK button to task detail modal
**Files:** `js/components/TaskModal.js` (lines 90-92), `css/style.css` (lines 891-894)
- Footer only has Delete button; users want an explicit close button besides the X
- **Fix:** Add `<button class="btn btn-ok" @click="close">OK</button>` to footer. Update `.modal-footer` CSS to `display: flex; justify-content: space-between` (Delete left, OK right). Add `.btn-ok` styles

---

## Phase 3: Audit & Polish (Status: Complete)

### 10. Import/export schema check
- Export schema in `js/utils/io.js` already includes all persisted fields (appVersion, theme, currentWorkspaceId, workspaces, columns, tasks, columnTaskOrder, activeFilter)
- Transient fields (activeTaskId, storageWarning) are correctly excluded
- **Result:** No changes needed

### 11. Missing tooltips
**Files:** `js/components/FilterBar.js` (line 19), `js/components/KanbanBoard.js` (lines 28, 40, 41)
- Missing `title` attributes on:
  - Clear filters button -> `title="Clear all filters"`
  - Add Column div -> `title="Add a new column"`
  - Confirm Add Column button -> `title="Add Column"`
  - Cancel Add Column button -> `title="Cancel"`

---

## Files Modified (Summary)

| File | Changes |
|------|---------|
| `css/style.css` | pointer-events fix, modal footer flex, OK button styles |
| `js/components/KanbanColumn.js` | drag disabled fix, click-outside save, rename select |
| `js/components/CalendarSidebar.js` | filter fix, workspace scoping, drag-to-unschedule |
| `js/components/CalendarView.js` | workspace scoping filter |
| `js/components/TaskCard.js` | date timezone fix (formattedDate + isOverdue) |
| `js/components/TaskModal.js` | OK button in footer |
| `js/components/FilterBar.js` | tooltip on Clear button |
| `js/components/KanbanBoard.js` | tooltips on Add Column buttons |

## Verification
1. Click plus icon in quick-add -> should open input
2. Type task text, click outside -> task saved; press Escape -> task discarded
3. Drag tasks between Kanban columns (no filters active) -> should work
4. Double-click column title -> text pre-selected in rename input
5. Set due date on task -> Kanban card shows correct date, calendar shows task on correct day
6. Calendar view -> only current workspace tasks shown; sidebar shows only current workspace's unscheduled tasks
7. Drag task from calendar cell to sidebar -> date cleared; drag from sidebar to cell -> date set
8. Task modal -> Delete on left, OK on right; OK closes modal
9. Switch workspaces -> calendar updates to show only that workspace's tasks
10. Hover over Clear filters, Add Column, confirm/cancel -> tooltips appear
