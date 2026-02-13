import { store, hydrate, persist, mutations } from './store.js';
import { exportData, importData } from './utils/io.js';

// Global directives
import './directives/clickOutside.js';

// Import components for side-effects (global registration)
// Subcomponents must be imported before their parent components
import './components/KanbanColumnHeader.js';
import './components/KanbanQuickAdd.js';
import './components/TaskModalColumnPicker.js';
import './components/TaskModalTagEditor.js';
import './components/TaskModalSubtasks.js';
import './components/WorkspaceSwitcher.js';
import './components/KanbanBoard.js';
import './components/KanbanColumn.js';
import './components/CalendarView.js';
import './components/CalendarSidebar.js';
import './components/EisenhowerView.js';
import './components/TaskCard.js';
import './components/TaskModal.js';
import './components/FilterBar.js';
import './components/AppDialog.js';
import './components/AppToast.js';

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
    mounted() {
        document.getElementById('app')?.removeAttribute('v-cloak');
    },
    methods: {
        toggleTheme() {
            this.store.theme = this.store.theme === 'dark' ? 'light' : 'dark';
            persist();
        },
        downloadBackup() {
            exportData();
        },
        triggerImport() {
            this.$refs.fileInput.click();
        },
        handleImport(event) {
            const file = event.target.files[0];
            if (file) {
                importData(file);
            }
            // Reset input so same file can be selected again if needed
            event.target.value = '';
        },
        confirmDeleteAll() {
            mutations.openDialog({
                variant: 'confirm',
                title: 'Delete all data?',
                message: 'This will permanently remove all workspaces and tasks.',
                confirmLabel: 'Delete all data',
                cancelLabel: 'Cancel',
                destructive: true,
                action: {
                    type: 'app.resetAll'
                }
            });
        }
    }
});
