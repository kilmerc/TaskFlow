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
    template: `
        <div id="app">
            <header class="app-header">
                <div class="header-left">
                    <h1>TaskFlow</h1>
                    <workspace-switcher></workspace-switcher>
                </div>
                <div class="header-right">
                    <filter-bar></filter-bar>
                    <theme-toggle></theme-toggle>
                </div>
            </header>
            
            <main class="app-content">
                <kanban-board v-if="currentView === 'kanban'"></kanban-board>
                <calendar-view v-else-if="currentView === 'calendar'"></calendar-view>
            </main>

            <task-modal></task-modal>
        </div>
    `,
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
