import { store, mutations } from '../store.js';

Vue.component('calendar-view', {
    template: `
        <div class="calendar-layout">
            <calendar-sidebar></calendar-sidebar>
            
            <div class="calendar-main">
                <div class="calendar-header">
                    <div class="cal-controls">
                        <button class="btn-text" @click="moveDate(-1)">
                            <i class="fas fa-chevron-left"></i>
                        </button>
                        <button class="btn-text" @click="goToToday">Today</button>
                        <button class="btn-text" @click="moveDate(1)">
                            <i class="fas fa-chevron-right"></i>
                        </button>
                        <h3 class="cal-title">{{ currentMonthYear }}</h3>
                    </div>
                    
                    <div class="cal-modes">
                        <button :class="{ active: viewMode === 'month' }" @click="viewMode = 'month'">Month</button>
                        <button :class="{ active: viewMode === 'week' }" @click="viewMode = 'week'">Week</button>
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
                    >
                        <div class="cal-cell-header">
                            <span class="day-number">{{ cell.dayNumber }}</span>
                        </div>
                        
                        <draggable 
                            :list="cell.tasks" 
                            group="calendar"
                            :data-date="cell.dateStr"
                            @change="onTaskDrop($event, cell.dateStr)"
                            class="cal-task-list"
                        >
                            <div 
                                v-for="task in cell.tasks" 
                                :key="task.id"
                                class="cal-task-pill"
                                :class="'task-color-' + (task.color || 'gray')"
                                @click.stop="openTask(task)"
                            >
                                <span class="pill-title">{{ task.title }}</span>
                            </div>
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
        currentMonthYear() {
            return this.currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
        },
        tasksByDate() {
            // Group tasks by dueDate YYYY-MM-DD
            const map = {};
            const allTasks = Object.values(this.store.tasks);

            allTasks.forEach(task => {
                if (!task.dueDate) return;
                // Add filter logic here if activeFilter is present
                if (this.store.activeFilter && !task.tags.includes(this.store.activeFilter)) {
                    return;
                }

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
        openTask(task) {
            mutations.setActiveTask(task.id);
        }
    }
});
