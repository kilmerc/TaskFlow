(function () {
    const STORAGE_KEY = 'taskflow_data';
    const DEBOUNCE_MS = 300;

    // Default State
    const defaultState = {
        appVersion: '1.0',
        theme: 'dark',
        currentWorkspaceId: null,
        workspaces: [],
        columns: {},
        tasks: {},
        columnTaskOrder: {},
        activeFilter: null
    };

    // Reactive Store
    window.store = Vue.observable({
        ...defaultState
    });

    // Persistence Logic
    let saveTimeout = null;

    window.StoreActions = {
        hydrate() {
            try {
                const raw = localStorage.getItem(STORAGE_KEY);
                if (raw) {
                    const data = JSON.parse(raw);
                    // Simple shallow merge for now, could be more robust
                    Object.keys(defaultState).forEach(key => {
                        window.store[key] = data[key] !== undefined ? data[key] : defaultState[key];
                    });
                    console.log('State hydrated:', window.store);
                } else {
                    console.log('No saved state found, using defaults.');
                    // Seed data if empty (Feature 0.3)
                    this.seedDefaults();
                }
            } catch (e) {
                console.error('Failed to hydrate state:', e);
                this.seedDefaults();
            }

            // Apply theme on load
            document.documentElement.setAttribute('data-theme', window.store.theme);
        },

        seedDefaults() {
            // Minimal seed for Phase 0/1
            // We will implement full seeding in Feature 0.3 logic or just here
            const wsId = window.IdUtils.generateId('ws');
            const col1 = window.IdUtils.generateId('col');
            const col2 = window.IdUtils.generateId('col');
            const col3 = window.IdUtils.generateId('col');

            window.store.workspaces = [{
                id: wsId,
                name: 'My Workspace',
                columns: [col1, col2, col3]
            }];

            window.store.currentWorkspaceId = wsId;

            Vue.set(window.store.columns, col1, { id: col1, workspaceId: wsId, title: 'To Do' });
            Vue.set(window.store.columns, col2, { id: col2, workspaceId: wsId, title: 'In Progress' });
            Vue.set(window.store.columns, col3, { id: col3, workspaceId: wsId, title: 'Done' });

            this.persist();
        },

        persist() {
            if (saveTimeout) clearTimeout(saveTimeout);
            saveTimeout = setTimeout(() => {
                const snapshot = JSON.stringify(window.store);
                try {
                    localStorage.setItem(STORAGE_KEY, snapshot);
                    console.log('State saved.');
                } catch (e) {
                    console.error('Save failed (quota?):', e);
                }
            }, DEBOUNCE_MS);
        },

        // Mutations
        setTheme(newTheme) {
            window.store.theme = newTheme;
            document.documentElement.setAttribute('data-theme', newTheme);
            this.persist();
        }
    };
})();
