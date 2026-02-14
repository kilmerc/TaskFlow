import { MAX_COLUMN_NAME, mutations } from '../store.js';

const { ref, computed, nextTick } = Vue;

const KanbanBoard = {
    name: 'KanbanBoard',
    props: {
        workspace: {
            type: Object,
            required: true
        }
    },
    template: `
        <div class="kanban-board">
            <draggable
                v-model="columns"
                :item-key="item => item"
                class="kanban-columns-container"
                handle=".column-header"
                animation="150"
                ghost-class="column-ghost"
                @end="onDragEnd"
            >
                <template #item="{ element: colId }">
                    <kanban-column
                        :key="colId"
                        :column-id="colId"
                    ></kanban-column>
                </template>
            </draggable>

            <div class="add-column-container">
                <button
                    v-if="!isAdding"
                    type="button"
                    class="add-column-btn"
                    aria-label="Add a new column"
                    @click.stop="startAdding"
                >
                    <i class="fas fa-plus"></i> Add Column
                </button>
                <div v-else class="add-column-input-wrapper" v-click-outside="cancelAdding">
                    <input
                        ref="addInput"
                        v-model="newColumnTitle"
                        placeholder="Column title..."
                        :maxlength="MAX_COLUMN_NAME"
                        aria-label="Column title"
                        @keyup.enter="confirmAdd"
                        @keyup.esc="cancelAdding"
                    >
                    <div v-if="addError" class="form-error">{{ addError }}</div>
                    <div class="add-actions">
                        <button class="btn-primary" @click="confirmAdd" title="Add Column">Add</button>
                        <button class="btn-text" @click="cancelAdding" aria-label="Cancel add column"><i class="fas fa-times"></i></button>
                    </div>
                </div>
            </div>
        </div>
    `,
    setup(props) {
        const addInput = ref(null);
        const isAdding = ref(false);
        const newColumnTitle = ref('');
        const addError = ref('');

        const columns = computed({
            get() {
                return props.workspace ? props.workspace.columns : [];
            },
            set(value) {
                mutations.reorderColumns(props.workspace.id, value);
            }
        });

        function onDragEnd() {
            // Persisted in store mutation invoked by computed setter.
        }

        function startAdding() {
            isAdding.value = true;
            newColumnTitle.value = '';
            addError.value = '';
            nextTick(() => {
                if (addInput.value) {
                    addInput.value.focus();
                }
            });
        }

        function cancelAdding() {
            isAdding.value = false;
            addError.value = '';
        }

        function confirmAdd() {
            const result = mutations.addColumn(props.workspace.id, newColumnTitle.value);
            if (!result.ok) {
                addError.value = result.error.message;
                return;
            }
            addError.value = '';
            isAdding.value = false;
        }

        return {
            addInput,
            isAdding,
            newColumnTitle,
            addError,
            columns,
            MAX_COLUMN_NAME,
            onDragEnd,
            startAdding,
            cancelAdding,
            confirmAdd
        };
    }
};

export default KanbanBoard;
