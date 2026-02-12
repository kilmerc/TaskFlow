import { store, mutations } from '../store.js';

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
                class="kanban-columns-container" 
                handle=".column-header"
                animation="150"
                ghost-class="column-ghost"
                @end="onDragEnd"
            >
                <kanban-column 
                    v-for="colId in columns" 
                    :key="colId" 
                    :column-id="colId"
                ></kanban-column>
            </draggable>
            
            <div class="add-column-container">
                <div v-if="!isAdding" class="add-column-btn" @click="startAdding">
                    <i class="fas fa-plus"></i> Add Column
                </div>
                <div v-else class="add-column-input-wrapper" v-click-outside="cancelAdding">
                    <input 
                        ref="addInput"
                        v-model="newColumnTitle" 
                        placeholder="Column title..."
                        @keyup.enter="confirmAdd"
                        @keyup.esc="cancelAdding"
                    >
                    <div class="add-actions">
                        <button class="btn-primary" @click="confirmAdd">Add</button>
                        <button class="btn-text" @click="cancelAdding"><i class="fas fa-times"></i></button>
                    </div>
                </div>
            </div>
        </div>
    `,
    data() {
        return {
            isAdding: false,
            newColumnTitle: ''
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
            this.$nextTick(() => {
                this.$refs.addInput.focus();
            });
        },
        cancelAdding() {
            this.isAdding = false;
        },
        confirmAdd() {
            const title = this.newColumnTitle.trim();
            if (title) {
                mutations.addColumn(this.workspace.id, title);
            }
            this.isAdding = false;
        }
    },
    directives: {
        'click-outside': {
            bind: function (el, binding, vnode) {
                el.clickOutsideEvent = function (event) {
                    if (!(el == event.target || el.contains(event.target))) {
                        vnode.context[binding.expression](event);
                    }
                };
                document.body.addEventListener('click', el.clickOutsideEvent);
            },
            unbind: function (el) {
                document.body.removeEventListener('click', el.clickOutsideEvent);
            }
        }
    }
});
