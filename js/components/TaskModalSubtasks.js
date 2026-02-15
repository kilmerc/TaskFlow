import { uiCopy } from '../config/uiCopy.js';

const { ref, computed } = Vue;

const TaskModalSubtasks = {
    name: 'TaskModalSubtasks',
    props: {
        subtasks: { type: Array, required: true }
    },
    emits: ['add-subtask', 'update-subtask', 'delete-subtask', 'reorder-subtasks'],
    template: `
        <div class="subtasks-section">
            <label>Subtasks</label>
            <div class="progress-bar" v-if="localSubtasks.length > 0">
                <div class="progress-fill" :style="{ width: progress + '%' }"></div>
            </div>
            <draggable
                v-model="localSubtasks"
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
                        ><app-icon name="grip-vertical" aria-hidden="true"></app-icon></button>
                        <input type="checkbox" class="subtask-checkbox" :checked="st.done" @change="toggleSubtask(index, $event.target.checked)" title="Mark as done">
                        <input
                            type="text"
                            :value="st.text"
                            @change="updateSubtaskText(index, $event.target.value)"
                            class="subtask-input"
                            :class="{ completed: st.done }"
                            :placeholder="uiCopy.placeholders.subtask"
                        >
                        <button type="button" class="delete-subtask-btn" @click="deleteSubtask(index)" title="Delete Subtask"><app-icon name="trash"></app-icon></button>
                    </li>
                </template>
            </draggable>
            <div class="add-subtask">
                <app-icon name="plus"></app-icon>
                <input
                    type="text"
                    v-model="newSubtaskText"
                    @keyup.enter="addSubtask"
                    :placeholder="uiCopy.actions.addStep"
                    title="Press Enter to add subtask"
                >
            </div>
        </div>
    `,
    setup(props, { emit }) {
        const newSubtaskText = ref('');
        const subtaskKeySeed = ref(0);
        const subtaskKeyMap = typeof WeakMap === 'function' ? new WeakMap() : null;

        const localSubtasks = computed({
            get() {
                return Array.isArray(props.subtasks) ? props.subtasks : [];
            },
            set(value) {
                emit('reorder-subtasks', Array.isArray(value) ? value : []);
            }
        });

        const canDragSubtasks = computed(() => {
            return localSubtasks.value.length > 1;
        });

        const progress = computed(() => {
            if (!localSubtasks.value.length) return 0;
            const done = localSubtasks.value.filter(st => st.done).length;
            return (done / localSubtasks.value.length) * 100;
        });

        function addSubtask() {
            if (newSubtaskText.value.trim()) {
                emit('add-subtask', newSubtaskText.value.trim());
                newSubtaskText.value = '';
            }
        }

        function toggleSubtask(index, done) {
            emit('update-subtask', { index, updates: { done } });
        }

        function updateSubtaskText(index, text) {
            emit('update-subtask', { index, updates: { text } });
        }

        function deleteSubtask(index) {
            emit('delete-subtask', index);
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
            localSubtasks,
            canDragSubtasks,
            progress,
            uiCopy,
            addSubtask,
            toggleSubtask,
            updateSubtaskText,
            deleteSubtask,
            subtaskItemKey
        };
    }
};

export default TaskModalSubtasks;
