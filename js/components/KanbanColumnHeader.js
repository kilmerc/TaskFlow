import { MAX_COLUMN_NAME, store, mutations } from '../store.js';
import { useMenuNavigation } from '../composables/useMenuNavigation.js';

const { ref, computed, nextTick } = Vue;

const KanbanColumnHeader = {
    name: 'KanbanColumnHeader',
    props: {
        columnId: { type: String, required: true }
    },
    emits: ['quick-add', 'print'],
    template: `
        <div ref="root" class="column-header">
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
                    <app-icon name="plus" aria-hidden="true"></app-icon>
                </button>
                <div class="dropdown" :class="{ active: isMenuOpen }" v-click-outside="onMenuOutside">
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
                        <app-icon name="ellipsis" aria-hidden="true"></app-icon>
                    </button>
                    <transition name="dropdown-fade">
                        <div class="dropdown-menu" v-if="isMenuOpen" :id="menuId" role="menu" @keydown="onMenuKeydown">
                            <button class="menu-item" role="menuitem" type="button" @click="startRenaming">Rename</button>
                            <button class="menu-item" role="menuitem" type="button" @click="printList">Print list</button>
                            <button class="menu-item delete" role="menuitem" type="button" @click="deleteColumn">Delete</button>
                        </div>
                    </transition>
                </div>
            </div>
        </div>
    `,
    setup(props, { emit }) {
        const root = ref(null);
        const renameInput = ref(null);
        const menuTrigger = ref(null);

        const isRenaming = ref(false);
        const renameValue = ref('');
        const renameError = ref('');

        const navigation = useMenuNavigation({
            rootRef: root,
            triggerRef: menuTrigger,
            focusableSelector: '.dropdown-menu .menu-item',
            idPrefix: 'column-menu'
        });

        const isMenuOpen = navigation.isOpen;
        const menuId = navigation.menuId;

        const column = computed(() => {
            return store.columns[props.columnId] || {};
        });

        function toggleMenu() {
            navigation.toggleMenu();
        }

        function openMenuAndFocus(index = 0) {
            navigation.openMenuAndFocus(index);
        }

        function closeMenu(restoreTrigger = false) {
            navigation.closeMenu(restoreTrigger);
        }

        function onMenuOutside() {
            closeMenu(false);
        }

        function getMenuItems() {
            return navigation.getMenuItems();
        }

        function onMenuKeydown(event) {
            navigation.onMenuKeydown(event);
        }

        function startRenaming() {
            closeMenu(false);
            renameError.value = '';
            renameValue.value = column.value.title;
            isRenaming.value = true;
            nextTick(() => {
                if (renameInput.value) {
                    renameInput.value.focus();
                    renameInput.value.select();
                }
            });
        }

        function finishRenaming() {
            if (!isRenaming.value) return;
            const result = mutations.updateColumn(props.columnId, renameValue.value);
            if (!result.ok) {
                renameError.value = result.error.message;
                return;
            }
            renameError.value = '';
            isRenaming.value = false;
        }

        function cancelRenaming() {
            isRenaming.value = false;
            renameError.value = '';
        }

        function printList() {
            closeMenu(false);
            emit('print');
        }

        function deleteColumn() {
            closeMenu(false);
            const taskCount = (store.columnTaskOrder[props.columnId] || []).length;
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
                    payload: { columnId: props.columnId }
                }
            });
        }

        return {
            root,
            renameInput,
            menuTrigger,
            isRenaming,
            renameValue,
            renameError,
            isMenuOpen,
            menuId,
            column,
            MAX_COLUMN_NAME,
            toggleMenu,
            openMenuAndFocus,
            closeMenu,
            onMenuOutside,
            getMenuItems,
            onMenuKeydown,
            startRenaming,
            finishRenaming,
            cancelRenaming,
            printList,
            deleteColumn
        };
    }
};

export default KanbanColumnHeader;
