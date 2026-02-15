import { store, mutations } from '../store.js';
import { getTagToneClass as computeTagToneClass } from '../utils/tagStyle.js';

const { computed } = Vue;

const TaskCard = {
    name: 'TaskCard',
    props: {
        taskId: {
            type: String,
            required: true
        }
    },
    template: `
        <div class="task-card" :class="[colorClass, { 'task-completed': task.isCompleted }]">
            <div class="task-card-row">
                <input
                    type="checkbox"
                    class="task-checkbox"
                    :checked="task.isCompleted"
                    @click.stop="toggleCompleted"
                    title="Mark as complete"
                >
                <button
                    type="button"
                    class="task-open-btn"
                    :aria-label="'Open task ' + task.title"
                    @click="openTask"
                >
                    <div class="task-content">
                        <span class="task-title">{{ task.title }}</span>

                        <div class="task-meta" v-if="hasMeta">
                            <span v-if="task.priority" class="priority-pill" :class="priorityClass">{{ task.priority }}</span>
                            <span v-if="task.dueDate" class="meta-item due-date" :class="{ overdue: isOverdue }">
                                <app-icon name="clock"></app-icon> {{ formattedDate }}
                            </span>
                            <span v-if="subtaskCount > 0" class="meta-item subtasks" :class="{ completed: allSubtasksDone }">
                                <app-icon name="check-square"></app-icon> {{ completedSubtasks }}/{{ subtaskCount }}
                            </span>
                        </div>

                        <div class="task-tags" v-if="task.tags && task.tags.length">
                            <span v-for="tag in task.tags" :key="tag" class="tag-pill" :class="getTagToneClass(tag)">
                                {{ tag }}
                            </span>
                        </div>

                        <div v-if="subtaskCount > 0" class="task-progress-strip" :aria-label="'Subtask progress ' + taskProgress + '%'">
                            <div class="task-progress-fill" :style="{ width: taskProgress + '%' }"></div>
                        </div>
                    </div>
                </button>
            </div>
        </div>
    `,
    setup(props) {
        const task = computed(() => {
            return store.tasks[props.taskId] || {};
        });

        const colorClass = computed(() => {
            return `task-color-${task.value.color || 'gray'}`;
        });

        const priorityClass = computed(() => {
            if (!task.value.priority) return '';
            return `priority-${String(task.value.priority).toLowerCase()}`;
        });

        const hasMeta = computed(() => {
            return task.value.priority || task.value.dueDate || (task.value.subtasks && task.value.subtasks.length > 0);
        });

        const subtaskCount = computed(() => {
            return (task.value.subtasks || []).length;
        });

        const completedSubtasks = computed(() => {
            return (task.value.subtasks || []).filter(st => st.done).length;
        });

        const allSubtasksDone = computed(() => {
            return subtaskCount.value > 0 && completedSubtasks.value === subtaskCount.value;
        });

        const taskProgress = computed(() => {
            if (!subtaskCount.value) return 0;
            return Math.round((completedSubtasks.value / subtaskCount.value) * 100);
        });

        const formattedDate = computed(() => {
            if (!task.value.dueDate) return '';
            const [year, month, day] = task.value.dueDate.split('-').map(Number);
            const date = new Date(year, month - 1, day);
            return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
        });

        const isOverdue = computed(() => {
            if (!task.value.dueDate || task.value.isCompleted) return false;
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const [year, month, day] = task.value.dueDate.split('-').map(Number);
            const due = new Date(year, month - 1, day);
            return due < today;
        });

        function toggleCompleted() {
            mutations.toggleTaskCompletion(props.taskId);
        }

        function openTask() {
            mutations.setActiveTask(props.taskId);
        }

        function getTagToneClass(tag) {
            return computeTagToneClass(tag);
        }

        return {
            task,
            colorClass,
            priorityClass,
            hasMeta,
            subtaskCount,
            completedSubtasks,
            allSubtasksDone,
            taskProgress,
            formattedDate,
            isOverdue,
            toggleCompleted,
            openTask,
            getTagToneClass
        };
    }
};

export default TaskCard;
