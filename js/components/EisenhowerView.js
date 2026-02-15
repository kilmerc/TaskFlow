import { mutations } from '../store.js';
import { useWorkspaceTaskContext } from '../composables/useWorkspaceTaskContext.js';
import { getTagToneClass as computeTagToneClass } from '../utils/tagStyle.js';
import { uiCopy } from '../config/uiCopy.js';

const { ref, computed } = Vue;

const EisenhowerView = {
    name: 'EisenhowerView',
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
                    <h4>{{ uiCopy.labels.eisenhowerSidebarTitle }}</h4>
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
                            :class="['matrix-task-card', 'task-color-' + (task.color || 'gray')]"
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
                                        <div v-if="task.subtasks && task.subtasks.length > 0" class="task-progress-strip">
                                            <div
                                                class="task-progress-fill"
                                                :style="{ width: Math.round((task.subtasks.filter(s => s.done).length / task.subtasks.length) * 100) + '%' }"
                                            ></div>
                                        </div>
                                    </div>
                                </button>
                            </div>
                        </div>
                    </template>

                    <div v-if="unassignedTasks.length === 0" class="matrix-empty">
                        {{ uiCopy.emptyStates.noUnassignedTasks }}
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
                            <app-icon name="plus"></app-icon>
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
                                :class="['matrix-task-card', 'task-color-' + (task.color || 'gray')]"
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
                                            <div v-if="task.subtasks && task.subtasks.length > 0" class="task-progress-strip">
                                                <div
                                                    class="task-progress-fill"
                                                    :style="{ width: Math.round((task.subtasks.filter(s => s.done).length / task.subtasks.length) * 100) + '%' }"
                                                ></div>
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
    setup(props) {
        const dragGroup = {
            name: 'eisenhower',
            pull: 'clone',
            put: true
        };

        const quadrants = ref([
            { priority: 'I', className: 'q1', label: 'Urgent & Important (Necessity)' },
            { priority: 'II', className: 'q2', label: 'Not Urgent & Important (Effective)' },
            { priority: 'III', className: 'q3', label: 'Urgent & Not Important (Distraction)' },
            { priority: 'IV', className: 'q4', label: 'Not Urgent & Not Important (Waste)' }
        ]);

        const context = useWorkspaceTaskContext(computed(() => props.workspace));

        const filteredWorkspaceTasks = computed(() => {
            return context.workspaceTasks.value.filter(task =>
                !task.isCompleted && context.matchesWorkspaceFilters(task)
            );
        });

        const priorityBuckets = computed(() => {
            const buckets = {
                I: [],
                II: [],
                III: [],
                IV: [],
                unassigned: []
            };

            filteredWorkspaceTasks.value.forEach(task => {
                if (task.priority && buckets[task.priority]) {
                    buckets[task.priority].push(task);
                } else {
                    buckets.unassigned.push(task);
                }
            });

            return buckets;
        });

        const unassignedTasks = computed(() => priorityBuckets.value.unassigned);

        function quadrantTasks(priority) {
            return priorityBuckets.value[priority] || [];
        }

        function onQuadrantDrop(event, priority) {
            if (event.added && event.added.element) {
                mutations.setTaskPriority(event.added.element.id, priority);
            }
        }

        function onUnassignedDrop(event) {
            if (event.added && event.added.element) {
                mutations.setTaskPriority(event.added.element.id, null);
            }
        }

        function toggleTaskCompletion(taskId) {
            mutations.toggleTaskCompletion(taskId);
        }

        function openCreateModal(priority) {
            mutations.openTaskModalForCreate({
                workspaceId: props.workspace.id,
                priority
            });
        }

        function openTask(taskId) {
            mutations.setActiveTask(taskId);
        }

        function getTagToneClass(tag) {
            return computeTagToneClass(tag);
        }

        return {
            dragGroup,
            quadrants,
            unassignedTasks,
            quadrantTasks,
            onQuadrantDrop,
            onUnassignedDrop,
            toggleTaskCompletion,
            openCreateModal,
            openTask,
            getTagToneClass,
            uiCopy
        };
    }
};

export default EisenhowerView;
