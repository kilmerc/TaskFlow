# TaskFlow — Technical Stack Specification

**Version:** 1.0  
**Date:** February 12, 2026  
**Companion to:** TaskFlow PRD v1.0  

---

## 1. Architecture Overview

TaskFlow is a **zero-build, single-page application (SPA)** delivered as a single `index.html` file with co-located (or inline) CSS and JavaScript. There is no compilation step, no bundler, and no server-side component. The entire application runs client-side in the browser and persists data to `localStorage`.

```
┌─────────────────────────────────────────────────┐
│                   Browser                       │
│                                                 │
│  ┌───────────┐   ┌────────────┐   ┌──────────┐ │
│  │ index.html│──▶│  Vue.js 2  │──▶│  DOM     │ │
│  │ (entry)   │   │  Runtime   │   │  Render  │ │
│  └───────────┘   └─────┬──────┘   └──────────┘ │
│                        │                        │
│         ┌──────────────┼──────────────┐         │
│         ▼              ▼              ▼         │
│  ┌────────────┐ ┌────────────┐ ┌────────────┐  │
│  │ localStorage│ │ SortableJS │ │ FontAwesome│  │
│  │ (data)     │ │ (DnD)      │ │ (icons)    │  │
│  └────────────┘ └────────────┘ └────────────┘  │
└─────────────────────────────────────────────────┘
```

### 1.1 File Structure

```
taskflow/
├── index.html          # Single entry point — markup, templates, app mount
├── css/
│   └── style.css       # All styles, CSS custom properties, theme tokens
├── js/
│   ├── app.js          # Root Vue instance, router-like view switching
│   ├── store.js        # Centralized state management & localStorage I/O
│   ├── components/     # Vue component definitions (registered globally)
│   │   ├── KanbanBoard.js
│   │   ├── KanbanColumn.js
│   │   ├── TaskCard.js
│   │   ├── TaskModal.js
│   │   ├── CalendarView.js
│   │   ├── CalendarSidebar.js
│   │   ├── EisenhowerView.js
│   │   ├── WorkspaceSwitcher.js
│   │   ├── FilterBar.js
│   │   └── ThemeToggle.js
│   └── utils/
│       ├── id.js       # ID generation (nanoid-style or UUID v4 lite)
│       ├── tagParser.js # Inline #tag extraction from task titles
│       ├── taskFilters.js # Shared tag+priority filtering utilities
│       ├── print.js    # Column print-list logic
│       └── io.js       # JSON export / import helpers
└── assets/
    └── favicon.svg     # Optional branding
```

> **Note:** This multi-file layout is for maintainability. If strict single-file delivery is required for GitHub Pages simplicity, all JS and CSS can be inlined into `index.html`. The logical separation above should still be respected via clearly commented sections or `<script>` / `<style>` blocks.

---

## 2. Runtime Dependencies (CDN)

All external libraries are loaded via CDN `<script>` and `<link>` tags in `index.html`. No `npm install` is involved.

| Library | Version | CDN | Purpose |
|---|---|---|---|
| **Vue.js** | 2.7.x (latest 2.x) | `https://cdn.jsdelivr.net/npm/vue@2.7/dist/vue.min.js` | Reactive UI framework |
| **SortableJS** | 1.15.x | `https://cdn.jsdelivr.net/npm/sortablejs@1.15/Sortable.min.js` | Low-level drag-and-drop engine |
| **Vue.Draggable** | 2.24.x | `https://cdn.jsdelivr.net/npm/vuedraggable@2.24/dist/vuedraggable.umd.min.js` | Vue 2 wrapper for SortableJS |
| **Font Awesome** | 6.x (Free) | `https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css` | Icon set (UI chrome, actions) |

### 2.1 CDN Fallback Strategy

For resilience, include a `<script>` block after each CDN load that tests for the expected global (`window.Vue`, `window.Sortable`, etc.) and warns the user with a visible banner if a dependency fails to load.

```html
<script>
  if (!window.Vue) {
    document.getElementById('app').innerHTML =
      '<p style="padding:2rem;color:red;">Failed to load Vue.js. Please check your internet connection and refresh.</p>';
  }
</script>
```

### 2.2 Why Vue 2 (Not Vue 3)

The PRD specifies Vue 2. Key rationale:

- Vue 2.7 backports Composition API, making it a stable terminal release with long-term CDN availability.
- `vuedraggable@2.x` is mature and battle-tested against Vue 2; the Vue 3 equivalent (`vue-draggable-next` / `vuedraggable@4`) has had stability churn.
- Single `<script>` include — no need for ES module import maps that Vue 3's CDN mode sometimes requires.

---

## 3. State Management

### 3.1 Approach: Centralized Plain Object Store

Instead of Vuex (which would add another CDN dependency), state is managed via a **reactive plain object** exposed as a global `store`. Vue 2's `Vue.observable()` (available in 2.6+) makes a plain object reactive.

```js
// store.js
const store = Vue.observable({
  appVersion: '1.1',
  theme: 'dark',
  currentWorkspaceId: null,
  workspaces: [],
  columns: {},
  tasks: {},
  columnTaskOrder: {},
  activeFilters: {
    tags: [],
    priorities: [], // I | II | III | IV
  },
});
```

### 3.2 Mutation Pattern

All writes go through named **mutation functions** defined in `store.js` (e.g., `addTask()`, `moveTask()`, `renameColumn()`). Components never modify `store` properties directly. This keeps the data flow traceable and makes the auto-save hook straightforward.

### 3.3 Persistence Layer

```
Component action
    │
    ▼
store.mutation()
    │
    ├──▶ Updates reactive state (triggers re-render)
    │
    └──▶ Calls persistToLocalStorage()
              │
              ▼
         localStorage.setItem('taskflow_data', JSON.stringify(snapshot))
```

- **Key name:** `taskflow_data`
- **Serialization:** `JSON.stringify` on the entire store snapshot.
- **Deserialization:** On app boot, `JSON.parse(localStorage.getItem('taskflow_data'))` hydrates the store. If the key is missing or corrupt, the app initializes with a default "My Workspace" containing three columns: To Do, In Progress, Done.
- **Debounce:** Persist calls are debounced at **300ms** to avoid excessive writes during rapid drag-and-drop reordering.

### 3.4 Storage Limits & Guardrails

`localStorage` typically offers ~5–10 MB per origin. Mitigation:

- On each save, check `JSON.stringify(snapshot).length`. If it exceeds **4 MB**, show a non-blocking warning banner suggesting the user export a backup and archive old workspaces.
- The export/import flow (Section 7) serves as the overflow valve.

---

## 4. Component Architecture

All components are registered globally via `Vue.component()` so they can be referenced in `index.html` templates without a build step.

```
App (root instance)
├── AppHeader
│   ├── WorkspaceSwitcher        ← dropdown / tab bar
│   ├── ViewToggle               ← Kanban | Calendar | Eisenhower
│   ├── FilterBar                ← tag + priority multi-select
│   ├── ThemeToggle              ← dark/light switch
│   └── SettingsMenu             ← export, import, about
│
├── KanbanBoard                  ← shown when view === 'kanban'
│   └── KanbanColumn (v-for)
│       ├── ColumnHeader         ← title, menu (rename/delete/print)
│       ├── draggable wrapper    ← vuedraggable
│       │   └── TaskCard (v-for)
│       └── QuickAddInput        ← inline task creation
│
├── CalendarView                 ← shown when view === 'calendar'
│   ├── CalendarGrid             ← month/week grid of day cells
│   │   └── CalendarDayCell (v-for)
│   │       └── TaskPill (v-for) ← mini task representation
│   └── CalendarSidebar
│       └── UnscheduledTaskList
│           └── TaskCard (v-for) ← draggable into calendar
│
├── EisenhowerView               ← shown when view === 'eisenhower'
│   ├── UnassignedSidebar        ← tasks with priority = null
│   └── Quadrants
│       ├── I Urgent & Important (Necessity)
│       ├── II Not Urgent & Important (Effective)
│       ├── III Urgent & Not Important (Distraction)
│       └── IV Not Urgent & Not Important (Waste)
│
└── TaskModal                    ← teleported / appended to body
    ├── TitleEditor
    ├── DescriptionEditor
    ├── SubtaskChecklist
    ├── DueDatePicker
    ├── PriorityPicker
    ├── ColorSelector
    └── DeleteButton
```

### 4.1 Component Communication

| Pattern | When Used |
|---|---|
| **Props down** | Parent passes data slices to children (e.g., `column` object to `KanbanColumn`) |
| **Events up** | Children emit actions (e.g., `$emit('task-moved', payload)`) |
| **Store direct** | Components that need cross-cutting data (e.g., `TaskModal`) read from `store` directly via computed properties |
| **Event bus** *(minimal)* | A lightweight `const bus = new Vue()` for rare cross-branch signals (e.g., "open modal for task X" from Calendar → TaskModal). Kept to 2–3 event types max. |

---

## 5. Drag-and-Drop Implementation

### 5.1 Library Chain

```
SortableJS (core engine)
    └── vuedraggable (Vue 2 binding)
```

### 5.2 Drag Contexts

| Context | Source | Target | Data Updated |
|---|---|---|---|
| **Reorder columns** | Column header | Another column position | `workspace.columns[]` array order |
| **Move task between columns** | TaskCard in Column A | Column B drop zone | `task.columnId`, both `columnTaskOrder` entries |
| **Reorder task within column** | TaskCard | Same column | `columnTaskOrder[colId]` array order |
| **Schedule task (Calendar)** | Unscheduled sidebar TaskCard | Calendar day cell | `task.dueDate` set to target date |
| **Reschedule task** | Calendar day cell TaskPill | Different day cell | `task.dueDate` updated |

### 5.3 Configuration

```js
// Kanban column-level draggable config
{
  group: 'tasks',
  animation: 150,
  ghostClass: 'task-ghost',       // semi-transparent placeholder
  chosenClass: 'task-chosen',     // styling while held
  dragClass: 'task-drag',         // follows cursor
  handle: '.task-card',           // entire card is draggable
  scrollSensitivity: 60,          // px from edge to trigger scroll
  scrollSpeed: 10,
}
```

### 5.4 Calendar Drag-to-Schedule

The calendar sidebar uses a `vuedraggable` list with `group: { name: 'calendar', pull: 'clone', put: false }`. Each day cell is a `vuedraggable` with `group: { name: 'calendar', pull: false, put: true }`. On the `@end` event, the task's `dueDate` is set and the store persists.

---

## 6. CSS Architecture

### 6.1 Custom Properties (Design Tokens)

All colors, spacing, and typography values are defined as CSS custom properties on `:root` (light) and `[data-theme="dark"]` (dark).

```css
:root {
  /* Surface & text */
  --bg-primary: #ffffff;
  --bg-secondary: #f3f4f6;
  --bg-tertiary: #e5e7eb;
  --text-primary: #111827;
  --text-secondary: #6b7280;
  --border-color: #d1d5db;

  /* Task colors (light mode — pastel) */
  --task-color-red: #fee2e2;
  --task-color-orange: #ffedd5;
  --task-color-yellow: #fef9c3;
  --task-color-green: #d1fae5;
  --task-color-blue: #dbeafe;
  --task-color-purple: #ede9fe;
  --task-color-pink: #fce7f3;
  --task-color-gray: #f3f4f6;

  /* Shadows, radii, transitions */
  --card-shadow: 0 1px 3px rgba(0,0,0,0.1);
  --radius-sm: 4px;
  --radius-md: 8px;
  --radius-lg: 12px;
  --transition-fast: 150ms ease;
}

[data-theme="dark"] {
  --bg-primary: #111827;
  --bg-secondary: #1f2937;
  --bg-tertiary: #374151;
  --text-primary: #f9fafb;
  --text-secondary: #9ca3af;
  --border-color: #4b5563;

  /* Task colors (dark mode — muted/deeper) */
  --task-color-red: #7f1d1d;
  --task-color-orange: #7c2d12;
  --task-color-yellow: #713f12;
  --task-color-green: #065f46;
  --task-color-blue: #1e3a5f;
  --task-color-purple: #4c1d95;
  --task-color-pink: #831843;
  --task-color-gray: #374151;

  --card-shadow: 0 1px 3px rgba(0,0,0,0.4);
}
```

### 6.2 Theme Switching

The `<html>` element carries a `data-theme` attribute toggled by the `ThemeToggle` component. The selected theme is stored in the main data object and persisted to `localStorage` alongside all other state.

```js
methods: {
  toggleTheme() {
    store.theme = store.theme === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', store.theme);
    persist();
  }
}
```

### 6.3 Typography

```css
body {
  font-family: 'Inter', 'Segoe UI', system-ui, -apple-system, sans-serif;
  font-size: 14px;
  line-height: 1.5;
  color: var(--text-primary);
  background: var(--bg-primary);
}
```

No web font CDN is required — the stack relies on system fonts with Inter as a progressive enhancement (users who have it installed get it; others fall back gracefully).

### 6.4 Print Styles

A dedicated `@media print` block and a JavaScript-driven `.printing-column` class handle the "Print List" feature:

```css
@media print {
  body * { visibility: hidden; }
  .print-target, .print-target * { visibility: visible; }
  .print-target {
    position: absolute;
    left: 0; top: 0;
    background: white;
    color: black;
    font-size: 12pt;
  }
}
```

The JS flow: clone the target column's task list into a print-ready container, trigger `window.print()`, then remove the container.

### 6.5 Responsive Approach

| Breakpoint | Behavior |
|---|---|
| **≥1024px** (Desktop) | Full Kanban with side-by-side columns, full calendar grid |
| **768–1023px** (Tablet) | Kanban columns scroll horizontally, calendar stays month view |
| **<768px** (Mobile) | Single-column Kanban stack, week-view calendar, modal is full-screen. Drag-and-drop disabled; tap-to-move fallback via context menu. |

---

## 7. Data Import / Export

### 7.1 Export

```js
function exportData() {
  const snapshot = {
    appVersion: store.appVersion,
    theme: store.theme,
    currentWorkspaceId: store.currentWorkspaceId,
    workspaces: store.workspaces,
    columns: store.columns,
    tasks: store.tasks,
    columnTaskOrder: store.columnTaskOrder,
    activeFilters: store.activeFilters
  };

  const blob = new Blob(
    [JSON.stringify(snapshot, null, 2)],
    { type: 'application/json' }
  );
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `taskflow-backup-${new Date().toISOString().slice(0,10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
}
```

### 7.2 Import

```js
function importData(file) {
  const reader = new FileReader();
  reader.onload = (e) => {
    try {
      const data = JSON.parse(e.target.result);
      if (!data.appVersion || !data.workspaces) {
        throw new Error('Invalid TaskFlow backup file');
      }
      store.hydrate(data);
      persist();
    } catch (err) {
      alert('Import failed: ' + err.message);
    }
  };
  reader.readAsText(file);
}
```

### 7.3 Validation

On import, the app validates:

- Presence of `appVersion` key
- `workspaces` is a non-empty array
- All `columnId` references in tasks point to existing columns
- All `columnTaskOrder` entries reference existing tasks
- `activeFilters` shape if present (`{ tags: string[], priorities: string[] }`)
- Backward compatibility: if legacy `activeFilter` is present, map it to `activeFilters.tags`
- Task `priority` values normalized to `null | I | II | III | IV`

Invalid references are silently dropped with a console warning rather than blocking the entire import.

---

## 8. ID Generation

Since there is no server, IDs are generated client-side. A lightweight function produces collision-resistant identifiers:

```js
function generateId(prefix = '') {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 8);
  return prefix ? `${prefix}_${timestamp}${random}` : `${timestamp}${random}`;
}

// Usage:
generateId('ws')   // "ws_lq8k2f4a9x3m"
generateId('col')  // "col_lq8k2g7b2p1n"
generateId('task') // "task_lq8k2h1c5r8j"
```

Prefixed IDs make debugging and JSON inspection significantly easier.

---

## 9. Inline Tag Parsing

### 9.1 Algorithm

```js
function parseTagsFromTitle(rawTitle) {
  const tagRegex = /#(\w[\w-]*)/g;
  const tags = [];
  let match;
  while ((match = tagRegex.exec(rawTitle)) !== null) {
    tags.push(match[1].toLowerCase());
  }
  const cleanTitle = rawTitle.replace(tagRegex, '').replace(/\s{2,}/g, ' ').trim();
  return { title: cleanTitle, tags: [...new Set(tags)] };
}

// Example:
parseTagsFromTitle('Buy groceries #personal #urgent')
// → { title: 'Buy groceries', tags: ['personal', 'urgent'] }
```

### 9.2 Tag Color Assignment

Tags are assigned colors deterministically via a hash of the tag name, mapped to a small palette of pill colors. This ensures the same tag always gets the same color without manual assignment.

---

## 10. Browser Compatibility

| Browser | Minimum Version | Notes |
|---|---|---|
| Chrome | 80+ | Primary target |
| Firefox | 78+ | Full support |
| Safari | 13.1+ | Tested for CSS variable support |
| Edge (Chromium) | 80+ | Same engine as Chrome |

### 10.1 Required Browser APIs

- `localStorage` — data persistence
- `Blob` / `URL.createObjectURL` — file export
- `FileReader` — file import
- `CSS Custom Properties` — theming
- `CSS Grid` / `Flexbox` — layout
- `pointer events` — drag and drop (via SortableJS)

---

## 11. Performance Considerations

| Concern | Mitigation |
|---|---|
| **Large task count (500+)** | Virtual scrolling not needed at MVP; columns auto-scroll. Revisit if users report sluggishness. |
| **Frequent localStorage writes** | Debounced at 300ms. Batch DnD reorder events. |
| **CDN latency** | Libraries are small (<100KB combined gzipped). Cache-Control headers from CDN providers handle repeat visits. |
| **Vue 2 reactivity with deep objects** | Use `Vue.set()` for adding new keys to `columns` / `tasks` objects to ensure reactivity. |
| **Calendar rendering (many tasks)** | Only render task pills for visible month/week. Compute visible date range and filter tasks accordingly. |

---

## 12. Security Notes

- **No server, no auth** — data lives only in the user's browser. There is no attack surface beyond standard browser security.
- **XSS in task titles/descriptions** — Vue 2's `{{ }}` interpolation auto-escapes HTML. Never use `v-html` with user-provided content.
- **Import validation** — JSON imports are parsed with `JSON.parse` (safe) and validated structurally before hydrating state. No `eval()` is ever used.

---

## 13. Deployment

### 13.1 GitHub Pages

1. Push the repository to GitHub.
2. Enable GitHub Pages from Settings → Pages → Source: `main` branch, root `/`.
3. The site is served at `https://kilmerc.github.io/TaskFlow/`.

No CI/CD pipeline is needed. Every push to `main` is a deploy.

### 13.2 Alternative Hosts

The app is a collection of static files and works on any static host: Netlify, Vercel, Cloudflare Pages, or even opened directly from the filesystem via `file://` (with the caveat that some CDN scripts may not load without HTTP).

---

## 14. Development Workflow

Since there is no build step, the development workflow is simple:

1. **Edit** files in any text editor or IDE.
2. **Preview** by opening `index.html` in a browser, or use a lightweight local server:
   ```bash
   npx serve .
   # or
   python3 -m http.server 8080
   ```
3. **Debug** using browser DevTools. Vue Devtools browser extension works with Vue 2 CDN apps.
4. **Test** manually across browsers. For automated testing (post-MVP), consider adding a `<script>` that runs assertions against `store` in a test mode.

---

## 15. Migration Path to Vue 3 (Future)

If the project eventually moves to Vue 3:

| Change | Effort |
|---|---|
| Replace `Vue.observable()` with `reactive()` from Composition API | Low |
| Replace `Vue.component()` global registration with `app.component()` | Low |
| Replace `vuedraggable@2` with `vuedraggable@4` (or `@vueuse/integrations` drag) | Medium |
| Replace `new Vue()` event bus with `mitt` or provide/inject | Low |
| Template syntax is 99% compatible | Minimal |

The overall migration is straightforward since Vue 2.7 already supports Composition API syntax.
