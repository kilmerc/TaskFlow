import { store, mutations } from '../store.js';

Vue.component('task-card', {
    props: {
        taskId: {
            type: String,
            required: true
        }
    },
    template: `
        <div class="task-card" :class="[colorClass, { 'task-completed': task.isCompleted }]" @click="openTask">
            <div class="task-card-row">
                <input
                    type="checkbox"
                    class="task-checkbox"
                    :checked="task.isCompleted"
                    @click.stop="toggleCompleted"
                    title="Mark as complete"
                >
                <div class="task-content">
                    <span class="task-title">{{ task.title }}</span>

                    <div class="task-priority-row" v-if="task.priority">
                        <span class="priority-pill" :class="priorityClass">{{ task.priority }}</span>
                    </div>
                    
                    <div class="task-meta" v-if="hasMeta">
                        <span v-if="task.dueDate" class="meta-item due-date" :class="{ overdue: isOverdue }">
                            <i class="far fa-clock"></i> {{ formattedDate }}
                        </span>
                        <span v-if="subtaskCount > 0" class="meta-item subtasks" :class="{ completed: allSubtasksDone }">
                            <i class="fas fa-check-square"></i> {{ completedSubtasks }}/{{ subtaskCount }}
                        </span>
                    </div>

                    <div class="task-tags" v-if="task.tags && task.tags.length">
                        <span v-for="tag in task.tags" :key="tag" class="tag-pill" :style="getTagStyle(tag)">
                            {{ tag }}
                        </span>
                    </div>
                </div>
            </div>
        </div>
    `,
    computed: {
        task() {
            return store.tasks[this.taskId] || {};
        },
        colorClass() {
            return `task-color-${this.task.color || 'gray'}`;
        },
        priorityClass() {
            if (!this.task.priority) return '';
            return `priority-${String(this.task.priority).toLowerCase()}`;
        },
        hasMeta() {
            return this.task.dueDate || (this.task.subtasks && this.task.subtasks.length > 0);
        },
        subtaskCount() {
            return (this.task.subtasks || []).length;
        },
        completedSubtasks() {
            return (this.task.subtasks || []).filter(st => st.done).length;
        },
        allSubtasksDone() {
            return this.subtaskCount > 0 && this.completedSubtasks === this.subtaskCount;
        },
        formattedDate() {
            if (!this.task.dueDate) return '';
            // Fix: Parse YYYY-MM-DD manually to create local date instead of UTC
            const [year, month, day] = this.task.dueDate.split('-').map(Number);
            const date = new Date(year, month - 1, day);
            return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
        },
        isOverdue() {
            if (!this.task.dueDate || this.task.isCompleted) return false;
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            // Fix: Parse YYYY-MM-DD manually to avoid timezone shifts
            const [year, month, day] = this.task.dueDate.split('-').map(Number);
            const due = new Date(year, month - 1, day);
            return due < today;
        }
    },
    methods: {
        toggleCompleted() {
            mutations.toggleTaskCompletion(this.taskId);
        },
        openTask() {
            store.activeTaskId = this.taskId;
        },
        getTagStyle(tag) {
            // Simple deterministic color generation for tags
            let hash = 0;
            for (let i = 0; i < tag.length; i++) {
                hash = tag.charCodeAt(i) + ((hash << 5) - hash);
            }
            const hues = [0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330];
            const hue = hues[Math.abs(hash) % hues.length];
            return {
                backgroundColor: `hsl(${hue}, 70%, 90%)`,
                color: `hsl(${hue}, 80%, 25%)`,
                border: `1px solid hsl(${hue}, 60%, 80%)`
            };
        }
    }
});
