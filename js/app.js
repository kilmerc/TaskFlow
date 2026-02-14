import { store, hydrate, persist, mutations } from './store.js';
import { exportData, importData } from './utils/io.js';
import { registerGlobals } from './bootstrap/registerGlobals.js';

const app = Vue.createApp({
    data() {
        return {
            store: store,
            currentView: 'kanban' // Start with 'kanban' default
        };
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
        },
        openTemplateGallery() {
            mutations.openTemplateGallery();
        }
    }
});

app.config.errorHandler = function onVueError(err, vm, info) {
    console.error('Vue Error:', err, info);
};

registerGlobals(app);
app.mount('#app');
