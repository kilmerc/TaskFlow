import { store, mutations } from '../store.js';
import { taskMatchesFilters } from '../utils/taskFilters.js';

const CalendarView = {
    props: {
        workspace: {
            type: Object,
            required: true
        }
    },
    template: `
        <div class="calendar-layout">
            <calendar-sidebar :workspace="workspace"></calendar-sidebar>
            
            <div class="calendar-main">
                <div class="calendar-header">
                    <div class="cal-controls">
                        <button class="btn-text" @click="moveDate(-1)" title="Previous">
                            <i class="fas fa-chevron-left"></i>
                        </button>
                        <button class="btn-text" @click="goToToday" title="Go to Today">Today</button>
                        <button class="btn-text" @click="moveDate(1)" title="Next">
                            <i class="fas fa-chevron-right"></i>
                        </button>
                        <h3 class="cal-title">{{ currentMonthYear }}</h3>
                    </div>
                    
                    <div class="cal-modes">
                        <button :class="{ active: viewMode === 'month' }" @click="viewMode = 'month'" title="Switch to Month View">Month</button>
                        <button :class="{ active: viewMode === 'week' }" @click="viewMode = 'week'" title="Switch to Week View">Week</button>
                    </div>
                </div>

                <div class="calendar-grid" :class="viewMode">
                    <div class="cal-day-header" v-for="day in weekDays" :key="day">{{ day }}</div>
                    
                    <div 
                        v-for="cell in calendarCells" 
                        :key="cell.dateStr"
                        class="cal-cell"
                        :class="{ 
                            'current-month': cell.isCurrentMonth, 
                            'other-month': !cell.isCurrentMonth,
                            'today': cell.isToday
                        }"
                        tabindex="0"
                        role="button"
                        :aria-label="'Create task on ' + cell.dateStr"
                        @click="onCellClick(cell, $event)"
                        @keydown="onCellKeydown(cell, $event)"
                    >
                        <div class="cal-cell-header">
                            <span class="day-number">{{ cell.dayNumber }}</span>
                        </div>
                        
                        <draggable 
                            :list="cell.tasks" 
                            item-key="id"
                            group="calendar"
                            :data-date="cell.dateStr"
                            @change="onTaskDrop($event, cell.dateStr)"
                            class="cal-task-list"
                        >
                            <template #item="{ element: task }">
                                <button
                                    :key="task.id"
                                    class="cal-task-pill"
                                    :class="'task-color-' + (task.color || 'gray')"
                                    type="button"
                                    :aria-label="'Open task ' + task.title"
                                    @click.stop="openTask(task)"
                                >
                                    <input
                                        type="checkbox"
                                        class="cal-task-checkbox"
                                        :checked="task.isCompleted"
                                        @click.stop
                                        @change="toggleTaskCompletion(task.id)"
                                        title="Mark as complete"
                                    >
                                    <span class="pill-title">{{ task.title }}</span>
                                </button>
                            </template>
                        </draggable>
                    </div>
                </div>
            </div>
        </div>
    `,
    data() {
        return {
            currentDate: new Date(),
            viewMode: 'month', // 'month' | 'week'
            weekDays: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
        };
    },
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
        workspaceTasks() {
            return this.workspaceTaskIds
                .map(taskId => this.store.tasks[taskId])
                .filter(task => !!task);
        },
        currentMonthYear() {
            return this.currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
        },
        tasksByDate() {
            // Group tasks by dueDate YYYY-MM-DD
            const map = {};
            this.workspaceTasks.forEach(task => {
                if (!task.dueDate) return;
                if (task.isCompleted) return;

                if (!taskMatchesFilters(task, this.activeFilters, this.searchQuery)) return;

                if (!map[task.dueDate]) {
                    map[task.dueDate] = [];
                }
                map[task.dueDate].push(task);
            });

            return map; // Returns a new object reference, which is fine for computed
        },
        calendarCells() {
            const year = this.currentDate.getFullYear();
            const month = this.currentDate.getMonth();
            const cells = [];

            let startDate, endDate;

            if (this.viewMode === 'month') {
                // First day of month
                const firstDay = new Date(year, month, 1);
                // Last day of month
                const lastDay = new Date(year, month + 1, 0);

                // Start padding (back to Sunday)
                startDate = new Date(firstDay);
                startDate.setDate(firstDay.getDate() - firstDay.getDay());

                // End padding (forward to Saturday)
                endDate = new Date(lastDay);
                endDate.setDate(lastDay.getDate() + (6 - lastDay.getDay()));
            } else {
                // Week view
                startDate = new Date(this.currentDate);
                startDate.setDate(this.currentDate.getDate() - this.currentDate.getDay());

                endDate = new Date(startDate);
                endDate.setDate(startDate.getDate() + 6);
            }

            // Iterate days
            const itr = new Date(startDate);
            // Use local date string comparison to avoid timezone issues
            const today = new Date();
            const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

            while (itr <= endDate) {
                const dateStr = `${itr.getFullYear()}-${String(itr.getMonth() + 1).padStart(2, '0')}-${String(itr.getDate()).padStart(2, '0')}`;

                const isCurrentMonth = itr.getMonth() === month;

                // We must return a NEW array for tasks to ensure vuedraggable works with a fresh list for the cell
                // tasksByDate[dateStr] returns a reference to the array created in tasksByDate
                // tasksByDate is recomputed when store.tasks changes.
                // When we drag, we mutate store.tasks (via scheduleTask).
                // This triggers reactivity -> tasksByDate recomputes -> calendarCells recomputes.

                cells.push({
                    date: new Date(itr),
                    dateStr: dateStr,
                    dayNumber: itr.getDate(),
                    isCurrentMonth: this.viewMode === 'week' ? true : isCurrentMonth,
                    isToday: dateStr === todayStr,
                    tasks: this.tasksByDate[dateStr] || []
                });

                itr.setDate(itr.getDate() + 1);
            }

            return cells;
        }
    },
    methods: {
        moveDate(delta) {
            const newDate = new Date(this.currentDate);
            if (this.viewMode === 'month') {
                newDate.setMonth(newDate.getMonth() + delta);
            } else {
                newDate.setDate(newDate.getDate() + (delta * 7));
            }
            this.currentDate = newDate;
        },
        goToToday() {
            this.currentDate = new Date();
        },
        onTaskDrop(event, targetDateStr) {
            if (event.added) {
                const task = event.added.element;
                mutations.scheduleTask(task.id, targetDateStr);
            }
        },
        onCellClick(cell, event) {
            const target = event && event.target;
            if (target && target.closest && (target.closest('.cal-task-pill') || target.closest('.cal-task-checkbox'))) {
                return;
            }

            mutations.openTaskModalForCreate({
                workspaceId: this.workspace.id,
                dueDate: cell.dateStr,
                priority: null
            });
        },
        onCellKeydown(cell, event) {
            if (!event || !['Enter', ' '].includes(event.key)) return;
            const target = event.target;
            if (target && target.closest && (target.closest('.cal-task-pill') || target.closest('.cal-task-checkbox'))) {
                return;
            }
            event.preventDefault();
            this.onCellClick(cell, event);
        },
        toggleTaskCompletion(taskId) {
            mutations.toggleTaskCompletion(taskId);
        },
        openTask(task) {
            mutations.setActiveTask(task.id);
        }
    }
};

export default CalendarView;

