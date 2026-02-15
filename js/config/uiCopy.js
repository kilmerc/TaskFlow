export const uiCopy = Object.freeze({
    labels: Object.freeze({
        calendarSidebarTitle: 'Needs a date',
        eisenhowerSidebarTitle: 'Needs priority',
        emptyWorkspace: 'Choose a workspace to get started.',
        templateGalleryTitle: 'Template library',
        templateGalleryEmpty: 'No templates yet. Save a task as a template to reuse it.',
        newColumn: 'New column',
        clearAll: 'Clear all'
    }),
    actions: Object.freeze({
        addTask: 'Add task',
        createTask: 'Create Task',
        addStep: 'Add a step...',
        addStepCompact: 'Add step...',
        addTaskCta: 'Add task'
    }),
    emptyStates: Object.freeze({
        noMatchingTags: 'No matching tags',
        noMatchingColumns: 'No matching columns',
        noUnassignedTasks: 'No tasks waiting for priority',
        allScheduled: 'All tasks have dates.'
    }),
    dialogs: Object.freeze({
        deleteTaskMessage: 'This will permanently delete this task. You cannot undo it.'
    }),
    tooltips: Object.freeze({
        addTask: 'Add task',
        addColumn: 'Add Column',
        closeTemplateGallery: 'Close Template Gallery',
        closeModal: 'Close Modal'
    }),
    placeholders: Object.freeze({
        quickAddTitle: 'Enter a task title...',
        subtask: 'Step...',
        addSubtask: 'Add a step...',
        taskDescription: 'Add details...',
        tagInput: 'Add or search tags...',
        searchTasks: 'Search tasks...'
    })
});

export default uiCopy;
