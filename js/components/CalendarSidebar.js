import { mutations } from '../store.js';
import { useWorkspaceTaskContext } from '../composables/useWorkspaceTaskContext.js';

const { computed } = Vue;

const CalendarSidebar = {
    name: 'CalendarSidebar',
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
    setup(props) {
        const context = useWorkspaceTaskContext(computed(() => props.workspace));

        const unscheduledTasks = computed(() => {
            return context.workspaceTaskIds.value
                .map(taskId => context.workspaceTasks.value.find(task => task.id === taskId))
                .filter(t => {
                    if (!t) return false;
                    if (t.dueDate) return false;
                    if (t.isCompleted) return false;
                    return context.matchesWorkspaceFilters(t);
                });
        });

        function openTask(task) {
            mutations.setActiveTask(task.id);
        }

        function toggleTaskCompletion(taskId) {
            mutations.toggleTaskCompletion(taskId);
        }

        function onSidebarDrop(event) {
            if (event.added) {
                const task = event.added.element;
                mutations.scheduleTask(task.id, null);
            }
        }

        return {
            unscheduledTasks,
            openTask,
            toggleTaskCompletion,
            onSidebarDrop
        };
    }
};

export default CalendarSidebar;
