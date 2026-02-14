import { store } from '../store.js';
import { taskMatchesFilters } from '../utils/taskFilters.js';

export function useWorkspaceTaskContext(workspaceRef) {
    const { computed, unref } = Vue;

    const workspace = computed(() => {
        const value = unref(workspaceRef);
        return value && typeof value === 'object' ? value : null;
    });

    const workspaceId = computed(() => {
        return workspace.value && workspace.value.id ? workspace.value.id : null;
    });

    const activeFilters = computed(() => {
        return store.activeFilters || { tags: [], priorities: [] };
    });

    const workspaceViewState = computed(() => {
        if (!workspaceId.value) {
            return { searchQuery: '' };
        }
        return store.workspaceViewState[workspaceId.value] || { searchQuery: '' };
    });

    const searchQuery = computed(() => {
        return workspaceViewState.value.searchQuery || '';
    });

    const workspaceTaskIds = computed(() => {
        if (!workspace.value || !Array.isArray(workspace.value.columns)) {
            return [];
        }

        const ids = [];
        workspace.value.columns.forEach(columnId => {
            const orderedTaskIds = store.columnTaskOrder[columnId] || [];
            ids.push(...orderedTaskIds);
        });
        return ids;
    });

    const workspaceTasks = computed(() => {
        return workspaceTaskIds.value
            .map(taskId => store.tasks[taskId])
            .filter(task => !!task);
    });

    function matchesWorkspaceFilters(task) {
        return taskMatchesFilters(task, activeFilters.value, searchQuery.value);
    }

    return {
        workspace,
        workspaceId,
        activeFilters,
        workspaceViewState,
        searchQuery,
        workspaceTaskIds,
        workspaceTasks,
        matchesWorkspaceFilters
    };
}
