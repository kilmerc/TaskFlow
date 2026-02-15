import { store, mutations } from '../store.js';
import { useDebouncedAction } from '../composables/useDebouncedAction.js';
import { uiCopy } from '../config/uiCopy.js';

const { ref, computed, watch } = Vue;

const SearchControls = {
    name: 'SearchControls',
    template: `
        <div v-if="currentWorkspaceId" class="search-controls">
            <div class="workspace-search">
                <app-icon name="search" aria-hidden="true"></app-icon>
                <input
                    type="search"
                    class="workspace-search-input"
                    v-model="searchInput"
                    :placeholder="uiCopy.placeholders.searchTasks"
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
                    <app-icon name="x" aria-hidden="true"></app-icon>
                </button>
            </div>
        </div>
    `,
    setup() {
        const searchInput = ref('');
        const searchDebounceMs = 200;

        const currentWorkspaceId = computed(() => {
            return store.currentWorkspaceId;
        });

        const currentWorkspaceViewState = computed(() => {
            if (!currentWorkspaceId.value) {
                return { searchQuery: '' };
            }
            return store.workspaceViewState[currentWorkspaceId.value] || { searchQuery: '' };
        });

        const { schedule, cancel } = useDebouncedAction(() => {
            if (!currentWorkspaceId.value) return;
            mutations.setWorkspaceSearchQuery(currentWorkspaceId.value, searchInput.value);
        }, searchDebounceMs);

        watch(currentWorkspaceId, () => {
            searchInput.value = currentWorkspaceViewState.value.searchQuery || '';
        }, { immediate: true });

        watch(currentWorkspaceViewState, (nextValue) => {
            const nextQuery = nextValue && typeof nextValue.searchQuery === 'string'
                ? nextValue.searchQuery
                : '';
            if (nextQuery !== searchInput.value) {
                searchInput.value = nextQuery;
            }
        }, { deep: true });

        function onSearchInput() {
            if (!currentWorkspaceId.value) return;
            schedule();
        }

        function clearSearch() {
            if (!currentWorkspaceId.value) return;
            cancel();
            searchInput.value = '';
            mutations.setWorkspaceSearchQuery(currentWorkspaceId.value, '');
        }

        return {
            searchInput,
            currentWorkspaceId,
            onSearchInput,
            clearSearch,
            uiCopy
        };
    }
};

export default SearchControls;
