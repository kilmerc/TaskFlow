import { store, mutations } from '../store.js';
import { taskMatchesFilters } from '../utils/taskFilters.js';
import {
    DEFAULT_SORT_MODE,
    buildWorkspaceManualRankMap,
    sortTaskObjects
} from '../utils/taskSort.js';

Vue.component('calendar-sidebar', {
    props: {
        workspace: {
            type: Object,
            required: true
        }
    },
    template: `
        <div class="calendar-sidebar">
            <div class="sidebar-header">
                <h4>Unscheduled</h4>
            </div>
            
            <draggable 
                class="sidebar-list" 
                :list="unscheduledTasks" 
                :group="{ name: 'calendar', pull: 'clone', put: true }"
                :sort="false"
                @change="onSidebarDrop"
            >
                <div 
                    v-for="task in unscheduledTasks" 
                    :key="task.id"
                    class="task-card"
                    :class="'task-color-' + (task.color || 'gray')"
                >
                    <div class="task-card-row">
                        <input
                            type="checkbox"
                            class="task-checkbox"
                            :checked="task.isCompleted"
                            @click.stop
                            @change="toggleTaskCompletion(task.id)"
                            title="Mark as complete"
                        >
                        <button
                            type="button"
                            class="task-open-btn"
                            :aria-label="'Open task ' + task.title"
                            @click="openTask(task)"
                        >
                            <div class="task-content">
                                <span class="task-title">{{ task.title }}</span>
                                <div class="task-meta" v-if="task.subtasks && task.subtasks.length > 0">
                                    <span class="meta-item">
                                        <i class="fas fa-check-square"></i> 
                                        {{ task.subtasks.filter(s => s.done).length }}/{{ task.subtasks.length }}
                                    </span>
                                </div>
                            </div>
                        </button>
                    </div>
                </div>
                
                <div v-if="unscheduledTasks.length === 0" class="empty-state-text">
                    All tasks scheduled!
                </div>
            </draggable>
        </div>
    `,
    computed: {
        store() {
            return store;
        },
        activeFilters() {
            return this.store.activeFilters || { tags: [], priorities: [] };
        },
        workspaceViewState() {
            if (!this.workspace || !this.workspace.id) {
                return { searchQuery: '', sortMode: DEFAULT_SORT_MODE };
            }
            return this.store.workspaceViewState[this.workspace.id]
                || { searchQuery: '', sortMode: DEFAULT_SORT_MODE };
        },
        searchQuery() {
            return this.workspaceViewState.searchQuery || '';
        },
        sortMode() {
            return this.workspaceViewState.sortMode || DEFAULT_SORT_MODE;
        },
        workspaceManualRankMap() {
            return buildWorkspaceManualRankMap(this.workspace, this.store.columnTaskOrder);
        },
        unscheduledTasks() {
            // Return tasks in the active workspace where dueDate is null.
            const allTasks = Object.values(this.store.tasks);
            const workspaceId = this.workspace ? this.workspace.id : null;
            const visibleTasks = allTasks.filter(t => {
                if (t.dueDate) return false;
                if (t.isCompleted) return false;

                const column = this.store.columns[t.columnId];
                if (!workspaceId || !column || column.workspaceId !== workspaceId) {
                    return false;
                }

                return taskMatchesFilters(t, this.activeFilters, this.searchQuery);
            });

            return sortTaskObjects(visibleTasks, {
                sortMode: this.sortMode,
                manualRankMap: this.workspaceManualRankMap
            });
        }
    },
    methods: {
        openTask(task) {
            mutations.setActiveTask(task.id);
        },
        toggleTaskCompletion(taskId) {
            mutations.toggleTaskCompletion(taskId);
        },
        onSidebarDrop(event) {
            if (event.added) {
                const task = event.added.element;
                // dropping into sidebar clears the due date
                mutations.scheduleTask(task.id, null);
            }
        }
    }
});
