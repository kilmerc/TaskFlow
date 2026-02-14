import { mutations } from '../store.js';
import { useWorkspaceTaskContext } from '../composables/useWorkspaceTaskContext.js';

const { ref, computed } = Vue;

const CalendarView = {
    name: 'CalendarView',
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
    setup(props) {
        const currentDate = ref(new Date());
        const viewMode = ref('month');
        const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

        const context = useWorkspaceTaskContext(computed(() => props.workspace));

        const currentMonthYear = computed(() => {
            return currentDate.value.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
        });

        const tasksByDate = computed(() => {
            const map = {};
            context.workspaceTasks.value.forEach(task => {
                if (!task.dueDate) return;
                if (task.isCompleted) return;
                if (!context.matchesWorkspaceFilters(task)) return;

                if (!map[task.dueDate]) {
                    map[task.dueDate] = [];
                }
                map[task.dueDate].push(task);
            });
            return map;
        });

        const calendarCells = computed(() => {
            const year = currentDate.value.getFullYear();
            const month = currentDate.value.getMonth();
            const cells = [];

            let startDate;
            let endDate;

            if (viewMode.value === 'month') {
                const firstDay = new Date(year, month, 1);
                const lastDay = new Date(year, month + 1, 0);

                startDate = new Date(firstDay);
                startDate.setDate(firstDay.getDate() - firstDay.getDay());

                endDate = new Date(lastDay);
                endDate.setDate(lastDay.getDate() + (6 - lastDay.getDay()));
            } else {
                startDate = new Date(currentDate.value);
                startDate.setDate(currentDate.value.getDate() - currentDate.value.getDay());

                endDate = new Date(startDate);
                endDate.setDate(startDate.getDate() + 6);
            }

            const itr = new Date(startDate);
            const today = new Date();
            const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

            while (itr <= endDate) {
                const dateStr = `${itr.getFullYear()}-${String(itr.getMonth() + 1).padStart(2, '0')}-${String(itr.getDate()).padStart(2, '0')}`;
                const isCurrentMonth = itr.getMonth() === month;

                cells.push({
                    date: new Date(itr),
                    dateStr,
                    dayNumber: itr.getDate(),
                    isCurrentMonth: viewMode.value === 'week' ? true : isCurrentMonth,
                    isToday: dateStr === todayStr,
                    tasks: tasksByDate.value[dateStr] || []
                });

                itr.setDate(itr.getDate() + 1);
            }

            return cells;
        });

        function moveDate(delta) {
            const newDate = new Date(currentDate.value);
            if (viewMode.value === 'month') {
                newDate.setMonth(newDate.getMonth() + delta);
            } else {
                newDate.setDate(newDate.getDate() + (delta * 7));
            }
            currentDate.value = newDate;
        }

        function goToToday() {
            currentDate.value = new Date();
        }

        function onTaskDrop(event, targetDateStr) {
            if (event.added) {
                const task = event.added.element;
                mutations.scheduleTask(task.id, targetDateStr);
            }
        }

        function onCellClick(cell, event) {
            const target = event && event.target;
            if (target && target.closest && (target.closest('.cal-task-pill') || target.closest('.cal-task-checkbox'))) {
                return;
            }

            mutations.openTaskModalForCreate({
                workspaceId: props.workspace.id,
                dueDate: cell.dateStr,
                priority: null
            });
        }

        function onCellKeydown(cell, event) {
            if (!event || !['Enter', ' '].includes(event.key)) return;
            const target = event.target;
            if (target && target.closest && (target.closest('.cal-task-pill') || target.closest('.cal-task-checkbox'))) {
                return;
            }
            event.preventDefault();
            onCellClick(cell, event);
        }

        function toggleTaskCompletion(taskId) {
            mutations.toggleTaskCompletion(taskId);
        }

        function openTask(task) {
            mutations.setActiveTask(task.id);
        }

        return {
            currentDate,
            viewMode,
            weekDays,
            currentMonthYear,
            calendarCells,
            moveDate,
            goToToday,
            onTaskDrop,
            onCellClick,
            onCellKeydown,
            toggleTaskCompletion,
            openTask
        };
    }
};

export default CalendarView;
