import { store, mutations } from '../store.js';

Vue.component('search-controls', {
    data() {
        return {
            searchInput: '',
            searchDebounceMs: 200,
            searchDebounceTimer: null
        };
    },
    template: `
        <div v-if="currentWorkspaceId" class="search-controls">
            <div class="workspace-search">
                <i class="fas fa-search" aria-hidden="true"></i>
                <input
                    type="search"
                    class="workspace-search-input"
                    v-model="searchInput"
                    placeholder="Search tasks..."
                    aria-label="Search tasks in workspace"
                    @input="onSearchInput"
                >
                <button
                    v-if="searchInput"
                    type="button"
                    class="workspace-search-clear"
                    aria-label="Clear task search"
                    title="Clear search"
                    @click="clearSearch"
                >
                    <i class="fas fa-times" aria-hidden="true"></i>
                </button>
            </div>
        </div>
    `,
    computed: {
        currentWorkspaceId() {
            return store.currentWorkspaceId;
        },
        currentWorkspaceViewState() {
            if (!this.currentWorkspaceId) {
                return { searchQuery: '' };
            }
            return store.workspaceViewState[this.currentWorkspaceId]
                || { searchQuery: '' };
        }
    },
    watch: {
        currentWorkspaceId: {
            immediate: true,
            handler() {
                this.searchInput = this.currentWorkspaceViewState.searchQuery || '';
            }
        },
        currentWorkspaceViewState: {
            deep: true,
            handler(nextValue) {
                const nextQuery = nextValue && typeof nextValue.searchQuery === 'string'
                    ? nextValue.searchQuery
                    : '';
                if (nextQuery !== this.searchInput) {
                    this.searchInput = nextQuery;
                }
            }
        }
    },
    beforeUnmount() {
        if (this.searchDebounceTimer) {
            clearTimeout(this.searchDebounceTimer);
            this.searchDebounceTimer = null;
        }
    },
    methods: {
        onSearchInput() {
            if (!this.currentWorkspaceId) return;
            if (this.searchDebounceTimer) {
                clearTimeout(this.searchDebounceTimer);
            }
            this.searchDebounceTimer = setTimeout(() => {
                mutations.setWorkspaceSearchQuery(this.currentWorkspaceId, this.searchInput);
                this.searchDebounceTimer = null;
            }, this.searchDebounceMs);
        },
        clearSearch() {
            if (!this.currentWorkspaceId) return;
            if (this.searchDebounceTimer) {
                clearTimeout(this.searchDebounceTimer);
                this.searchDebounceTimer = null;
            }
            this.searchInput = '';
            mutations.setWorkspaceSearchQuery(this.currentWorkspaceId, '');
        }
    }
});
