import { store, mutations } from '../store.js';
import { taskMatchesFilters } from '../utils/taskFilters.js';

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
                    :group="dragGroup"
                    :sort="false"
                    @change="onUnassignedDrop"
                >
                    <div
                        v-for="task in unassignedTasks"
                        :key="task.id"
                        class="matrix-task-card"
                        @click="openTask(task.id)"
                    >
                        <span class="task-title">{{ task.title }}</span>
                        <div class="task-tags" v-if="task.tags && task.tags.length">
                            <span v-for="tag in task.tags" :key="tag" class="tag-pill">{{ tag }}</span>
                        </div>
                    </div>

                    <div v-if="unassignedTasks.length === 0" class="matrix-empty">
                        No unassigned tasks
                    </div>
                </draggable>
            </aside>

            <section class="eisenhower-grid">
                <div class="eisenhower-quadrant q1">
                    <div class="quadrant-header">
                        <h4>I Urgent & Important (Necessity)</h4>
                    </div>
                    <draggable
                        class="eisenhower-list"
                        :list="quadrantTasks('I')"
                        :group="dragGroup"
                        :sort="false"
                        @change="onQuadrantDrop($event, 'I')"
                    >
                        <div
                            v-for="task in quadrantTasks('I')"
                            :key="task.id"
                            class="matrix-task-card"
                            @click="openTask(task.id)"
                        >
                            <span class="task-title">{{ task.title }}</span>
                            <div class="task-tags" v-if="task.tags && task.tags.length">
                                <span v-for="tag in task.tags" :key="tag" class="tag-pill">{{ tag }}</span>
                            </div>
                        </div>
                    </draggable>
                </div>

                <div class="eisenhower-quadrant q2">
                    <div class="quadrant-header">
                        <h4>II Not Urgent & Important (Effective)</h4>
                    </div>
                    <draggable
                        class="eisenhower-list"
                        :list="quadrantTasks('II')"
                        :group="dragGroup"
                        :sort="false"
                        @change="onQuadrantDrop($event, 'II')"
                    >
                        <div
                            v-for="task in quadrantTasks('II')"
                            :key="task.id"
                            class="matrix-task-card"
                            @click="openTask(task.id)"
                        >
                            <span class="task-title">{{ task.title }}</span>
                            <div class="task-tags" v-if="task.tags && task.tags.length">
                                <span v-for="tag in task.tags" :key="tag" class="tag-pill">{{ tag }}</span>
                            </div>
                        </div>
                    </draggable>
                </div>

                <div class="eisenhower-quadrant q3">
                    <div class="quadrant-header">
                        <h4>III Urgent & Not Important (Distraction)</h4>
                    </div>
                    <draggable
                        class="eisenhower-list"
                        :list="quadrantTasks('III')"
                        :group="dragGroup"
                        :sort="false"
                        @change="onQuadrantDrop($event, 'III')"
                    >
                        <div
                            v-for="task in quadrantTasks('III')"
                            :key="task.id"
                            class="matrix-task-card"
                            @click="openTask(task.id)"
                        >
                            <span class="task-title">{{ task.title }}</span>
                            <div class="task-tags" v-if="task.tags && task.tags.length">
                                <span v-for="tag in task.tags" :key="tag" class="tag-pill">{{ tag }}</span>
                            </div>
                        </div>
                    </draggable>
                </div>

                <div class="eisenhower-quadrant q4">
                    <div class="quadrant-header">
                        <h4>IV Not Urgent & Not Important (Waste)</h4>
                    </div>
                    <draggable
                        class="eisenhower-list"
                        :list="quadrantTasks('IV')"
                        :group="dragGroup"
                        :sort="false"
                        @change="onQuadrantDrop($event, 'IV')"
                    >
                        <div
                            v-for="task in quadrantTasks('IV')"
                            :key="task.id"
                            class="matrix-task-card"
                            @click="openTask(task.id)"
                        >
                            <span class="task-title">{{ task.title }}</span>
                            <div class="task-tags" v-if="task.tags && task.tags.length">
                                <span v-for="tag in task.tags" :key="tag" class="tag-pill">{{ tag }}</span>
                            </div>
                        </div>
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
            }
        };
    },
    computed: {
        activeFilters() {
            return store.activeFilters || { tags: [], priorities: [] };
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
            return this.workspaceTasks.filter(task => taskMatchesFilters(task, this.activeFilters));
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
        openTask(taskId) {
            mutations.setActiveTask(taskId);
        }
    }
});
