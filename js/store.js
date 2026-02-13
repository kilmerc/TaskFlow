import { generateId } from './utils/id.js';
import { parseTagsFromTitle, normalizeTagList } from './utils/tagParser.js';
import { PRIORITY_VALUES, normalizePriority } from './utils/taskFilters.js';


const STORAGE_KEY = 'taskflow_data';

export const store = Vue.observable({
    appVersion: '1.1',
    theme: 'light',
    currentWorkspaceId: null,
    workspaces: [],
    columns: {},
    tasks: {},
    columnTaskOrder: {},
    activeFilters: {
        tags: [],
        priorities: []
    },
    activeTaskId: null,
    taskModalMode: null,
    taskModalDraft: null,
    storageWarning: null // Message if limit approached/exceeded
});

function persistSnapshot() {
    try {
        const snapshot = JSON.stringify(store);

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
    store.activeFilters = {
        tags: [],
        priorities: []
    };
    store.activeTaskId = null;
    store.taskModalMode = null;
    store.taskModalDraft = null;
    persist();
}

export const mutations = {
    addWorkspace(name) {
        const id = generateId('ws');
        const col1 = generateId('col');
        const col2 = generateId('col');
        const col3 = generateId('col');

        const newWorkspace = {
            id,
            name,
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
        persist();
    },

    deleteWorkspace(workspaceId) {
        const wsIndex = store.workspaces.findIndex(w => w.id === workspaceId);
        if (wsIndex === -1) return;

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
        persist();
    },

    updateWorkspace(workspaceId, name) {
        const ws = store.workspaces.find(w => w.id === workspaceId);
        if (ws) {
            ws.name = name;
            persist();
        }
    },

    switchWorkspace(workspaceId) {
        store.currentWorkspaceId = workspaceId;
        persist();
    },

    addColumn(workspaceId, title) {
        const id = generateId('col');
        const ws = getWorkspace(workspaceId);
        const normalizedTitle = typeof title === 'string' ? title.trim() : '';
        if (!ws || !normalizedTitle) return null;

        Vue.set(store.columns, id, { id, workspaceId, title: normalizedTitle, showCompleted: false });
        Vue.set(store.columnTaskOrder, id, []);
        ws.columns.push(id);
        persist();
        return id;
    },

    updateColumn(columnId, title) {
        if (store.columns[columnId]) {
            store.columns[columnId].title = title;
            persist();
        }
    },

    deleteColumn(columnId) {
        const col = store.columns[columnId];
        if (!col) return;

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
        persist();
    },

    reorderColumns(workspaceId, newOrder) {
        const ws = store.workspaces.find(w => w.id === workspaceId);
        if (ws) {
            ws.columns = newOrder;
            persist();
        }
    },

    addTask(columnId, rawTitle) {
        const { title, tags } = parseTagsFromTitle(rawTitle);
        if (!title) return null;
        return this.createTask({
            columnId,
            title,
            tags
        });
    },

    createTask(payload) {
        const input = payload && typeof payload === 'object' ? payload : {};
        const title = typeof input.title === 'string' ? input.title.trim() : '';
        const columnId = typeof input.columnId === 'string' ? input.columnId : null;

        if (!title || !columnId || !store.columns[columnId]) {
            return null;
        }

        const id = generateId('task');
        const newTask = {
            id,
            columnId,
            title,
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

        // Add to global task map
        Vue.set(store.tasks, id, newTask);

        // Add to column order
        addTaskToColumnOrder(id, columnId);

        persist();
        return id;
    },

    moveTask(taskId, sourceColId, targetColId, newIndex) {
        const task = store.tasks[taskId];
        if (!task) return;

        // Remove from source column
        const sourceOrder = store.columnTaskOrder[sourceColId];
        const sourceIndex = sourceOrder.indexOf(taskId);
        if (sourceIndex > -1) {
            sourceOrder.splice(sourceIndex, 1);
        }

        // Update task columnId if changed
        if (sourceColId !== targetColId) {
            task.columnId = targetColId;
        }

        // Add to target column at specific index
        const targetOrder = store.columnTaskOrder[targetColId];
        // If newIndex is missing (e.g. appended), push
        if (typeof newIndex === 'number') {
            targetOrder.splice(newIndex, 0, taskId);
        } else {
            targetOrder.push(taskId);
        }

        persist();
    },

    updateColumnTaskOrder(columnId, newOrder) {
        Vue.set(store.columnTaskOrder, columnId, newOrder);
        persist();
    },

    toggleTaskCompletion(taskId) {
        const task = store.tasks[taskId];
        if (!task) return;

        const isCompleted = !task.isCompleted;
        Vue.set(task, 'isCompleted', isCompleted);
        Vue.set(task, 'completedAt', isCompleted ? new Date().toISOString() : null);
        persist();
    },

    toggleColumnShowCompleted(columnId) {
        const col = store.columns[columnId];
        if (!col) return;

        Vue.set(col, 'showCompleted', !col.showCompleted);
        persist();
    },

    setActiveTask(taskId) {
        if (!taskId || !store.tasks[taskId]) {
            this.closeTaskModal();
            return;
        }
        store.activeTaskId = taskId;
        store.taskModalMode = 'edit';
        store.taskModalDraft = null;
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
    },

    closeTaskModal() {
        store.activeTaskId = null;
        store.taskModalMode = null;
        store.taskModalDraft = null;
    },

    updateTask(taskId, updates) {
        const task = store.tasks[taskId];
        if (!task || !updates || typeof updates !== 'object') return;

        const sourceColumnId = task.columnId;
        let targetColumnId = sourceColumnId;
        let hasChanges = false;

        Object.keys(updates).forEach(key => {
            if (key === 'columnId') {
                const nextColumnId = updates[key];
                if (
                    typeof nextColumnId === 'string' &&
                    store.columns[nextColumnId] &&
                    nextColumnId !== sourceColumnId
                ) {
                    targetColumnId = nextColumnId;
                }
                return;
            }

            if (key === 'title') {
                const nextTitle = typeof updates[key] === 'string' ? updates[key].trim() : '';
                if (!nextTitle || nextTitle === task.title) return;
                Vue.set(task, key, nextTitle);
                hasChanges = true;
                return;
            }

            if (key === 'tags') {
                Vue.set(task, key, normalizeTagList(updates[key]));
                hasChanges = true;
                return;
            }

            if (key === 'priority') {
                Vue.set(task, key, normalizePriority(updates[key]));
                hasChanges = true;
                return;
            }

            if (key === 'description') {
                Vue.set(task, key, typeof updates[key] === 'string' ? updates[key] : '');
                hasChanges = true;
                return;
            }

            if (key === 'dueDate') {
                Vue.set(task, key, updates[key] || null);
                hasChanges = true;
                return;
            }

            Vue.set(task, key, updates[key]);
            hasChanges = true;
        });

        if (targetColumnId !== sourceColumnId) {
            removeTaskFromColumnOrder(taskId, sourceColumnId);
            addTaskToColumnOrder(taskId, targetColumnId);
            Vue.set(task, 'columnId', targetColumnId);
            hasChanges = true;
        }

        if (hasChanges) {
            persist();
        }
    },

    deleteTask(taskId) {
        const task = store.tasks[taskId];
        if (!task) return;

        const colId = task.columnId;

        // Remove from column order
        if (store.columnTaskOrder[colId]) {
            const idx = store.columnTaskOrder[colId].indexOf(taskId);
            if (idx > -1) {
                store.columnTaskOrder[colId].splice(idx, 1);
            }
        }

        // Delete task
        Vue.delete(store.tasks, taskId);

        // If it was active, close modal
        if (store.activeTaskId === taskId) {
            this.closeTaskModal();
        }

        persist();
    },

    addSubtask(taskId, text) {
        const task = store.tasks[taskId];
        if (!task) return;

        if (!task.subtasks) {
            Vue.set(task, 'subtasks', []);
        }

        task.subtasks.push({
            text: text,
            done: false
        });
        persist();
    },

    updateSubtask(taskId, index, updates) {
        const task = store.tasks[taskId];
        if (!task || !task.subtasks || !task.subtasks[index]) return;

        const subtask = task.subtasks[index];
        Object.keys(updates).forEach(key => {
            Vue.set(subtask, key, updates[key]);
        });
        persist();
    },

    deleteSubtask(taskId, index) {
        const task = store.tasks[taskId];
        if (!task || !task.subtasks) return;

        task.subtasks.splice(index, 1);
        persist();
    },

    reorderSubtasks(taskId, newOrder) {
        const task = store.tasks[taskId];
        if (!task || !Array.isArray(task.subtasks) || !Array.isArray(newOrder)) return;

        const normalizedOrder = newOrder.map(item => ({
            text: typeof item.text === 'string' ? item.text : String(item && item.text != null ? item.text : ''),
            done: !!(item && item.done)
        }));

        Vue.set(task, 'subtasks', normalizedOrder);
        persist();
    },

    scheduleTask(taskId, dateString) {
        const task = store.tasks[taskId];
        if (task) {
            Vue.set(task, 'dueDate', dateString);
            persist();
        }
    },

    setTaskPriority(taskId, priorityOrNull) {
        const task = store.tasks[taskId];
        if (!task) return;

        const normalized = normalizePriority(priorityOrNull);
        Vue.set(task, 'priority', normalized);
        persist();
    },

    toggleTagFilter(tag) {
        if (!store.activeFilters || !Array.isArray(store.activeFilters.tags)) {
            Vue.set(store, 'activeFilters', { tags: [], priorities: [] });
        }

        const index = store.activeFilters.tags.indexOf(tag);
        if (index > -1) {
            store.activeFilters.tags.splice(index, 1);
        } else {
            store.activeFilters.tags.push(tag);
        }
        persist();
    },

    togglePriorityFilter(priority) {
        if (!PRIORITY_VALUES.includes(priority)) return;

        if (!store.activeFilters || !Array.isArray(store.activeFilters.priorities)) {
            Vue.set(store, 'activeFilters', { tags: [], priorities: [] });
        }

        const index = store.activeFilters.priorities.indexOf(priority);
        if (index > -1) {
            store.activeFilters.priorities.splice(index, 1);
        } else {
            store.activeFilters.priorities.push(priority);
        }
        persist();
    },

    // Backward-compat alias for legacy component calls.
    toggleFilter(tag) {
        this.toggleTagFilter(tag);
    },

    clearFilters() {
        store.activeFilters = {
            tags: [],
            priorities: []
        };
        persist();
    },

    deleteAllData() {
        // Reset to default state
        initializeDefaultData();
        // Force immediate persist to avoid stale state after reload
        persistNow();
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
            store.appVersion = '1.1';
            store.theme = data.theme || 'light';
            store.currentWorkspaceId = data.currentWorkspaceId;
            store.activeTaskId = null;
            store.taskModalMode = null;
            store.taskModalDraft = null;

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
    } catch (e) {
        console.error('Corruption detected, resetting', e);
        initializeDefaultData();
    }
}
