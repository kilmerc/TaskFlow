import { store, mutations } from '../store.js';

Vue.component('calendar-sidebar', {
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
                    @click="openTask(task)"
                >
                    <span class="task-title">{{ task.title }}</span>
                    <div class="task-meta" v-if="task.subtasks && task.subtasks.length > 0">
                        <span class="meta-item">
                            <i class="fas fa-check-square"></i> 
                            {{ task.subtasks.filter(s => s.done).length }}/{{ task.subtasks.length }}
                        </span>
                    </div>
                </div>
                
                <div v-if="unscheduledTasks.length === 0" style="color: var(--text-secondary); text-align: center; font-style: italic;">
                    All tasks scheduled!
                </div>
            </draggable>
        </div>
    `,
    computed: {
        store() {
            return store;
        },
        unscheduledTasks() {
            // Return tasks where dueDate is null
            const allTasks = Object.values(this.store.tasks);
            // Fix: Check for empty array specifically since [] is truthy in JS
            // Also updated filter logic to check if *some* of the task's tags match *any* of the active filters (OR logic)
            // or if no filters are active.
            return allTasks.filter(t => !t.dueDate && (
                !this.store.activeFilter ||
                this.store.activeFilter.length === 0 ||
                (t.tags && t.tags.some(tag => this.store.activeFilter.includes(tag)))
            ));
        }
    },
    methods: {
        openTask(task) {
            mutations.setActiveTask(task.id);
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
