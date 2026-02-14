import { store, mutations } from '../store.js';

const { ref, computed } = Vue;

const TaskModalSubtasks = {
    name: 'TaskModalSubtasks',
    props: {
        taskId: { type: String, required: true }
    },
    template: `
        <div class="subtasks-section">
            <label>Subtasks</label>
            <div class="progress-bar" v-if="subtasks.length > 0">
                <div class="progress-fill" :style="{ width: progress + '%' }"></div>
            </div>
            <draggable
                v-model="subtasks"
                :item-key="subtaskItemKey"
                tag="ul"
                class="subtask-list"
                handle=".subtask-drag-handle"
                ghost-class="subtask-ghost"
                drag-class="subtask-drag"
                :animation="150"
                :disabled="!canDragSubtasks"
            >
                <template #item="{ element: st, index }">
                    <li class="subtask-item">
                        <button
                            type="button"
                            class="subtask-drag-handle"
                            :title="canDragSubtasks ? 'Drag to reorder subtask' : 'Add more subtasks to reorder'"
                            aria-label="Drag to reorder subtask"
                            :disabled="!canDragSubtasks"
                        ><i class="fas fa-grip-vertical" aria-hidden="true"></i></button>
                        <input type="checkbox" class="subtask-checkbox" :checked="st.done" @change="toggleSubtask(index, $event.target.checked)" title="Mark as done">
                        <input
                            type="text"
                            :value="st.text"
                            @change="updateSubtaskText(index, $event.target.value)"
                            class="subtask-input"
                            :class="{ completed: st.done }"
                            placeholder="Subtask..."
                        >
                        <button type="button" class="delete-subtask-btn" @click="deleteSubtask(index)" title="Delete Subtask"><i class="fas fa-trash-alt"></i></button>
                    </li>
                </template>
            </draggable>
            <div class="add-subtask">
                <i class="fas fa-plus"></i>
                <input
                    type="text"
                    v-model="newSubtaskText"
                    @keyup.enter="addSubtask"
                    placeholder="Add a subtask..."
                    title="Press Enter to add subtask"
                >
            </div>
        </div>
    `,
    setup(props) {
        const newSubtaskText = ref('');
        const subtaskKeySeed = ref(0);
        const subtaskKeyMap = typeof WeakMap === 'function' ? new WeakMap() : null;

        const task = computed(() => {
            return store.tasks[props.taskId] || {};
        });

        const subtasks = computed({
            get() {
                return task.value.subtasks || [];
            },
            set(value) {
                mutations.reorderSubtasks(props.taskId, value);
            }
        });

        const canDragSubtasks = computed(() => {
            return subtasks.value.length > 1;
        });

        const progress = computed(() => {
            if (!subtasks.value.length) return 0;
            const done = subtasks.value.filter(st => st.done).length;
            return (done / subtasks.value.length) * 100;
        });

        function addSubtask() {
            if (newSubtaskText.value.trim()) {
                mutations.addSubtask(props.taskId, newSubtaskText.value.trim());
                newSubtaskText.value = '';
            }
        }

        function toggleSubtask(index, done) {
            mutations.updateSubtask(props.taskId, index, { done });
        }

        function updateSubtaskText(index, text) {
            mutations.updateSubtask(props.taskId, index, { text });
        }

        function deleteSubtask(index) {
            mutations.deleteSubtask(props.taskId, index);
        }

        function subtaskItemKey(st) {
            if (!st || typeof st !== 'object' || !subtaskKeyMap) {
                return `subtask-${String(st)}`;
            }
            if (!subtaskKeyMap.has(st)) {
                subtaskKeySeed.value += 1;
                subtaskKeyMap.set(st, `subtask-${subtaskKeySeed.value}`);
            }
            return subtaskKeyMap.get(st);
        }

        return {
            newSubtaskText,
            subtasks,
            canDragSubtasks,
            progress,
            addSubtask,
            toggleSubtask,
            updateSubtaskText,
            deleteSubtask,
            subtaskItemKey
        };
    }
};

export default TaskModalSubtasks;
