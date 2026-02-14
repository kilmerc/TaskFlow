import { MAX_COLUMN_NAME, store, mutations } from '../store.js';

Vue.component('kanban-board', {
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
    data() {
        return {
            isAdding: false,
            newColumnTitle: '',
            addError: '',
            MAX_COLUMN_NAME
        };
    },
    computed: {
        columns: {
            get() {
                return this.workspace ? this.workspace.columns : [];
            },
            set(value) {
                // v-model updates local value, but we need to commit to store
                // We'll handle persistence in @end event to avoid drag jitter, 
                // but for v-model to work smoothly we update the local array temporarily if needed.
                // However, since we're binding directly to a prop derived from store, 
                // we should rely on the mutation to update state. Only the drag library needs a writable list.
                // So the strictly correct way with Vuex/Store is usually a computed setter.
                mutations.reorderColumns(this.workspace.id, value);
            }
        }
    },
    methods: {
        onDragEnd() {
            // Persistence is handled by the setter 'reorderColumns' which persists.
            // But sometimes generic setter fires on every move? 
            // vuedraggable fires input event on drop.
        },
        startAdding() {
            this.isAdding = true;
            this.newColumnTitle = '';
            this.addError = '';
            this.$nextTick(() => {
                this.$refs.addInput.focus();
            });
        },
        cancelAdding() {
            this.isAdding = false;
            this.addError = '';
        },
        confirmAdd() {
            const result = mutations.addColumn(this.workspace.id, this.newColumnTitle);
            if (!result.ok) {
                this.addError = result.error.message;
                return;
            }
            this.addError = '';
            this.isAdding = false;
        }
    }
});
