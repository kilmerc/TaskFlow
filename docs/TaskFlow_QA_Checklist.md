# TaskFlow Manual QA Checklist

## Browser Coverage
- [ ] **Chrome/Edge** (Primary)
- [ ] **Firefox** (Secondary)
- [ ] **Mobile View** (DevTools Device Mode: iPhone 12/14)

## 1. Workspace Management
- [ ] **Create Workspace**: Add a new workspace named "Test Work" -> Ensure it switches to it.
- [ ] **Switch Workspace**: Switch back to "Personal" -> Ensure view updates.
- [ ] **Rename Workspace**: Rename "Test Work" to "Renamed" -> Verify update in dropdown.
- [ ] **Delete Workspace**: Delete "Renamed" -> Verify switch to remaining workspace.
- [ ] **Isolation**: Create task in Workspace A -> Switch to Workspace B -> Verify task is NOT visible.

## 2. Kanban Board & Columns
- [ ] **Add Column**: Click "+ Add Column", type "QA", press Enter -> Verify column appears.
- [ ] **Rename Column**: Click column menu -> Rename -> Verify title update.
- [ ] **Delete Empty Column**: Delete "QA" -> Verify removal.
- [ ] **Delete Populated Column**: Add task to "QA", try delete -> Verify confirmation alert -> Confirm -> Verify removal.
- [ ] **Reorder Columns**: Drag "To Do" to right of "Done" -> Refresh page -> Verify order persists.

## 3. Task Lifecycle
- [ ] **Quick Add**: Type "Test task #urgent" in column input -> Verify clean title "Test task", tag "urgent".
- [ ] **Move Task (Same Column)**: Reorder tasks vertically -> Refresh -> Verify order.
- [ ] **Move Task (Cross Column)**: Drag from "To Do" to "Done" -> Verify move.
- [ ] **Edit Task (Modal)**: Click task -> Edit title, desc, color -> Close -> Verify card update.
- [ ] **Subtasks**: Add subtask, toggle check -> Verify "1/1" progress on card.
- [ ] **Delete Task**: Delete via modal -> Verify removal.

## 4. Calendar View & Scheduling
- [ ] **View Switch**: Toggle to Calendar -> Verify Month view renders.
- [ ] **Navigation**: Click Next/Prev month -> Verify date updates.
- [ ] **Drag to Schedule**: Drag task from Sidebar to a Day Cell -> Verify task appears on day.
- [ ] **Reschedule**: Drag task from Day A to Day B -> Verify move.
- [ ] **Sync**: Change date in Calendar -> Switch to Kanban -> Verify due date badge.

## 5. Filtering & Search
- [ ] **Filter by Tag**: Select "urgent" in filter bar -> Verify only "urgent" tasks show.
- [ ] **Empty State**: Filter by non-existent tag -> Verify columns empty but visible.
- [ ] **Clear Filter**: Click "Clear" -> Verify all tasks return.

## 6. Data Management
- [ ] **Export**: Click "Export JSON" -> Verify download.
- [ ] **Import**: Click "Import" -> Select valid file -> Verify data restoration.
- [ ] **Theme Persistence**: Toggle Dark Mode -> Refresh -> Verify dark mode stays.

## 7. Responsive & Mobile
- [ ] **Mobile Layout (<768px)**:
    - [ ] Kanban columns scroll horizontally.
    - [ ] Task Modal is full screen.
    - [ ] Workspace switcher text truncates correctly.
- [ ] **Tablet Layout (768-1024px)**:
    - [ ] Kanban board fits or scrolls as needed.
- [ ] **Touch Interactions**:
    - [ ] Buttons are tappable size.
    - [ ] Drag and drop works (or has touch equivalent fallback if implemented).

## 8. Reliability
- [ ] **Console Errors**: Open DevTools -> Use app -> Verify no red errors.
- [ ] **LocalStorage**: Inspect `taskflow_data` key -> Verify updates on change.
