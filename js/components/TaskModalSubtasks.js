import { store, mutations } from '../store.js';

Vue.component('task-modal-subtasks', {
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
    data() {
        return {
            newSubtaskText: '',
            subtaskKeySeed: 0,
            subtaskKeyMap: typeof WeakMap === 'function' ? new WeakMap() : null
        };
    },
    computed: {
        task() {
            return store.tasks[this.taskId] || {};
        },
        subtasks: {
            get() { return this.task.subtasks || []; },
            set(value) { mutations.reorderSubtasks(this.taskId, value); }
        },
        canDragSubtasks() {
            return this.subtasks.length > 1;
        },
        progress() {
            if (!this.subtasks.length) return 0;
            const done = this.subtasks.filter(st => st.done).length;
            return (done / this.subtasks.length) * 100;
        }
    },
    methods: {
        addSubtask() {
            if (this.newSubtaskText.trim()) {
                mutations.addSubtask(this.taskId, this.newSubtaskText.trim());
                this.newSubtaskText = '';
            }
        },
        toggleSubtask(index, done) {
            mutations.updateSubtask(this.taskId, index, { done });
        },
        updateSubtaskText(index, text) {
            mutations.updateSubtask(this.taskId, index, { text });
        },
        deleteSubtask(index) {
            mutations.deleteSubtask(this.taskId, index);
        },
        subtaskItemKey(st) {
            if (!st || typeof st !== 'object' || !this.subtaskKeyMap) return `subtask-${String(st)}`;
            if (!this.subtaskKeyMap.has(st)) {
                this.subtaskKeySeed += 1;
                this.subtaskKeyMap.set(st, `subtask-${this.subtaskKeySeed}`);
            }
            return this.subtaskKeyMap.get(st);
        }
    }
});
