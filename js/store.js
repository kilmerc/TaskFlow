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

export function hydrate() {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (raw) {
            const data = JSON.parse(raw);
            // Deep merge or simple assign? Simple assign for top level keys is enough for now
            // But we need to be careful not to overwrite the reactive object reference if we used `store = ...`
            // Object.assign(store, data) works for Vue.observable
            Object.assign(store, data);
        } else {
            initializeDefaultData();
        }
    } catch (e) {
        console.error('Corruption detected, resetting', e);
        initializeDefaultData();
    }
}
