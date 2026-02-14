import { store, hydrate, persist, mutations } from './store.js';
import { exportData, importData } from './utils/io.js';
import { registerGlobals } from './bootstrap/registerGlobals.js';

const { ref, computed, watch, onBeforeMount, onMounted } = Vue;

const app = Vue.createApp({
    name: 'TaskFlowApp',
    setup() {
        const currentView = ref('kanban');
        const fileInput = ref(null);

        const appTheme = computed(() => store.theme);
        const currentWorkspace = computed(() => {
            return store.workspaces.find(w => w.id === store.currentWorkspaceId);
        });

        watch(appTheme, (newTheme) => {
            document.documentElement.setAttribute('data-theme', newTheme);
        }, { immediate: true });

        onBeforeMount(() => {
            console.log('App Initializing...');
            hydrate();
        });

        onMounted(() => {
            document.getElementById('app')?.removeAttribute('v-cloak');
        });

        function toggleTheme() {
            store.theme = store.theme === 'dark' ? 'light' : 'dark';
            persist();
        }

        function downloadBackup() {
            exportData();
        }

        function triggerImport() {
            if (fileInput.value) {
                fileInput.value.click();
            }
        }

        function handleImport(event) {
            const file = event.target.files[0];
            if (file) {
                importData(file);
            }
            event.target.value = '';
        }

        function confirmDeleteAll() {
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

        function openTemplateGallery() {
            mutations.openTemplateGallery();
        }

        return {
            store,
            currentView,
            appTheme,
            currentWorkspace,
            fileInput,
            toggleTheme,
            downloadBackup,
            triggerImport,
            handleImport,
            confirmDeleteAll,
            openTemplateGallery
        };
    }
});

app.config.errorHandler = function onVueError(err, vm, info) {
    console.error('Vue Error:', err, info);
};

registerGlobals(app);
app.mount('#app');
