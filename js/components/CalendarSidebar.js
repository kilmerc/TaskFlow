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
                :group="{ name: 'calendar', pull: 'clone', put: false }"
                :sort="false"
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
            return allTasks.filter(t => !t.dueDate && (
                !this.store.activeFilter || t.tags.includes(this.store.activeFilter)
            ));
        }
    },
    methods: {
        openTask(task) {
            mutations.setActiveTask(task.id);
        }
    }
});
