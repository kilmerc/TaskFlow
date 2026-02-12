import { store, hydrate, persist } from './store.js';

// Import components for side-effects (global registration)
import './components/WorkspaceSwitcher.js';
import './components/KanbanBoard.js';
import './components/KanbanColumn.js';
import './components/CalendarView.js'; // Placeholder
import './components/CalendarSidebar.js'; // Placeholder
import './components/TaskCard.js'; // Placeholder
import './components/TaskModal.js'; // Placeholder
import './components/FilterBar.js'; // Placeholder
import './components/ThemeToggle.js'; // Placeholder

// Global error handler for Vue
Vue.config.errorHandler = function (err, vm, info) {
    console.error('Vue Error:', err, info);
};

// Main App instance
new Vue({
    el: '#app',
    data: {
        store: store,
        currentView: 'kanban' // Start with 'kanban' default
    },

    computed: {
        appTheme() {
            return this.store.theme;
        },
        currentWorkspace() {
            return this.store.workspaces.find(w => w.id === this.store.currentWorkspaceId);
        }
    },
    watch: {
        appTheme: {
            immediate: true,
            handler(newTheme) {
                document.documentElement.setAttribute('data-theme', newTheme);
            }
        }
    },
    created() {
        console.log('App Initializing...');
        hydrate();
    },
    methods: {
        toggleTheme() {
            this.store.theme = this.store.theme === 'dark' ? 'light' : 'dark';
            persist();
        }
    }
});
