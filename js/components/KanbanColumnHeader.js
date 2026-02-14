import { MAX_COLUMN_NAME, store, mutations } from '../store.js';

Vue.component('kanban-column-header', {
    props: {
        columnId: { type: String, required: true }
    },
    template: `
        <div class="column-header">
            <button
                v-if="!isRenaming"
                type="button"
                class="column-title column-title-btn"
                @dblclick="startRenaming"
                @keydown.enter.prevent="startRenaming"
                @keydown.space.prevent="startRenaming"
                :aria-label="'Rename column ' + column.title"
            >
                {{ column.title }}
            </button>
            <input
                v-else
                ref="renameInput"
                v-model="renameValue"
                :maxlength="MAX_COLUMN_NAME"
                @blur="finishRenaming"
                @keyup.enter="finishRenaming"
                @keyup.esc="cancelRenaming"
                class="column-title-input"
                aria-label="Column name"
            >
            <div v-if="isRenaming && renameError" class="form-error">{{ renameError }}</div>
            <div class="column-actions">
                <button
                    type="button"
                    class="column-quick-add-trigger"
                    aria-label="Quick add task"
                    title="Quick add task"
                    @click.stop="$emit('quick-add')"
                >
                    <i class="fas fa-plus" aria-hidden="true"></i>
                </button>
                <div class="dropdown" :class="{ active: isMenuOpen }" v-click-outside="closeMenu">
                    <button
                        ref="menuTrigger"
                        type="button"
                        class="column-menu-trigger"
                        aria-label="Column actions"
                        aria-haspopup="menu"
                        :aria-expanded="isMenuOpen ? 'true' : 'false'"
                        :aria-controls="menuId"
                        @click="toggleMenu"
                        @keydown.down.prevent="openMenuAndFocus(0)"
                        @keydown.up.prevent="openMenuAndFocus(getMenuItems().length - 1)"
                        @keydown.esc.prevent="closeMenu(true)"
                    >
                        <i class="fas fa-ellipsis-h" aria-hidden="true"></i>
                    </button>
                    <div class="dropdown-menu" v-if="isMenuOpen" :id="menuId" role="menu" @keydown="onMenuKeydown">
                        <button class="menu-item" role="menuitem" type="button" @click="startRenaming">Rename</button>
                        <button class="menu-item" role="menuitem" type="button" @click="printList">Print List</button>
                        <button class="menu-item delete" role="menuitem" type="button" @click="deleteColumn">Delete</button>
                    </div>
                </div>
            </div>
        </div>
    `,
    data() {
        return {
            isRenaming: false,
            renameValue: '',
            renameError: '',
            isMenuOpen: false,
            menuId: `column-menu-${Math.random().toString(36).slice(2)}`,
            MAX_COLUMN_NAME
        };
    },
    computed: {
        column() {
            return store.columns[this.columnId] || {};
        }
    },
    methods: {
        toggleMenu() {
            if (this.isMenuOpen) {
                this.closeMenu(false);
                return;
            }
            this.openMenuAndFocus(0);
        },
        openMenuAndFocus(index = 0) {
            this.isMenuOpen = true;
            this.$nextTick(() => {
                const items = this.getMenuItems();
                if (!items.length) return;
                const bounded = Math.max(0, Math.min(index, items.length - 1));
                items[bounded].focus();
            });
        },
        closeMenu(restoreTrigger = false) {
            this.isMenuOpen = false;
            if (restoreTrigger === true) {
                this.$nextTick(() => {
                    if (this.$refs.menuTrigger) {
                        this.$refs.menuTrigger.focus();
                    }
                });
            }
        },
        getMenuItems() {
            return Array.from(this.$el.querySelectorAll('.dropdown-menu .menu-item'));
        },
        onMenuKeydown(event) {
            const items = this.getMenuItems();
            if (!items.length) return;
            const currentIndex = items.indexOf(document.activeElement);

            if (event.key === 'ArrowDown') {
                event.preventDefault();
                const next = currentIndex < 0 ? 0 : (currentIndex + 1) % items.length;
                items[next].focus();
                return;
            }
            if (event.key === 'ArrowUp') {
                event.preventDefault();
                const next = currentIndex < 0 ? items.length - 1 : (currentIndex - 1 + items.length) % items.length;
                items[next].focus();
                return;
            }
            if (event.key === 'Home') {
                event.preventDefault();
                items[0].focus();
                return;
            }
            if (event.key === 'End') {
                event.preventDefault();
                items[items.length - 1].focus();
                return;
            }
            if (event.key === 'Escape') {
                event.preventDefault();
                this.closeMenu(true);
            }
        },
        startRenaming() {
            this.isMenuOpen = false;
            this.renameError = '';
            this.renameValue = this.column.title;
            this.isRenaming = true;
            this.$nextTick(() => {
                this.$refs.renameInput.focus();
                this.$refs.renameInput.select();
            });
        },
        finishRenaming() {
            if (!this.isRenaming) return;
            const result = mutations.updateColumn(this.columnId, this.renameValue);
            if (!result.ok) {
                this.renameError = result.error.message;
                return;
            }
            this.renameError = '';
            this.isRenaming = false;
        },
        cancelRenaming() {
            this.isRenaming = false;
            this.renameError = '';
        },
        printList() {
            this.isMenuOpen = false;
            this.$emit('print');
        },
        deleteColumn() {
            this.isMenuOpen = false;
            const taskCount = (store.columnTaskOrder[this.columnId] || []).length;
            const message = taskCount > 0
                ? `This column has ${taskCount} tasks. Delete it and all tasks?`
                : 'Delete this column?';

            mutations.openDialog({
                variant: 'confirm',
                title: 'Delete column?',
                message,
                confirmLabel: 'Delete column',
                cancelLabel: 'Cancel',
                destructive: true,
                action: {
                    type: 'column.delete',
                    payload: { columnId: this.columnId }
                }
            });
        }
    }
});
