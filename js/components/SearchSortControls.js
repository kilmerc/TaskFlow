import { store, mutations } from '../store.js';
import { DEFAULT_SORT_MODE } from '../utils/taskSort.js';

Vue.component('search-sort-controls', {
    data() {
        return {
            searchInput: '',
            searchDebounceMs: 200,
            searchDebounceTimer: null
        };
    },
    template: `
        <div v-if="currentWorkspaceId" class="search-sort-controls">
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

            <label class="sr-only" for="workspace-sort-mode">Sort tasks</label>
            <select
                id="workspace-sort-mode"
                class="workspace-sort-select"
                :value="sortMode"
                aria-label="Sort tasks"
                @change="onSortChange"
            >
                <option value="manual">Manual</option>
                <option value="dueDate">Due date</option>
                <option value="priority">Priority</option>
                <option value="createdAt">Created date</option>
            </select>
        </div>
    `,
    computed: {
        currentWorkspaceId() {
            return store.currentWorkspaceId;
        },
        currentWorkspaceViewState() {
            if (!this.currentWorkspaceId) {
                return { searchQuery: '', sortMode: DEFAULT_SORT_MODE };
            }
            return store.workspaceViewState[this.currentWorkspaceId]
                || { searchQuery: '', sortMode: DEFAULT_SORT_MODE };
        },
        sortMode() {
            return this.currentWorkspaceViewState.sortMode || DEFAULT_SORT_MODE;
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
    beforeDestroy() {
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
        },
        onSortChange(event) {
            if (!this.currentWorkspaceId) return;
            const sortMode = event && event.target ? event.target.value : DEFAULT_SORT_MODE;
            mutations.setWorkspaceSortMode(this.currentWorkspaceId, sortMode);
        }
    }
});
