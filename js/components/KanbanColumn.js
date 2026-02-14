import { store, mutations } from '../store.js';
import { printColumn } from '../utils/print.js';
import { hasActiveFilters, taskMatchesFilters } from '../utils/taskFilters.js';

const KanbanColumn = {
    props: {
        columnId: {
            type: String,
            required: true
        }
    },
    template: `
        <div class="kanban-column">
            <kanban-column-header
                :column-id="columnId"
                @print="printList"
                @quick-add="openQuickAdd"
            ></kanban-column-header>

            <div class="task-list">
                <kanban-quick-add
                    ref="quickAdd"
                    :column-id="columnId"
                    :show-trigger="false"
                    insert-position="top"
                ></kanban-quick-add>

                <draggable
                    v-model="displayTasks"
                    :item-key="item => item"
                    group="tasks"
                    class="task-list-draggable"
                    ghost-class="task-ghost"
                    drag-class="task-drag"
                    :animation="150"
                    :draggable="'.sortable-task'"
                >
                    <template #item="{ element: taskId }">
                        <task-card
                            :key="taskId"
                            :task-id="taskId"
                            class="sortable-task"
                        ></task-card>
                    </template>

                    <template #footer>
                        <div class="column-drop-spacer" aria-hidden="true"></div>
                    </template>
                </draggable>

                <div v-if="completedCount > 0" class="completed-section">
                    <button type="button" class="completed-toggle" @click="toggleShowCompleted" :aria-expanded="showCompleted ? 'true' : 'false'">
                        <i class="fas" :class="showCompleted ? 'fa-chevron-down' : 'fa-chevron-right'"></i>
                        <span>{{ completedCount }} completed</span>
                    </button>
                    <div v-if="showCompleted" class="completed-tasks-list">
                        <task-card
                            v-for="taskId in completedTasks"
                            :key="taskId"
                            :task-id="taskId"
                        ></task-card>
                    </div>
                </div>
            </div>
        </div>
    `,
    data() {
        return {
            sharedStore: store
        };
    },
    computed: {
        column() {
            return this.sharedStore.columns[this.columnId] || {};
        },
        activeFilters() {
            return this.sharedStore.activeFilters || { tags: [], priorities: [] };
        },
        workspaceViewState() {
            if (!this.sharedStore.currentWorkspaceId) {
                return { searchQuery: '' };
            }
            return this.sharedStore.workspaceViewState[this.sharedStore.currentWorkspaceId]
                || { searchQuery: '' };
        },
        searchQuery() {
            return this.workspaceViewState.searchQuery || '';
        },
        hasFilters() {
            return hasActiveFilters(this.activeFilters);
        },
        hasSearchQuery() {
            return this.searchQuery.length > 0;
        },
        filteredTaskIds() {
            const allTasks = this.sharedStore.columnTaskOrder[this.columnId] || [];
            if (!this.hasFilters && !this.hasSearchQuery) return allTasks;

            return allTasks.filter(taskId => {
                const task = this.sharedStore.tasks[taskId];
                return taskMatchesFilters(task, this.activeFilters, this.searchQuery);
            });
        },
        displayTasks: {
            get() {
                const activeTaskIds = this.filteredTaskIds.filter(taskId => {
                    const task = this.sharedStore.tasks[taskId];
                    return task && !task.isCompleted;
                });
                return activeTaskIds;
            },
            set(value) {
                const nextVisibleOrder = Array.isArray(value) ? value : [];

                // Handle cross-column moves first so all dragged tasks belong to this column.
                nextVisibleOrder.forEach(taskId => {
                    const task = this.sharedStore.tasks[taskId];
                    if (task && task.columnId !== this.columnId) {
                        mutations.moveTask(taskId, task.columnId, this.columnId);
                    }
                });

                // Merge visible reorder into full active order while preserving hidden task placement.
                const columnOrder = this.sharedStore.columnTaskOrder[this.columnId] || [];
                const activeIds = [];
                const completedIds = [];
                columnOrder.forEach(taskId => {
                    const task = this.sharedStore.tasks[taskId];
                    if (!task) {
                        return;
                    }
                    if (task.isCompleted) {
                        completedIds.push(taskId);
                    } else {
                        activeIds.push(taskId);
                    }
                });

                const activeSet = new Set(activeIds);
                const seenVisible = new Set();
                const reorderedVisible = [];
                nextVisibleOrder.forEach(taskId => {
                    if (!activeSet.has(taskId) || seenVisible.has(taskId)) {
                        return;
                    }
                    seenVisible.add(taskId);
                    reorderedVisible.push(taskId);
                });

                if (reorderedVisible.length === 0) {
                    mutations.updateColumnTaskOrder(this.columnId, [...activeIds, ...completedIds]);
                    return;
                }

                let visibleIndex = 0;
                const reorderedVisibleSet = new Set(reorderedVisible);
                const mergedActiveIds = activeIds.map(taskId => {
                    if (!reorderedVisibleSet.has(taskId)) {
                        return taskId;
                    }
                    const nextTaskId = reorderedVisible[visibleIndex];
                    visibleIndex += 1;
                    return nextTaskId;
                });

                mutations.updateColumnTaskOrder(this.columnId, [...mergedActiveIds, ...completedIds]);
            }
        },
        completedTasks() {
            return this.filteredTaskIds
                .filter(taskId => {
                    const task = this.sharedStore.tasks[taskId];
                    return task && task.isCompleted;
                })
                .sort((a, b) => {
                    const aTask = this.sharedStore.tasks[a];
                    const bTask = this.sharedStore.tasks[b];
                    const aTime = Date.parse(aTask.completedAt || 0);
                    const bTime = Date.parse(bTask.completedAt || 0);
                    return bTime - aTime;
                });
        },
        showCompleted() {
            return this.column.showCompleted || false;
        },
        completedCount() {
            return this.completedTasks.length;
        }
    },
    methods: {
        toggleShowCompleted() {
            mutations.toggleColumnShowCompleted(this.columnId);
        },
        openQuickAdd() {
            if (this.$refs.quickAdd && typeof this.$refs.quickAdd.startAddingTask === 'function') {
                this.$refs.quickAdd.startAddingTask();
            }
        },
        printList() {
            const allIds = [...this.displayTasks, ...this.completedTasks];
            const tasks = allIds.map(id => this.sharedStore.tasks[id]).filter(t => t);
            printColumn(this.column, tasks);
        }
    }
};

export default KanbanColumn;

