import { store, mutations } from '../store.js';
import { printColumn } from '../utils/print.js';
import { hasActiveFilters, taskMatchesFilters } from '../utils/taskFilters.js';

const { ref, computed } = Vue;

const KanbanColumn = {
    name: 'KanbanColumn',
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
    setup(props) {
        const quickAdd = ref(null);

        const column = computed(() => store.columns[props.columnId] || {});

        const activeFilters = computed(() => store.activeFilters || { tags: [], priorities: [] });

        const workspaceViewState = computed(() => {
            if (!store.currentWorkspaceId) {
                return { searchQuery: '' };
            }
            return store.workspaceViewState[store.currentWorkspaceId] || { searchQuery: '' };
        });

        const searchQuery = computed(() => workspaceViewState.value.searchQuery || '');
        const hasFilters = computed(() => hasActiveFilters(activeFilters.value));
        const hasSearchQuery = computed(() => searchQuery.value.length > 0);

        const filteredTaskIds = computed(() => {
            const allTasks = store.columnTaskOrder[props.columnId] || [];
            if (!hasFilters.value && !hasSearchQuery.value) return allTasks;

            return allTasks.filter(taskId => {
                const task = store.tasks[taskId];
                return taskMatchesFilters(task, activeFilters.value, searchQuery.value);
            });
        });

        const displayTasks = computed({
            get() {
                return filteredTaskIds.value.filter(taskId => {
                    const task = store.tasks[taskId];
                    return task && !task.isCompleted;
                });
            },
            set(value) {
                const nextVisibleOrder = Array.isArray(value) ? value : [];

                nextVisibleOrder.forEach(taskId => {
                    const task = store.tasks[taskId];
                    if (task && task.columnId !== props.columnId) {
                        mutations.moveTask(taskId, task.columnId, props.columnId);
                    }
                });

                const columnOrder = store.columnTaskOrder[props.columnId] || [];
                const activeIds = [];
                const completedIds = [];
                columnOrder.forEach(taskId => {
                    const task = store.tasks[taskId];
                    if (!task) return;
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
                    mutations.updateColumnTaskOrder(props.columnId, [...activeIds, ...completedIds]);
                    return;
                }

                let visibleIndex = 0;
                const reorderedVisibleSet = new Set(reorderedVisible);
                const mergedActiveIds = activeIds.map(taskId => {
                    if (!reorderedVisibleSet.has(taskId)) return taskId;
                    const nextTaskId = reorderedVisible[visibleIndex];
                    visibleIndex += 1;
                    return nextTaskId;
                });

                mutations.updateColumnTaskOrder(props.columnId, [...mergedActiveIds, ...completedIds]);
            }
        });

        const completedTasks = computed(() => {
            return filteredTaskIds.value
                .filter(taskId => {
                    const task = store.tasks[taskId];
                    return task && task.isCompleted;
                })
                .sort((a, b) => {
                    const aTask = store.tasks[a];
                    const bTask = store.tasks[b];
                    const aTime = Date.parse(aTask.completedAt || 0);
                    const bTime = Date.parse(bTask.completedAt || 0);
                    return bTime - aTime;
                });
        });

        const showCompleted = computed(() => column.value.showCompleted || false);
        const completedCount = computed(() => completedTasks.value.length);

        function toggleShowCompleted() {
            mutations.toggleColumnShowCompleted(props.columnId);
        }

        function openQuickAdd() {
            if (quickAdd.value && typeof quickAdd.value.startAddingTask === 'function') {
                quickAdd.value.startAddingTask();
            }
        }

        function printList() {
            const allIds = [...displayTasks.value, ...completedTasks.value];
            const tasks = allIds.map(id => store.tasks[id]).filter(t => t);
            printColumn(column.value, tasks);
        }

        return {
            quickAdd,
            column,
            displayTasks,
            completedTasks,
            showCompleted,
            completedCount,
            toggleShowCompleted,
            openQuickAdd,
            printList
        };
    }
};

export default KanbanColumn;
