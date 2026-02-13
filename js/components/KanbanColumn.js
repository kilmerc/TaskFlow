import { store, mutations } from '../store.js';
import { printColumn } from '../utils/print.js';
import { hasActiveFilters, taskMatchesFilters } from '../utils/taskFilters.js';

Vue.component('kanban-column', {
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
            ></kanban-column-header>

            <div class="task-list">
                <draggable
                    v-model="displayTasks"
                    group="tasks"
                    class="task-list-draggable"
                    ghost-class="task-ghost"
                    drag-class="task-drag"
                    :animation="150"
                    :disabled="hasFilters"
                >
                    <task-card
                        v-for="taskId in displayTasks"
                        :key="taskId"
                        :task-id="taskId"
                    ></task-card>
                </draggable>

                <kanban-quick-add :column-id="columnId"></kanban-quick-add>

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
        hasFilters() {
            return hasActiveFilters(this.activeFilters);
        },
        filteredTaskIds() {
            const allTasks = this.sharedStore.columnTaskOrder[this.columnId] || [];
            if (!this.hasFilters) return allTasks;

            return allTasks.filter(taskId => {
                const task = this.sharedStore.tasks[taskId];
                return taskMatchesFilters(task, this.activeFilters);
            });
        },
        displayTasks: {
            get() {
                return this.filteredTaskIds.filter(taskId => {
                    const task = this.sharedStore.tasks[taskId];
                    return task && !task.isCompleted;
                });
            },
            set(value) {
                if (this.hasFilters) return;

                // Handle cross-column moves: update columnId via store mutation
                value.forEach((taskId, newIndex) => {
                    const task = this.sharedStore.tasks[taskId];
                    if (task && task.columnId !== this.columnId) {
                        mutations.moveTask(taskId, task.columnId, this.columnId, newIndex);
                    }
                });

                // Set definitive order for this column (active + completed)
                const columnOrder = this.sharedStore.columnTaskOrder[this.columnId] || [];
                const completedIds = columnOrder.filter(taskId => {
                    const task = this.sharedStore.tasks[taskId];
                    return task && task.isCompleted;
                });
                mutations.updateColumnTaskOrder(this.columnId, [...value, ...completedIds]);
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
        printList() {
            const allIds = [...this.displayTasks, ...this.completedTasks];
            const tasks = allIds.map(id => this.sharedStore.tasks[id]).filter(t => t);
            printColumn(this.column, tasks);
        }
    }
});
