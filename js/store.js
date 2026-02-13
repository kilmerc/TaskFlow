import { generateId } from './utils/id.js';
import { parseTagsFromTitle, normalizeTagList } from './utils/tagParser.js';
import { PRIORITY_VALUES, normalizePriority } from './utils/taskFilters.js';


const STORAGE_KEY = 'taskflow_data';
export const MAX_WORKSPACE_NAME = 80;
export const MAX_COLUMN_NAME = 80;
export const MAX_TASK_TITLE = 200;

function getDefaultActiveFilters() {
    return {
        tags: [],
        priorities: []
    };
}

function getDefaultDialogState() {
    return {
        isOpen: false,
        variant: 'confirm',
        title: '',
        message: '',
        confirmLabel: 'Confirm',
        cancelLabel: 'Cancel',
        destructive: false,
        input: {
            enabled: false,
            value: '',
            placeholder: '',
            maxLength: null
        },
        action: {
            type: '',
            payload: null
        },
        error: ''
    };
}

function success(data = {}) {
    return { ok: true, data };
}

function failure(error) {
    return {
        ok: false,
        error: {
            code: error && error.code ? error.code : 'unknown_error',
            message: error && error.message ? error.message : 'Something went wrong.',
            field: error && error.field ? error.field : null,
            maxLength: error && typeof error.maxLength === 'number' ? error.maxLength : null
        }
    };
}

function cloneDialogState(overrides = {}) {
    const base = getDefaultDialogState();
    const input = overrides.input || {};
    const action = overrides.action || {};

    return {
        ...base,
        ...overrides,
        input: {
            ...base.input,
            ...input
        },
        action: {
            ...base.action,
            ...action
        }
    };
}

export const store = Vue.observable({
    appVersion: '1.2',
    theme: 'light',
    currentWorkspaceId: null,
    workspaces: [],
    columns: {},
    tasks: {},
    columnTaskOrder: {},
    activeFilters: getDefaultActiveFilters(),
    activeTaskId: null,
    taskModalMode: null,
    taskModalDraft: null,
    storageWarning: null,
    dialog: getDefaultDialogState(),
    toasts: []
});

export function buildPersistedSnapshot() {
    return {
        appVersion: store.appVersion,
        theme: store.theme,
        currentWorkspaceId: store.currentWorkspaceId,
        workspaces: store.workspaces,
        columns: store.columns,
        tasks: store.tasks,
        columnTaskOrder: store.columnTaskOrder,
        activeFilters: store.activeFilters
    };
}

function persistSnapshot() {
    try {
        const snapshot = JSON.stringify(buildPersistedSnapshot());

        // Check size (approx 4MB limit for warning)
        if (snapshot.length > 4 * 1024 * 1024) {
            store.storageWarning = "Start-up disk is nearly full. Please export a backup.";
        } else {
            store.storageWarning = null;
        }

        localStorage.setItem(STORAGE_KEY, snapshot);
    } catch (e) {
        console.error('Failed to save to localStorage', e);
        if (e.name === 'QuotaExceededError' || e.code === 22) {
            store.storageWarning = "Storage full! Changes may not be saved. Please export and clear data.";
        }
    }
}

// Debounce helper
function debounce(fn, delay) {
    let timeoutID = null;
    return function () {
        clearTimeout(timeoutID);
        const args = arguments;
        const that = this;
        timeoutID = setTimeout(function () {
            fn.apply(that, args);
        }, delay);
    };
}

export function persistNow() {
    persistSnapshot();
}

export const persist = debounce(() => {
    persistNow();
}, 300);

function getWorkspace(workspaceId) {
    return store.workspaces.find(w => w.id === workspaceId) || null;
}

function getWorkspaceColumnIds(workspaceId) {
    const workspace = getWorkspace(workspaceId);
    if (!workspace || !Array.isArray(workspace.columns)) return [];
    return workspace.columns.filter(columnId => !!store.columns[columnId]);
}

function getWorkspaceTagSet(workspaceId) {
    const tags = new Set();
    if (!workspaceId) return tags;

    Object.values(store.tasks).forEach(task => {
        if (!task || !Array.isArray(task.tags) || !task.tags.length) {
            return;
        }

        const column = store.columns[task.columnId];
        if (!column || column.workspaceId !== workspaceId) {
            return;
        }

        task.tags.forEach(tag => {
            if (typeof tag === 'string' && tag.length > 0) {
                tags.add(tag);
            }
        });
    });

    return tags;
}

function pruneActiveTagFiltersForWorkspace(workspaceId) {
    if (!store.activeFilters || !Array.isArray(store.activeFilters.tags)) {
        Vue.set(store, 'activeFilters', getDefaultActiveFilters());
        return;
    }

    const allowedTags = getWorkspaceTagSet(workspaceId);
    const nextTags = store.activeFilters.tags.filter(tag => allowedTags.has(tag));

    if (nextTags.length !== store.activeFilters.tags.length) {
        Vue.set(store.activeFilters, 'tags', nextTags);
    }
}

function getDefaultColumnId(workspaceId = null) {
    const workspaceColumnIds = workspaceId ? getWorkspaceColumnIds(workspaceId) : [];
    if (workspaceColumnIds.length > 0) {
        return workspaceColumnIds[0];
    }

    const allColumnIds = Object.keys(store.columns);
    return allColumnIds.length > 0 ? allColumnIds[0] : null;
}

function ensureColumnTaskOrder(columnId) {
    if (!store.columnTaskOrder[columnId]) {
        Vue.set(store.columnTaskOrder, columnId, []);
    }
}

function removeTaskFromColumnOrder(taskId, columnId) {
    const order = store.columnTaskOrder[columnId];
    if (!Array.isArray(order)) return;
    const index = order.indexOf(taskId);
    if (index > -1) {
        order.splice(index, 1);
    }
}

function addTaskToColumnOrder(taskId, columnId) {
    if (!store.columns[columnId]) return false;

    ensureColumnTaskOrder(columnId);
    if (!store.columnTaskOrder[columnId].includes(taskId)) {
        store.columnTaskOrder[columnId].push(taskId);
    }
    return true;
}

function getColumnWorkspaceId(columnId) {
    const column = store.columns[columnId];
    return column ? column.workspaceId : null;
}

function applyDialogState(dialogState) {
    Vue.set(store, 'dialog', cloneDialogState(dialogState));
}

function setDialogError(message) {
    Vue.set(store.dialog, 'error', message || 'Unable to complete this action.');
}

function resetDialogAndToasts() {
    applyDialogState(getDefaultDialogState());
    Vue.set(store, 'toasts', []);
}

function initializeDefaultData() {
    store.appVersion = '1.1';

    const wsId = generateId('ws');
    const col1 = generateId('col');
    const col2 = generateId('col');
    const col3 = generateId('col');

    store.workspaces = [{
        id: wsId,
        name: 'My Workspace',
        columns: [col1, col2, col3]
    }];

    store.currentWorkspaceId = wsId;

    store.columns = {
        [col1]: { id: col1, workspaceId: wsId, title: 'To Do', showCompleted: false },
        [col2]: { id: col2, workspaceId: wsId, title: 'In Progress', showCompleted: false },
        [col3]: { id: col3, workspaceId: wsId, title: 'Done', showCompleted: false }
    };

    store.columnTaskOrder = {
        [col1]: [],
        [col2]: [],
        [col3]: []
    };

    store.tasks = {};
    store.activeFilters = getDefaultActiveFilters();
    store.activeTaskId = null;
    store.taskModalMode = null;
    store.taskModalDraft = null;
    store.storageWarning = null;
    resetDialogAndToasts();
    persist();
}

export function normalizeText(value) {
    if (typeof value !== 'string') return '';
    return value.replace(/\s+/g, ' ').trim();
}

function buildValidationError(code, message, field, maxLength = null) {
    return {
        code,
        message,
        field,
        maxLength
    };
}

function getNameConfig(kind) {
    if (kind === 'workspace') {
        return { label: 'Workspace name', maxLength: MAX_WORKSPACE_NAME, field: 'workspace' };
    }
    if (kind === 'column') {
        return { label: 'Column name', maxLength: MAX_COLUMN_NAME, field: 'column' };
    }
    return { label: 'Task title', maxLength: MAX_TASK_TITLE, field: 'task' };
}

export function validateName(kind, value, context = {}) {
    const normalized = normalizeText(value);
    const config = getNameConfig(kind);

    if (!normalized) {
        return {
            ok: false,
            value: '',
            error: buildValidationError('required', `${config.label} is required.`, config.field, config.maxLength)
        };
    }

    if (normalized.length > config.maxLength) {
        return {
            ok: false,
            value: normalized,
            error: buildValidationError(
                'max_length_exceeded',
                `${config.label} must be ${config.maxLength} characters or less.`,
                config.field,
                config.maxLength
            )
        };
    }

    if (kind === 'column') {
        const workspaceId = context.workspaceId;
        const excludeColumnId = context.excludeColumnId || null;

        if (!workspaceId || !getWorkspace(workspaceId)) {
            return {
                ok: false,
                value: normalized,
                error: buildValidationError('invalid_target', 'Target workspace does not exist.', config.field, config.maxLength)
            };
        }

        const normalizedLower = normalized.toLowerCase();
        const duplicateExists = getWorkspaceColumnIds(workspaceId).some(columnId => {
            if (columnId === excludeColumnId) return false;
            const column = store.columns[columnId];
            if (!column || typeof column.title !== 'string') return false;
            return normalizeText(column.title).toLowerCase() === normalizedLower;
        });

        if (duplicateExists) {
            return {
                ok: false,
                value: normalized,
                error: buildValidationError(
                    'duplicate_column_name',
                    'A column with this name already exists in this workspace.',
                    config.field,
                    config.maxLength
                )
            };
        }
    }

    return {
        ok: true,
        value: normalized,
        error: null
    };
}

export const mutations = {
    addWorkspace(name) {
        const validation = validateName('workspace', name);
        if (!validation.ok) {
            return failure(validation.error);
        }

        const id = generateId('ws');
        const col1 = generateId('col');
        const col2 = generateId('col');
        const col3 = generateId('col');

        const newWorkspace = {
            id,
            name: validation.value,
            columns: [col1, col2, col3]
        };

        store.workspaces.push(newWorkspace);

        // Add default columns
        Vue.set(store.columns, col1, { id: col1, workspaceId: id, title: 'To Do', showCompleted: false });
        Vue.set(store.columns, col2, { id: col2, workspaceId: id, title: 'In Progress', showCompleted: false });
        Vue.set(store.columns, col3, { id: col3, workspaceId: id, title: 'Done', showCompleted: false });

        // Initialize column order
        Vue.set(store.columnTaskOrder, col1, []);
        Vue.set(store.columnTaskOrder, col2, []);
        Vue.set(store.columnTaskOrder, col3, []);

        store.currentWorkspaceId = id;
        pruneActiveTagFiltersForWorkspace(id);
        persist();
        return success({ workspaceId: id });
    },

    deleteWorkspace(workspaceId) {
        const wsIndex = store.workspaces.findIndex(w => w.id === workspaceId);
        if (wsIndex === -1) {
            return failure(buildValidationError('invalid_target', 'Workspace not found.', 'workspace'));
        }

        if (store.workspaces.length <= 1) {
            return failure(buildValidationError('invalid_target', 'At least one workspace must remain.', 'workspace'));
        }

        const ws = store.workspaces[wsIndex];

        // Cleanup columns and tasks
        ws.columns.forEach(colId => {
            const taskIds = store.columnTaskOrder[colId] || [];
            taskIds.forEach(taskId => {
                Vue.delete(store.tasks, taskId);
            });
            Vue.delete(store.columnTaskOrder, colId);
            Vue.delete(store.columns, colId);
        });

        store.workspaces.splice(wsIndex, 1);

        if (store.activeTaskId && !store.tasks[store.activeTaskId]) {
            this.closeTaskModal();
        }

        if (store.currentWorkspaceId === workspaceId) {
            store.currentWorkspaceId = store.workspaces.length ? store.workspaces[0].id : null;
        }
        pruneActiveTagFiltersForWorkspace(store.currentWorkspaceId);
        persist();
        return success();
    },

    updateWorkspace(workspaceId, name) {
        const ws = store.workspaces.find(w => w.id === workspaceId);
        if (!ws) {
            return failure(buildValidationError('invalid_target', 'Workspace not found.', 'workspace'));
        }

        const validation = validateName('workspace', name);
        if (!validation.ok) {
            return failure(validation.error);
        }

        if (ws.name === validation.value) {
            return success({ changed: false });
        }

        ws.name = validation.value;
        persist();
        return success({ changed: true });
    },

    switchWorkspace(workspaceId) {
        if (!getWorkspace(workspaceId)) {
            return failure(buildValidationError('invalid_target', 'Workspace not found.', 'workspace'));
        }

        store.currentWorkspaceId = workspaceId;
        pruneActiveTagFiltersForWorkspace(workspaceId);
        persist();
        return success();
    },

    addColumn(workspaceId, title) {
        const ws = getWorkspace(workspaceId);
        if (!ws) {
            return failure(buildValidationError('invalid_target', 'Workspace not found.', 'column'));
        }

        const validation = validateName('column', title, { workspaceId });
        if (!validation.ok) {
            return failure(validation.error);
        }

        const id = generateId('col');

        Vue.set(store.columns, id, { id, workspaceId, title: validation.value, showCompleted: false });
        Vue.set(store.columnTaskOrder, id, []);
        ws.columns.push(id);
        persist();
        return success({ columnId: id });
    },

    updateColumn(columnId, title) {
        const column = store.columns[columnId];
        if (!column) {
            return failure(buildValidationError('invalid_target', 'Column not found.', 'column'));
        }

        const validation = validateName('column', title, {
            workspaceId: column.workspaceId,
            excludeColumnId: columnId
        });
        if (!validation.ok) {
            return failure(validation.error);
        }

        if (column.title === validation.value) {
            return success({ changed: false });
        }

        column.title = validation.value;
        persist();
        return success({ changed: true });
    },

    deleteColumn(columnId) {
        const col = store.columns[columnId];
        if (!col) {
            return failure(buildValidationError('invalid_target', 'Column not found.', 'column'));
        }

        const ws = store.workspaces.find(w => w.id === col.workspaceId);
        if (ws) {
            const idx = ws.columns.indexOf(columnId);
            if (idx > -1) ws.columns.splice(idx, 1);
        }

        // Delete tasks in column
        const taskIds = store.columnTaskOrder[columnId] || [];
        taskIds.forEach(taskId => {
            Vue.delete(store.tasks, taskId);
        });

        Vue.delete(store.columnTaskOrder, columnId);
        Vue.delete(store.columns, columnId);

        if (store.activeTaskId && !store.tasks[store.activeTaskId]) {
            this.closeTaskModal();
        }
        pruneActiveTagFiltersForWorkspace(store.currentWorkspaceId);
        persist();
        return success();
    },

    reorderColumns(workspaceId, newOrder) {
        const ws = store.workspaces.find(w => w.id === workspaceId);
        if (!ws || !Array.isArray(newOrder)) {
            return failure(buildValidationError('invalid_target', 'Unable to reorder columns.', 'column'));
        }

        ws.columns = newOrder;
        persist();
        return success();
    },

    addTask(columnId, rawTitle) {
        const { title, tags } = parseTagsFromTitle(rawTitle);
        const validation = validateName('task', title);
        if (!validation.ok) {
            return failure(validation.error);
        }

        return this.createTask({
            columnId,
            title: validation.value,
            tags
        });
    },

    createTask(payload) {
        const input = payload && typeof payload === 'object' ? payload : {};
        const columnId = typeof input.columnId === 'string' ? input.columnId : null;

        if (!columnId || !store.columns[columnId]) {
            return failure(buildValidationError('invalid_target', 'Target column does not exist.', 'task'));
        }

        const titleValidation = validateName('task', input.title);
        if (!titleValidation.ok) {
            return failure(titleValidation.error);
        }

        const id = generateId('task');
        const newTask = {
            id,
            columnId,
            title: titleValidation.value,
            tags: normalizeTagList(input.tags || []),
            priority: normalizePriority(input.priority),
            description: typeof input.description === 'string' ? input.description : '',
            color: typeof input.color === 'string' && input.color ? input.color : 'gray',
            dueDate: input.dueDate || null,
            subtasks: Array.isArray(input.subtasks) ? input.subtasks : [],
            isCompleted: false,
            completedAt: null,
            createdAt: new Date().toISOString()
        };

        Vue.set(store.tasks, id, newTask);
        addTaskToColumnOrder(id, columnId);

        persist();
        return success({ taskId: id });
    },

    moveTask(taskId, sourceColId, targetColId, newIndex) {
        const task = store.tasks[taskId];
        if (!task) {
            return failure(buildValidationError('invalid_target', 'Task not found.', 'task'));
        }

        if (!store.columns[targetColId]) {
            return failure(buildValidationError('invalid_target', 'Target column not found.', 'column'));
        }

        const effectiveSourceColId = store.columns[sourceColId] ? sourceColId : task.columnId;
        ensureColumnTaskOrder(effectiveSourceColId);
        ensureColumnTaskOrder(targetColId);

        removeTaskFromColumnOrder(taskId, effectiveSourceColId);

        if (effectiveSourceColId !== targetColId) {
            task.columnId = targetColId;
        }

        const targetOrder = store.columnTaskOrder[targetColId];
        if (typeof newIndex === 'number') {
            const boundedIndex = Math.max(0, Math.min(newIndex, targetOrder.length));
            targetOrder.splice(boundedIndex, 0, taskId);
        } else {
            targetOrder.push(taskId);
        }

        persist();
        return success();
    },

    updateColumnTaskOrder(columnId, newOrder) {
        if (!store.columns[columnId] || !Array.isArray(newOrder)) {
            return failure(buildValidationError('invalid_target', 'Unable to update task order.', 'column'));
        }

        Vue.set(store.columnTaskOrder, columnId, newOrder);
        persist();
        return success();
    },

    toggleTaskCompletion(taskId) {
        const task = store.tasks[taskId];
        if (!task) {
            return failure(buildValidationError('invalid_target', 'Task not found.', 'task'));
        }

        const isCompleted = !task.isCompleted;
        Vue.set(task, 'isCompleted', isCompleted);
        Vue.set(task, 'completedAt', isCompleted ? new Date().toISOString() : null);
        persist();
        return success();
    },

    toggleColumnShowCompleted(columnId) {
        const col = store.columns[columnId];
        if (!col) {
            return failure(buildValidationError('invalid_target', 'Column not found.', 'column'));
        }

        Vue.set(col, 'showCompleted', !col.showCompleted);
        persist();
        return success();
    },

    setActiveTask(taskId) {
        if (!taskId || !store.tasks[taskId]) {
            this.closeTaskModal();
            return failure(buildValidationError('invalid_target', 'Task not found.', 'task'));
        }
        store.activeTaskId = taskId;
        store.taskModalMode = 'edit';
        store.taskModalDraft = null;
        return success();
    },

    openTaskModalForCreate(draft = {}) {
        const input = draft && typeof draft === 'object' ? draft : {};
        const requestedColumnId = typeof input.columnId === 'string' ? input.columnId : null;
        const columnWorkspaceId = requestedColumnId ? getColumnWorkspaceId(requestedColumnId) : null;

        let workspaceId = input.workspaceId || columnWorkspaceId || store.currentWorkspaceId;
        if (!workspaceId || !getWorkspace(workspaceId)) {
            workspaceId = store.currentWorkspaceId;
        }

        let columnId = requestedColumnId && store.columns[requestedColumnId] ? requestedColumnId : null;
        if (columnId && workspaceId) {
            const column = store.columns[columnId];
            if (!column || column.workspaceId !== workspaceId) {
                columnId = null;
            }
        }
        if (!columnId) {
            columnId = getDefaultColumnId(workspaceId);
        }

        store.activeTaskId = null;
        store.taskModalMode = 'create';
        store.taskModalDraft = {
            workspaceId: workspaceId || null,
            title: typeof input.title === 'string' ? input.title : '',
            description: typeof input.description === 'string' ? input.description : '',
            dueDate: input.dueDate || null,
            priority: normalizePriority(input.priority),
            color: typeof input.color === 'string' && input.color ? input.color : 'gray',
            tags: normalizeTagList(input.tags || []),
            columnId: columnId || null
        };
        return success();
    },

    closeTaskModal() {
        store.activeTaskId = null;
        store.taskModalMode = null;
        store.taskModalDraft = null;
        return success();
    },

    updateTask(taskId, updates) {
        const task = store.tasks[taskId];
        if (!task || !updates || typeof updates !== 'object') {
            return failure(buildValidationError('invalid_target', 'Task not found.', 'task'));
        }

        const sourceColumnId = task.columnId;
        let targetColumnId = sourceColumnId;
        let hasChanges = false;

        if (Object.prototype.hasOwnProperty.call(updates, 'columnId')) {
            const nextColumnId = updates.columnId;
            if (!store.columns[nextColumnId]) {
                return failure(buildValidationError('invalid_target', 'Target column does not exist.', 'column'));
            }
            if (nextColumnId !== sourceColumnId) {
                targetColumnId = nextColumnId;
            }
        }

        if (Object.prototype.hasOwnProperty.call(updates, 'title')) {
            const titleValidation = validateName('task', updates.title);
            if (!titleValidation.ok) {
                return failure(titleValidation.error);
            }
            if (titleValidation.value !== task.title) {
                Vue.set(task, 'title', titleValidation.value);
                hasChanges = true;
            }
        }

        if (Object.prototype.hasOwnProperty.call(updates, 'tags')) {
            Vue.set(task, 'tags', normalizeTagList(updates.tags));
            hasChanges = true;
        }

        if (Object.prototype.hasOwnProperty.call(updates, 'priority')) {
            Vue.set(task, 'priority', normalizePriority(updates.priority));
            hasChanges = true;
        }

        if (Object.prototype.hasOwnProperty.call(updates, 'description')) {
            Vue.set(task, 'description', typeof updates.description === 'string' ? updates.description : '');
            hasChanges = true;
        }

        if (Object.prototype.hasOwnProperty.call(updates, 'dueDate')) {
            Vue.set(task, 'dueDate', updates.dueDate || null);
            hasChanges = true;
        }

        if (Object.prototype.hasOwnProperty.call(updates, 'color')) {
            const color = typeof updates.color === 'string' && updates.color ? updates.color : 'gray';
            Vue.set(task, 'color', color);
            hasChanges = true;
        }

        if (targetColumnId !== sourceColumnId) {
            removeTaskFromColumnOrder(taskId, sourceColumnId);
            addTaskToColumnOrder(taskId, targetColumnId);
            Vue.set(task, 'columnId', targetColumnId);
            hasChanges = true;
        }

        if (hasChanges) {
            persist();
        }

        return success({ changed: hasChanges });
    },

    deleteTask(taskId) {
        const task = store.tasks[taskId];
        if (!task) {
            return failure(buildValidationError('invalid_target', 'Task not found.', 'task'));
        }

        const colId = task.columnId;

        if (store.columnTaskOrder[colId]) {
            const idx = store.columnTaskOrder[colId].indexOf(taskId);
            if (idx > -1) {
                store.columnTaskOrder[colId].splice(idx, 1);
            }
        }

        Vue.delete(store.tasks, taskId);

        if (store.activeTaskId === taskId) {
            this.closeTaskModal();
        }

        persist();
        return success();
    },

    addSubtask(taskId, text) {
        const task = store.tasks[taskId];
        if (!task) {
            return failure(buildValidationError('invalid_target', 'Task not found.', 'task'));
        }

        const normalizedText = normalizeText(text);
        if (!normalizedText) {
            return failure(buildValidationError('required', 'Subtask text is required.', 'task'));
        }

        if (!task.subtasks) {
            Vue.set(task, 'subtasks', []);
        }

        task.subtasks.push({
            text: normalizedText,
            done: false
        });
        persist();
        return success();
    },

    updateSubtask(taskId, index, updates) {
        const task = store.tasks[taskId];
        if (!task || !task.subtasks || !task.subtasks[index]) {
            return failure(buildValidationError('invalid_target', 'Subtask not found.', 'task'));
        }

        const subtask = task.subtasks[index];
        Object.keys(updates || {}).forEach(key => {
            if (key === 'text') {
                Vue.set(subtask, key, normalizeText(updates[key]));
                return;
            }
            Vue.set(subtask, key, updates[key]);
        });
        persist();
        return success();
    },

    deleteSubtask(taskId, index) {
        const task = store.tasks[taskId];
        if (!task || !task.subtasks) {
            return failure(buildValidationError('invalid_target', 'Subtask not found.', 'task'));
        }

        task.subtasks.splice(index, 1);
        persist();
        return success();
    },

    reorderSubtasks(taskId, newOrder) {
        const task = store.tasks[taskId];
        if (!task || !Array.isArray(task.subtasks) || !Array.isArray(newOrder)) {
            return failure(buildValidationError('invalid_target', 'Unable to reorder subtasks.', 'task'));
        }

        const normalizedOrder = newOrder.map(item => ({
            text: normalizeText(item && item.text),
            done: !!(item && item.done)
        }));

        Vue.set(task, 'subtasks', normalizedOrder);
        persist();
        return success();
    },

    scheduleTask(taskId, dateString) {
        const task = store.tasks[taskId];
        if (!task) {
            return failure(buildValidationError('invalid_target', 'Task not found.', 'task'));
        }

        Vue.set(task, 'dueDate', dateString || null);
        persist();
        return success();
    },

    setTaskPriority(taskId, priorityOrNull) {
        const task = store.tasks[taskId];
        if (!task) {
            return failure(buildValidationError('invalid_target', 'Task not found.', 'task'));
        }

        const normalized = normalizePriority(priorityOrNull);
        Vue.set(task, 'priority', normalized);
        persist();
        return success();
    },

    toggleTagFilter(tag) {
        if (!store.activeFilters || !Array.isArray(store.activeFilters.tags)) {
            Vue.set(store, 'activeFilters', getDefaultActiveFilters());
        }

        const index = store.activeFilters.tags.indexOf(tag);
        if (index > -1) {
            store.activeFilters.tags.splice(index, 1);
        } else {
            store.activeFilters.tags.push(tag);
        }
        persist();
        return success();
    },

    togglePriorityFilter(priority) {
        if (!PRIORITY_VALUES.includes(priority)) {
            return failure(buildValidationError('invalid_target', 'Invalid priority filter.', 'task'));
        }

        if (!store.activeFilters || !Array.isArray(store.activeFilters.priorities)) {
            Vue.set(store, 'activeFilters', getDefaultActiveFilters());
        }

        const index = store.activeFilters.priorities.indexOf(priority);
        if (index > -1) {
            store.activeFilters.priorities.splice(index, 1);
        } else {
            store.activeFilters.priorities.push(priority);
        }
        persist();
        return success();
    },

    // Backward-compat alias for legacy component calls.
    toggleFilter(tag) {
        return this.toggleTagFilter(tag);
    },

    clearFilters() {
        store.activeFilters = getDefaultActiveFilters();
        persist();
        return success();
    },

    deleteAllData() {
        initializeDefaultData();
        persistNow();
        return success();
    },

    openDialog(config = {}) {
        const variant = config.variant === 'prompt' ? 'prompt' : 'confirm';
        const inputConfig = config.input || {};
        const initialInputValue = typeof config.initialValue === 'string'
            ? config.initialValue
            : (typeof inputConfig.value === 'string' ? inputConfig.value : '');

        const nextState = cloneDialogState({
            isOpen: true,
            variant,
            title: typeof config.title === 'string' ? config.title : '',
            message: typeof config.message === 'string' ? config.message : '',
            confirmLabel: typeof config.confirmLabel === 'string' && config.confirmLabel
                ? config.confirmLabel
                : (variant === 'prompt' ? 'Save' : 'Confirm'),
            cancelLabel: typeof config.cancelLabel === 'string' && config.cancelLabel ? config.cancelLabel : 'Cancel',
            destructive: !!config.destructive,
            input: {
                enabled: variant === 'prompt' || !!inputConfig.enabled,
                value: initialInputValue,
                placeholder: typeof inputConfig.placeholder === 'string' ? inputConfig.placeholder : '',
                maxLength: typeof inputConfig.maxLength === 'number' ? inputConfig.maxLength : null
            },
            action: {
                type: config.action && typeof config.action.type === 'string' ? config.action.type : '',
                payload: config.action && config.action.payload ? config.action.payload : null
            },
            error: ''
        });

        applyDialogState(nextState);
        return success();
    },

    closeDialog() {
        applyDialogState(getDefaultDialogState());
        return success();
    },

    setDialogInput(value) {
        Vue.set(store.dialog.input, 'value', typeof value === 'string' ? value : '');
        Vue.set(store.dialog, 'error', '');
        return success();
    },

    confirmDialog() {
        if (!store.dialog.isOpen) {
            return failure(buildValidationError('invalid_target', 'No dialog is currently open.', 'dialog'));
        }

        const action = store.dialog.action || {};
        let result = failure(buildValidationError('invalid_target', 'Unknown dialog action.', 'dialog'));

        switch (action.type) {
        case 'workspace.create':
            result = this.addWorkspace(store.dialog.input.value);
            break;
        case 'workspace.rename':
            result = this.updateWorkspace(action.payload && action.payload.workspaceId, store.dialog.input.value);
            break;
        case 'workspace.delete':
            result = this.deleteWorkspace(action.payload && action.payload.workspaceId);
            break;
        case 'column.delete':
            result = this.deleteColumn(action.payload && action.payload.columnId);
            break;
        case 'task.delete':
            result = this.deleteTask(action.payload && action.payload.taskId);
            break;
        case 'app.resetAll':
            result = this.deleteAllData();
            break;
        default:
            break;
        }

        if (!result.ok) {
            setDialogError(result.error && result.error.message ? result.error.message : 'Unable to complete this action.');
            return result;
        }

        this.closeDialog();
        return result;
    },

    pushToast(config = {}) {
        const message = typeof config.message === 'string' ? config.message.trim() : '';
        if (!message) {
            return failure(buildValidationError('required', 'Toast message is required.', 'toast'));
        }

        const variant = ['success', 'error', 'warning', 'info'].includes(config.variant) ? config.variant : 'info';
        const timeoutMs = typeof config.timeoutMs === 'number' && config.timeoutMs > 0 ? config.timeoutMs : 4000;
        const dismissible = config.dismissible !== false;
        const id = generateId('toast');

        store.toasts.push({
            id,
            variant,
            message,
            timeoutMs,
            dismissible
        });

        return success({ toastId: id });
    },

    dismissToast(toastId) {
        const index = store.toasts.findIndex(toast => toast.id === toastId);
        if (index > -1) {
            store.toasts.splice(index, 1);
        }
        return success();
    },

    clearToasts() {
        Vue.set(store, 'toasts', []);
        return success();
    }
};

export function hydrate(inputData = null) {
    try {
        let data = inputData;
        if (!data) {
            const raw = localStorage.getItem(STORAGE_KEY);
            if (raw) {
                data = JSON.parse(raw);
            }
        }

        if (data) {

            // Restore top-level primitives
            store.appVersion = '1.2';
            store.theme = data.theme || 'light';
            store.currentWorkspaceId = data.currentWorkspaceId;

            // Reset transient UI state (only needed for pre-1.2 data that included these)
            store.activeTaskId = null;
            store.taskModalMode = null;
            store.taskModalDraft = null;

            // Migration: legacy activeFilter (array) → activeFilters.tags (v1.0 → v1.1)
            const legacyTags = Array.isArray(data.activeFilter) ? data.activeFilter : [];
            const nextActiveFilters = data.activeFilters || {};
            const rawTags = Array.isArray(nextActiveFilters.tags) ? nextActiveFilters.tags : legacyTags;
            const nextTags = [...new Set(rawTags.filter(tag => typeof tag === 'string' && tag.length > 0))];
            const rawPriorities = Array.isArray(nextActiveFilters.priorities) ? nextActiveFilters.priorities : [];
            const nextPriorities = [...new Set(rawPriorities.filter(priority => PRIORITY_VALUES.includes(priority)))];

            store.activeFilters = {
                tags: nextTags,
                priorities: nextPriorities
            };

            // Restore workspaces (array is reactive)
            store.workspaces = data.workspaces || [];

            // Restore nested objects using Vue.set to ensure reactivity is maintained/re-established
            // Although Object.assign(store, data) might work, explicit Vue.set is safer for nested observers

            // Columns
            store.columns = {};
            if (data.columns) {
                Object.keys(data.columns).forEach(key => {
                    const col = data.columns[key];
                    if (col.showCompleted === undefined) {
                        col.showCompleted = false;
                    }
                    Vue.set(store.columns, key, col);
                });
            }

            // Tasks
            store.tasks = {};
            if (data.tasks) {
                Object.keys(data.tasks).forEach(key => {
                    const task = data.tasks[key];
                    if (task.isCompleted && !task.completedAt) {
                        task.completedAt = task.createdAt;
                    }
                    if (task.completedAt === undefined) {
                        task.completedAt = null;
                    }
                    if (!Array.isArray(task.tags)) {
                        task.tags = [];
                    }
                    if (task.description === undefined || task.description === null) {
                        task.description = '';
                    }
                    if (!Array.isArray(task.subtasks)) {
                        task.subtasks = [];
                    }
                    if (task.color === undefined || task.color === null || task.color === '') {
                        task.color = 'gray';
                    }
                    if (!task.title || typeof task.title !== 'string') {
                        task.title = 'Untitled Task';
                    }

                    const titleValidation = validateName('task', task.title);
                    task.title = titleValidation.ok ? titleValidation.value : 'Untitled Task';
                    task.priority = normalizePriority(task.priority);
                    task.tags = normalizeTagList(task.tags);
                    Vue.set(store.tasks, key, task);
                });
            }

            const fallbackColumnId = getDefaultColumnId(store.currentWorkspaceId) || getDefaultColumnId();
            Object.keys(store.tasks).forEach(taskId => {
                const task = store.tasks[taskId];
                if (!store.columns[task.columnId]) {
                    task.columnId = fallbackColumnId;
                }
            });

            // ColumnTaskOrder: rebuild from valid columns/tasks to keep tasks tied to real columns.
            const rebuiltOrder = {};
            Object.keys(store.columns).forEach(columnId => {
                rebuiltOrder[columnId] = [];
            });

            const seenTaskIds = new Set();
            if (data.columnTaskOrder) {
                Object.keys(data.columnTaskOrder).forEach(columnId => {
                    if (!rebuiltOrder[columnId]) return;
                    const rawOrder = Array.isArray(data.columnTaskOrder[columnId]) ? data.columnTaskOrder[columnId] : [];
                    rawOrder.forEach(taskId => {
                        if (typeof taskId !== 'string' || seenTaskIds.has(taskId)) return;
                        const task = store.tasks[taskId];
                        if (!task || task.columnId !== columnId) return;
                        rebuiltOrder[columnId].push(taskId);
                        seenTaskIds.add(taskId);
                    });
                });
            }

            Object.keys(store.tasks).forEach(taskId => {
                if (seenTaskIds.has(taskId)) return;
                const task = store.tasks[taskId];
                if (!task || !task.columnId || !rebuiltOrder[task.columnId]) return;
                rebuiltOrder[task.columnId].push(taskId);
                seenTaskIds.add(taskId);
            });

            store.columnTaskOrder = {};
            Object.keys(rebuiltOrder).forEach(columnId => {
                Vue.set(store.columnTaskOrder, columnId, rebuiltOrder[columnId]);
            });

        } else {
            initializeDefaultData();
        }

        // Validate: ensure currentWorkspaceId points to an existing workspace
        if (store.workspaces.length && !store.workspaces.find(w => w.id === store.currentWorkspaceId)) {
            store.currentWorkspaceId = store.workspaces[0].id;
        } else if (!store.workspaces.length) {
            initializeDefaultData();
        }

        pruneActiveTagFiltersForWorkspace(store.currentWorkspaceId);
        resetDialogAndToasts();
    } catch (e) {
        console.error('Corruption detected, resetting', e);
        initializeDefaultData();
    }
}
