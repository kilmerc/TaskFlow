# **Product Requirements Document (PRD)**

## **Project: TaskFlow (Personal Kanban & Calendar)**

**Date:** October 26, 2023

**Version:** 1.0

**Tech Stack:** HTML5, CSS3, Vue.js 3 (via CDN), LocalStorage

**Platform:** Web (GitHub Pages hosting)

## **1\. Executive Summary**

The goal is to build a lightweight, "no-build" personal task management application. It serves as a centralized hub for organizing tasks across different life areas (Workspaces). The app features a dual-view interface (Kanban Board and Calendar), inline tag creation, sub-task checklists, and robust local data persistence with JSON export capabilities. The design aesthetic is clean, modern, and supports both Dark and Light modes.

## **2\. Technical Constraints & Architecture**

* **Framework:** Vue.js 3.x loaded via CDN (Content Delivery Network).  
* **Build System:** None. The app must run directly from an index.html file.  
* **Data Storage:** Browser localStorage for immediate persistence.  
* **Data Structure:** Relational JSON model (Workspaces, Columns, Tasks).  
* **External Libraries (CDN only):**  
  * Vue 3  
  * SortableJS / Vue.Draggable (for Drag-and-Drop)  
  * FontAwesome or similar (for icons)  
  * *No complex bundlers (Webpack/Vite).*

## **3\. Core Features**

### **3.1. Workspaces**

* **Concept:** Top-level containers (e.g., "Personal", "Work", "Hobby Project").  
* **Functionality:**  
  * User can create, rename, and delete workspaces.  
  * Switching workspaces completely swaps the Kanban/Calendar views.  
  * Data is isolated per workspace.

### **3.2. View 1: Kanban Board**

* **Columns:**  
  * Add new column (User types name \-\> Enter).  
  * Rename column header.  
  * Delete column (Confirms if tasks exist).  
  * **Drag-and-Drop:** Reorder columns horizontally.  
* **Task Cards:**  
  * **Drag-and-Drop:** Move tasks between columns and reorder within a column.  
  * **Quick Add:** "+" button in column header or footer. User types title \-\> Hits Enter \-\> Task created.  
  * **Inline Tagging:**  
    * If user types Task Name \#urgent, the system detects \#urgent.  
    * The string \#urgent is removed from the visible title.  
    * A tag "urgent" is created (if new) or assigned.  
    * Visual: Tags appear as colored pills on the task card.  
  * **Visuals:** Show Title, Due Date (if exists), Tags, Subtask progress (e.g., "1/3").

### **3.3. View 2: Calendar**

* **Layout:**  
  * **Main Area:** Standard Month or Week grid.  
  * **Sidebar:** "Unscheduled Tasks" (Tasks with no dueDate).  
* **Functionality:**  
  * **Drag-to-Schedule:** User drags a task from the "Unscheduled" sidebar onto a calendar day cell.  
  * **Result:** The task's dueDate property is updated to that date.  
  * **Visuals:**  
    * Tasks appear as small bars or dots on the relevant day.  
    * Colors match the task's assigned color.  
* **Sync:** Moving a task here updates the Kanban view immediately.

### **3.4. Task Details (Modal)**

Clicking a task card opens a modal with:

* **Title:** Editable text.  
* **Description:** Multi-line text area (plain text).  
* **Sub-tasks:**  
  * Simple checklist UI.  
  * Add item \-\> Enter.  
  * Click checkbox to toggle done/undone.  
  * Delete subtask line.  
  * *Note:* Subtasks are for tracking only; they do not have their own dates/tags.  
* **Due Date:** Date picker input.  
* **Color Coding:**  
  * Selector for 8 preset colors.  
  * Colors must be theme-aware (see UI/UX section).  
* **Actions:** Delete Task, Close Modal.

### **3.5. Filtering**

* **Global Filter Bar:** Input/Dropdown to select a Tag.  
* **Behavior:**  
  * When a tag is selected (e.g., "Design"), only tasks containing that tag remain visible.  
  * Columns containing 0 matching tasks **remain visible** (do not hide empty columns).  
  * "Clear Filter" button restores all tasks.

### **3.6. Printing**

* **Trigger:** "Three-dots" menu on a Column Header \-\> "Print List".  
* **Output:**  
  * Browser print dialog opens.  
  * **Styles:** White background, black text.  
  * **Format:** Title of Column at top. List of tasks with physical checkboxes \[ \] for paper ticking.  
  * Hides all other UI elements (Sidebar, other columns, buttons).

### **3.7. Data Management**

* **Auto-Save:** Every action triggers a save to localStorage.  
* **Backup:**  
  * **Export:** Button downloads a .json file containing all workspaces/tasks.  
  * **Import:** File picker to upload a .json file, restoring the state.

## **4\. UI/UX Design Guidelines**

### **4.1. Themes (Dark & Light Mode)**

* **Toggle:** Switch in the header.  
* **Color Palette (8 Colors):**  
  * Must use CSS Variables (e.g., \--task-color-red).  
  * **Logic:**  
    * *Light Mode:* Colors are pastel/soft (readable with dark text).  
    * *Dark Mode:* Colors are muted/deeper (readable with light text).  
  * **Green Example:**  
    * Light Mode: \#d1fae5 (Tailwind green-100 style).  
    * Dark Mode: \#065f46 (Tailwind green-800 style) or slightly brighter for visibility against dark bg.  
  * **Text Contrast:** Ensure text on colored cards handles contrast automatically (or use a border/pill style instead of full background).

### **4.2. Typography & Layout**

* **Font:** System sans-serif (Inter, Roboto, or Segoe UI).  
* **Card Style:**  
  * Rounded corners (approx 8px).  
  * Subtle shadow in Light Mode.  
  * Thin border/lighter background in Dark Mode.  
* **Mobile:**  
  * View-only or simple interactions.  
  * Horizontal scrolling for Kanban columns is acceptable.  
  * No complex touch-drag logic required (Desktop first).

## **5\. Data Model (JSON Structure)**

The application state should resemble this structure:

{  
  "appVersion": "1.0",  
  "theme": "dark",  
  "currentWorkspaceId": "ws\_1",  
  "workspaces": \[  
    {  
      "id": "ws\_1",  
      "name": "Life Admin",  
      "columns": \["col\_1", "col\_2", "col\_3"\] // Array of IDs to maintain order  
    }  
  \],  
  "columns": {  
    "col\_1": { "id": "col\_1", "workspaceId": "ws\_1", "title": "To Do" },  
    "col\_2": { "id": "col\_2", "workspaceId": "ws\_1", "title": "In Progress" },  
    "col\_3": { "id": "col\_3", "workspaceId": "ws\_1", "title": "Done" }  
  },  
  "tasks": {  
    "task\_abc": {  
      "id": "task\_abc",  
      "columnId": "col\_1",  
      "title": "Buy Groceries",  
      "description": "Milk, Eggs, Bread",  
      "tags": \["personal", "urgent"\],  
      "color": "blue", // references a CSS variable index  
      "dueDate": "2023-11-01",  
      "isCompleted": false,  
      "subtasks": \[  
        { "text": "Check fridge", "done": true },  
        { "text": "Go to store", "done": false }  
      \]  
    }  
  },  
  "columnTaskOrder": {  
     "col\_1": \["task\_abc", "task\_xyz"\] // Maintain sort order in column  
  }  
}

## **6\. Future Scope (Post-MVP)**

* **Google Firebase Auth:** Sync data across devices.  
* **Firestore:** Cloud database storage.  
* **Recurring Tasks:** Logic for repeating cards.