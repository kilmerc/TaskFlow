import { clickOutsideDirective } from '../directives/clickOutside.js';

import KanbanColumnHeader from '../components/KanbanColumnHeader.js';
import KanbanQuickAdd from '../components/KanbanQuickAdd.js';
import TaskModalColumnPicker from '../components/TaskModalColumnPicker.js';
import TaskModalTagEditor from '../components/TaskModalTagEditor.js';
import TaskModalSubtasks from '../components/TaskModalSubtasks.js';
import WorkspaceSwitcher from '../components/WorkspaceSwitcher.js';
import TaskCard from '../components/TaskCard.js';
import KanbanColumn from '../components/KanbanColumn.js';
import CalendarSidebar from '../components/CalendarSidebar.js';
import KanbanBoard from '../components/KanbanBoard.js';
import CalendarView from '../components/CalendarView.js';
import EisenhowerView from '../components/EisenhowerView.js';
import TaskModal from '../components/TaskModal.js';
import FilterBar from '../components/FilterBar.js';
import SearchControls from '../components/SearchControls.js';
import AppDialog from '../components/AppDialog.js';
import AppToast from '../components/AppToast.js';
import TemplateGalleryModal from '../components/TemplateGalleryModal.js';

export function registerGlobals(app) {
    app.directive('click-outside', clickOutsideDirective);

    app.component('kanban-column-header', KanbanColumnHeader);
    app.component('kanban-quick-add', KanbanQuickAdd);
    app.component('task-modal-column-picker', TaskModalColumnPicker);
    app.component('task-modal-tag-editor', TaskModalTagEditor);
    app.component('task-modal-subtasks', TaskModalSubtasks);
    app.component('workspace-switcher', WorkspaceSwitcher);
    app.component('task-card', TaskCard);
    app.component('kanban-column', KanbanColumn);
    app.component('calendar-sidebar', CalendarSidebar);
    app.component('kanban-board', KanbanBoard);
    app.component('calendar-view', CalendarView);
    app.component('eisenhower-view', EisenhowerView);
    app.component('task-modal', TaskModal);
    app.component('filter-bar', FilterBar);
    app.component('search-controls', SearchControls);
    app.component('app-dialog', AppDialog);
    app.component('app-toast', AppToast);
    app.component('template-gallery-modal', TemplateGalleryModal);

    const draggable = window.vuedraggable && (window.vuedraggable.default || window.vuedraggable);
    if (draggable) {
        app.component('draggable', draggable);
    }
}
