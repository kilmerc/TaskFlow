# TaskFlow Manual QA Checklist

## Browser Coverage
- [ ] Chrome (primary local)
- [ ] Edge (optional local smoke)
- [ ] Mobile viewport (DevTools, iPhone 12/14)

## 1. Workspace + Dialog System
- [ ] Create workspace from workspace menu.
- [ ] Rename active workspace using app prompt dialog.
- [ ] Delete workspace using app confirm dialog.
- [ ] Verify no native browser `alert/confirm/prompt` appears.

Automated coverage:
- `e2e/dialogs.spec.js`
- `e2e/accessibility.spec.js`
- `e2e/quality.spec.js`

## 2. Kanban + Movement Persistence
- [ ] Add column and add task from quick-add.
- [ ] Move task between columns.
- [ ] Reload and verify moved task stays in destination column.

Automated coverage:
- `e2e/kanban.spec.js`
- `e2e/quality.spec.js`
- `tests/store.test.js` (movement invariants)

## 3. Task Modal + Keyboard Flow
- [ ] Open task modal from keyboard (`Enter` on task open button).
- [ ] Edit title and save.
- [ ] Confirm destructive reset dialog from keyboard.

Automated coverage:
- `e2e/accessibility.spec.js`
- `e2e/quality.spec.js`
- `e2e/drag-parity.spec.js` (subtask reorder persistence)

## 4. Calendar + Eisenhower Views
- [ ] Calendar view shows scheduled tasks.
- [ ] Eisenhower view shows prioritized tasks.
- [ ] View toggles preserve task integrity.

Automated coverage:
- `e2e/views.spec.js`
- `e2e/drag-parity.spec.js` (calendar/eisenhower drag round-trip parity)

## 5. Filtering
- [ ] Apply tag filter and confirm non-matching tasks are hidden.
- [ ] Switch workspace and verify invalid tag filters are cleared.
- [ ] Confirm shared tags remain usable where valid.

Automated coverage:
- `e2e/views.spec.js`
- `tests/store.test.js`

## 6. Import/Export + Toast Feedback
- [ ] Export backup and verify success toast.
- [ ] Import valid backup and verify restoration.
- [ ] Import invalid JSON and verify error toast.

Automated coverage:
- `e2e/dialogs.spec.js`
- `e2e/quality.spec.js`

## 7. Print Flow
- [ ] Trigger `Print List` from column menu.
- [ ] Verify print container appears and is cleaned up.

Automated coverage:
- `e2e/quality.spec.js`

## 8. Persistence + Schema Boundary
- [ ] Inspect `taskflow_data` in `localStorage`.
- [ ] Confirm persisted payload excludes transient UI state (`dialog`, `toasts`, modal transient fields).
- [ ] Verify app hydrates to schema target `appVersion: 1.4`.

Automated coverage:
- `tests/store.test.js`
- `e2e/drag-parity.spec.js` (subtask reorder persistence after reload)

## 9. Security Baseline
- [ ] Verify CDN assets include `integrity` and `crossorigin`.
- [ ] Verify CSP meta is present in `index.html`.
- [ ] Verify app boot still succeeds when dependencies load.

Automated coverage:
- Partially automated by E2E boot checks (`e2e/accessibility.spec.js`)
- Static verification via code review of `index.html`
