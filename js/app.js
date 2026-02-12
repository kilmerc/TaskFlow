// Wait for DOM to be ready
document.addEventListener('DOMContentLoaded', () => {
    // Initialize Store
    if (window.StoreActions) {
        window.StoreActions.hydrate();
    }

    // Initialize Vue App
    new Vue({
        el: '#app',
        data: {
            sharedState: window.store
        },
        template: `
            <div id="app">
                <header class="app-header" style="height: var(--header-height); border-bottom: 1px solid var(--border-color); display: flex; align-items: center; padding: 0 1rem; justify-content: space-between;">
                    <h1 style="font-size: 1.2rem; font-weight: 600;">TaskFlow</h1>
                    
                    <div class="actions">
                        <button class="btn" @click="toggleTheme">
                            <i class="fas" :class="themeIcon"></i>
                        </button>
                    </div>
                </header>
                
                <main style="flex: 1; padding: 1rem;">
                    <div v-if="sharedState.workspaces.length === 0">
                        Loading...
                    </div>
                    <div v-else>
                        <p>Current Workspace: {{ currentWorkspaceName }}</p>
                        <p>Columns: {{ currentColumns.length }}</p>
                    </div>
                </main>
            </div>
        `,
        computed: {
            themeIcon() {
                return this.sharedState.theme === 'dark' ? 'fa-sun' : 'fa-moon';
            },
            currentWorkspace() {
                return this.sharedState.workspaces.find(ws => ws.id === this.sharedState.currentWorkspaceId);
            },
            currentWorkspaceName() {
                return this.currentWorkspace ? this.currentWorkspace.name : 'None';
            },
            currentColumns() {
                if (!this.currentWorkspace) return [];
                return this.currentWorkspace.columns.map(id => this.sharedState.columns[id]).filter(Boolean);
            }
        },
        methods: {
            toggleTheme() {
                const newTheme = this.sharedState.theme === 'dark' ? 'light' : 'dark';
                window.StoreActions.setTheme(newTheme);
            }
        }
    });
});
