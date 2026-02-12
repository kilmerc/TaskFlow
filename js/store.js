import { generateId } from './utils/id.js';

const STORAGE_KEY = 'taskflow_data';

export const store = Vue.observable({
    appVersion: '1.0',
    theme: 'light',
    currentWorkspaceId: null,
    workspaces: [],
    columns: {},
    tasks: {},
    columnTaskOrder: {},
    activeFilter: null
});

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

export const persist = debounce(() => {
    try {
        const snapshot = JSON.stringify(store);
        localStorage.setItem(STORAGE_KEY, snapshot);
        // Size check warning could go here
    } catch (e) {
        console.error('Failed to save to localStorage', e);
    }
}, 300);

function initializeDefaultData() {
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
        [col1]: { id: col1, workspaceId: wsId, title: 'To Do' },
        [col2]: { id: col2, workspaceId: wsId, title: 'In Progress' },
        [col3]: { id: col3, workspaceId: wsId, title: 'Done' }
    };

    store.columnTaskOrder = {
        [col1]: [],
        [col2]: [],
        [col3]: []
    };

    store.tasks = {};
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
        Vue.set(store.columns, col1, { id: col1, workspaceId: id, title: 'To Do' });
        Vue.set(store.columns, col2, { id: col2, workspaceId: id, title: 'In Progress' });
        Vue.set(store.columns, col3, { id: col3, workspaceId: id, title: 'Done' });

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
        const ws = store.workspaces.find(w => w.id === workspaceId);
        if (!ws) return;

        Vue.set(store.columns, id, { id, workspaceId, title });
        Vue.set(store.columnTaskOrder, id, []);
        ws.columns.push(id);
        persist();
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
        persist();
    },

    reorderColumns(workspaceId, newOrder) {
        const ws = store.workspaces.find(w => w.id === workspaceId);
        if (ws) {
            ws.columns = newOrder;
            persist();
        }
    }
};

export function hydrate() {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (raw) {
            const data = JSON.parse(raw);

            // Restore top-level primitives
            store.appVersion = data.appVersion;
            store.theme = data.theme;
            store.currentWorkspaceId = data.currentWorkspaceId;
            store.activeFilter = data.activeFilter; // Restore simple filter state

            // Restore workspaces (array is reactive)
            store.workspaces = data.workspaces || [];

            // Restore nested objects using Vue.set to ensure reactivity is maintained/re-established
            // Although Object.assign(store, data) might work, explicit Vue.set is safer for nested observers

            // Columns
            store.columns = {};
            if (data.columns) {
                Object.keys(data.columns).forEach(key => {
                    Vue.set(store.columns, key, data.columns[key]);
                });
            }

            // Tasks
            store.tasks = {};
            if (data.tasks) {
                Object.keys(data.tasks).forEach(key => {
                    Vue.set(store.tasks, key, data.tasks[key]);
                });
            }

            // ColumnTaskOrder
            store.columnTaskOrder = {};
            if (data.columnTaskOrder) {
                Object.keys(data.columnTaskOrder).forEach(key => {
                    Vue.set(store.columnTaskOrder, key, data.columnTaskOrder[key]);
                });
            }

        } else {
            initializeDefaultData();
        }
    } catch (e) {
        console.error('Corruption detected, resetting', e);
        initializeDefaultData();
    }
}
