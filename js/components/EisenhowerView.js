import { store, mutations } from '../store.js';
import { taskMatchesFilters } from '../utils/taskFilters.js';
import { getTagToneClass as computeTagToneClass } from '../utils/tagStyle.js';

Vue.component('eisenhower-view', {
    props: {
        workspace: {
            type: Object,
            required: true
        }
    },
    template: `
        <div class="eisenhower-layout">
            <aside class="eisenhower-sidebar">
                <div class="sidebar-header">
                    <h4>Unassigned</h4>
                </div>

                <draggable
                    class="eisenhower-list"
                    :list="unassignedTasks"
                    item-key="id"
                    :group="dragGroup"
                    :sort="false"
                    @change="onUnassignedDrop"
                >
                    <template #item="{ element: task }">
                        <div
                            :key="task.id"
                            class="matrix-task-card"
                        >
                            <div class="matrix-task-row">
                                <input
                                    type="checkbox"
                                    class="task-checkbox matrix-task-checkbox"
                                    :checked="task.isCompleted"
                                    @click.stop
                                    @change="toggleTaskCompletion(task.id)"
                                    title="Mark as complete"
                                >
                                <button
                                    type="button"
                                    class="task-open-btn"
                                    :aria-label="'Open task ' + task.title"
                                    @click="openTask(task.id)"
                                >
                                    <div class="task-content">
                                        <span class="task-title">{{ task.title }}</span>
                                        <div class="task-tags" v-if="task.tags && task.tags.length">
                                            <span v-for="tag in task.tags" :key="tag" class="tag-pill" :class="getTagToneClass(tag)">{{ tag }}</span>
                                        </div>
                                    </div>
                                </button>
                            </div>
                        </div>
                    </template>

                    <div v-if="unassignedTasks.length === 0" class="matrix-empty">
                        No unassigned tasks
                    </div>
                </draggable>
            </aside>

            <section class="eisenhower-grid">
                <div
                    v-for="quadrant in quadrants"
                    :key="quadrant.priority"
                    class="eisenhower-quadrant"
                    :class="quadrant.className"
                >
                    <div class="quadrant-header">
                        <h4 class="quadrant-title">
                            <span class="quadrant-roman">{{ quadrant.priority }}</span>
                            <span class="quadrant-title-text">{{ quadrant.label }}</span>
                        </h4>
                        <button
                            class="matrix-add-btn"
                            type="button"
                            @click.stop="openCreateModal(quadrant.priority)"
                            :title="'Add task to Quadrant ' + quadrant.priority"
                            :aria-label="'Add task to Quadrant ' + quadrant.priority"
                        >
                            <i class="fas fa-plus"></i>
                        </button>
                    </div>
                    <draggable
                        class="eisenhower-list"
                        :list="quadrantTasks(quadrant.priority)"
                        item-key="id"
                        :group="dragGroup"
                        :sort="false"
                        @change="onQuadrantDrop($event, quadrant.priority)"
                    >
                        <template #item="{ element: task }">
                            <div
                                :key="task.id"
                                class="matrix-task-card"
                            >
                                <div class="matrix-task-row">
                                    <input
                                        type="checkbox"
                                        class="task-checkbox matrix-task-checkbox"
                                        :checked="task.isCompleted"
                                        @click.stop
                                        @change="toggleTaskCompletion(task.id)"
                                        title="Mark as complete"
                                    >
                                    <button
                                        type="button"
                                        class="task-open-btn"
                                        :aria-label="'Open task ' + task.title"
                                        @click="openTask(task.id)"
                                    >
                                        <div class="task-content">
                                            <span class="task-title">{{ task.title }}</span>
                                            <div class="task-tags" v-if="task.tags && task.tags.length">
                                                <span v-for="tag in task.tags" :key="tag" class="tag-pill" :class="getTagToneClass(tag)">{{ tag }}</span>
                                            </div>
                                        </div>
                                    </button>
                                </div>
                            </div>
                        </template>
                    </draggable>
                </div>
            </section>
        </div>
    `,
    data() {
        return {
            dragGroup: {
                name: 'eisenhower',
                pull: 'clone',
                put: true
            },
            quadrants: [
                { priority: 'I', className: 'q1', label: 'Urgent & Important (Necessity)' },
                { priority: 'II', className: 'q2', label: 'Not Urgent & Important (Effective)' },
                { priority: 'III', className: 'q3', label: 'Urgent & Not Important (Distraction)' },
                { priority: 'IV', className: 'q4', label: 'Not Urgent & Not Important (Waste)' }
            ]
        };
    },
    computed: {
        activeFilters() {
            return store.activeFilters || { tags: [], priorities: [] };
        },
        workspaceViewState() {
            if (!this.workspace || !this.workspace.id) {
                return { searchQuery: '' };
            }
            return store.workspaceViewState[this.workspace.id]
                || { searchQuery: '' };
        },
        searchQuery() {
            return this.workspaceViewState.searchQuery || '';
        },
        workspaceTaskIds() {
            if (!this.workspace || !Array.isArray(this.workspace.columns)) return [];

            const ids = [];
            this.workspace.columns.forEach(columnId => {
                const order = store.columnTaskOrder[columnId] || [];
                ids.push(...order);
            });
            return ids;
        },
        workspaceTasks() {
            return this.workspaceTaskIds
                .map(id => store.tasks[id])
                .filter(task => !!task);
        },
        filteredWorkspaceTasks() {
            return this.workspaceTasks.filter(task =>
                !task.isCompleted && taskMatchesFilters(task, this.activeFilters, this.searchQuery)
            );
        },
        priorityBuckets() {
            const buckets = {
                I: [],
                II: [],
                III: [],
                IV: [],
                unassigned: []
            };

            this.filteredWorkspaceTasks.forEach(task => {
                if (task.priority && buckets[task.priority]) {
                    buckets[task.priority].push(task);
                } else {
                    buckets.unassigned.push(task);
                }
            });

            return buckets;
        },
        unassignedTasks() {
            return this.priorityBuckets.unassigned;
        }
    },
    methods: {
        quadrantTasks(priority) {
            return this.priorityBuckets[priority] || [];
        },
        onQuadrantDrop(event, priority) {
            if (event.added && event.added.element) {
                mutations.setTaskPriority(event.added.element.id, priority);
            }
        },
        onUnassignedDrop(event) {
            if (event.added && event.added.element) {
                mutations.setTaskPriority(event.added.element.id, null);
            }
        },
        toggleTaskCompletion(taskId) {
            mutations.toggleTaskCompletion(taskId);
        },
        openCreateModal(priority) {
            mutations.openTaskModalForCreate({
                workspaceId: this.workspace.id,
                priority
            });
        },
        openTask(taskId) {
            mutations.setActiveTask(taskId);
        },
        getTagToneClass(tag) {
            return computeTagToneClass(tag);
        }
    }
});
