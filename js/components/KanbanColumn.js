import { store, mutations } from '../store.js';

Vue.component('kanban-column', {
    props: {
        columnId: {
            type: String,
            required: true
        }
    },
    template: `
        <div class="kanban-column">
            <div class="column-header">
                <div class="column-title" v-if="!isRenaming" @dblclick="startRenaming">
                    {{ column.title }}
                </div>
                <input 
                    v-else 
                    ref="renameInput"
                    v-model="renameValue" 
                    @blur="finishRenaming" 
                    @keyup.enter="finishRenaming"
                    @keyup.esc="cancelRenaming"
                    class="column-title-input"
                >
                <div class="column-actions">
                    <div class="dropdown" :class="{ active: isMenuOpen }" v-click-outside="closeMenu">
                        <i class="fas fa-ellipsis-h" @click="toggleMenu"></i>
                        <div class="dropdown-menu" v-if="isMenuOpen">
                            <div class="menu-item" @click="startRenaming">Rename</div>
                            <div class="menu-item delete" @click="deleteColumn">Delete</div>
                        </div>
                    </div>
                </div>
            </div>
            
            <!-- Task list placeholder for Phase 2 -->
            <div class="task-list">
                <!-- <draggable ...> via slot or implementing later -->
                <div style="padding: 10px; color: #999; font-size: 0.9em; text-align: center;">
                    <em>(Tasks coming in Phase 2)</em>
                </div>
            </div>
        </div>
    `,
    data() {
        return {
            sharedStore: store,
            isRenaming: false,
            renameValue: '',
            isMenuOpen: false
        };
    },
    computed: {
        column() {
            return this.sharedStore.columns[this.columnId] || {};
        }
    },
    methods: {
        toggleMenu() {
            this.isMenuOpen = !this.isMenuOpen;
        },
        closeMenu() {
            this.isMenuOpen = false;
        },
        startRenaming() {
            this.isMenuOpen = false;
            this.renameValue = this.column.title;
            this.isRenaming = true;
            this.$nextTick(() => {
                this.$refs.renameInput.focus();
            });
        },
        finishRenaming() {
            if (!this.isRenaming) return;
            const newVal = this.renameValue.trim();
            if (newVal && newVal !== this.column.title) {
                mutations.updateColumn(this.columnId, newVal);
            }
            this.isRenaming = false;
        },
        cancelRenaming() {
            this.isRenaming = false;
        },
        deleteColumn() {
            this.isMenuOpen = false;
            // Check for tasks
            const taskCount = (this.sharedStore.columnTaskOrder[this.columnId] || []).length;
            if (taskCount > 0) {
                if (!confirm(`This column has ${taskCount} tasks. Delete it and all tasks?`)) {
                    return;
                }
            }
            mutations.deleteColumn(this.columnId);
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
            },
        }
    }
});
