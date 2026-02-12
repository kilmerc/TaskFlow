# TaskFlow

TaskFlow is a lightweight, "no-build" personal task management application. It features a Kanban board, Calendar view, and robust local persistence.

## Features

-   **Workspaces**: Organize tasks into separate areas (Personal, Work, etc.).
-   **Kanban Board**: Drag-and-drop tasks, custom columns, and inline tagging (`#urgent`).
-   **Calendar View**: Schedule tasks by dragging them onto dates. Week and Month views.
-   **Data Privacy**: All data is stored in your browser's `localStorage`. No server required.
-   **Import/Export**: Backup your data to JSON and restore it anytime.
-   **Themes**: Light and Dark mode support.
-   **Responsive**: Works on Desktop, Tablet, and Mobile.

## Quick Start

1.  Clone this repository or download the files.
2.  Open `index.html` in your web browser.
3.  Start organizing!

## Deployment

Since TaskFlow uses no build system, deployment is simple:

### GitHub Pages
1.  Push this repository to GitHub.
2.  Go to **Settings > Pages**.
3.  Select the `main` branch and `/` (root) folder.
4.  Save. Your site will be live at `https://<username>.github.io/<repository-name>/`.

### Other Static Hosts
Upload the entire folder `index.html`, `css/`, `js/`, `assets/` to any static hosting provider (Netlify, Vercel, etc.).

## Tech Stack
-   **Vue.js 2.7** (CDN)
-   **SortableJS / Vue.Draggable** (CDN)
-   **FontAwesome** (CDN)
-   **Vanilla CSS** (Variables, Grid, Flexbox)

## License
MIT
