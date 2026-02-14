import { store, mutations } from '../store.js';
import { taskMatchesFilters } from '../utils/taskFilters.js';

const CalendarSidebar = {
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
                item-key="id"
                :group="{ name: 'calendar', pull: 'clone', put: true }"
                :sort="false"
                @change="onSidebarDrop"
            >
                <template #item="{ element: task }">
                    <div
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
                </template>

                <template #footer>
                    <div v-if="unscheduledTasks.length === 0" class="empty-state-text">
                        All tasks scheduled!
                    </div>
                </template>
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
                return { searchQuery: '' };
            }
            return this.store.workspaceViewState[this.workspace.id]
                || { searchQuery: '' };
        },
        searchQuery() {
            return this.workspaceViewState.searchQuery || '';
        },
        workspaceTaskIds() {
            if (!this.workspace || !Array.isArray(this.workspace.columns)) {
                return [];
            }

            const ids = [];
            this.workspace.columns.forEach(columnId => {
                const orderedTaskIds = this.store.columnTaskOrder[columnId] || [];
                ids.push(...orderedTaskIds);
            });
            return ids;
        },
        unscheduledTasks() {
            // Return tasks in the active workspace where dueDate is null.
            return this.workspaceTaskIds
                .map(taskId => this.store.tasks[taskId])
                .filter(t => {
                    if (!t) return false;
                    if (t.dueDate) return false;
                    if (t.isCompleted) return false;
                    return taskMatchesFilters(t, this.activeFilters, this.searchQuery);
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
};

export default CalendarSidebar;

