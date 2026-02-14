import { MAX_COLUMN_NAME } from '../store.js';

const { ref, computed, watch } = Vue;

const TaskModalColumnPicker = {
    name: 'TaskModalColumnPicker',
    props: {
        workspaceColumns: { type: Array, default: () => [] },
        columnId: { type: String, default: null },
        columnInput: { type: String, default: '' },
        showError: { type: Boolean, default: false },
        errorMessage: { type: String, default: 'Column is required.' }
    },
    emits: ['update:columnInput', 'update:columnId', 'clear-error', 'blur', 'select'],
    template: `
        <div class="form-group">
            <label>Column <span class="required-marker">*</span></label>
            <div class="column-combobox" v-click-outside="closeColumnMenu">
                <input
                    ref="columnInputRef"
                    type="text"
                    class="column-combobox-input"
                    :value="columnInput"
                    :maxlength="MAX_COLUMN_NAME"
                    placeholder="Select or create a column..."
                    @focus="openColumnMenu"
                    @input="onColumnInput($event.target.value)"
                    @blur="$emit('blur')"
                    @keydown.down.prevent="moveColumnSelection(1)"
                    @keydown.up.prevent="moveColumnSelection(-1)"
                    @keydown.enter.prevent="selectActiveColumn"
                    @keydown.tab.prevent="selectActiveColumn"
                    @keydown.esc.stop.prevent="closeColumnMenu"
                >
                <div v-if="isColumnMenuOpen && columnMenuItems.length" class="column-combobox-menu">
                    <div
                        v-for="(item, index) in columnMenuItems"
                        :key="item.type + '-' + item.id + '-' + item.value"
                        class="column-combobox-item"
                        :class="{ active: index === activeColumnIndex, 'is-create': item.type === 'create' }"
                        @mousedown.prevent="selectColumnItem(item)"
                    >
                        <span v-if="item.type === 'create'">Create column "{{ item.value }}"</span>
                        <span v-else>{{ item.value }}</span>
                    </div>
                </div>
                <div v-else-if="isColumnMenuOpen && columnInput.trim()" class="column-combobox-menu">
                    <div class="column-combobox-empty">No matching columns</div>
                </div>
            </div>
            <div v-if="showError" class="form-error">{{ errorMessage }}</div>
        </div>
    `,
    setup(props, { emit, expose }) {
        const columnInputRef = ref(null);
        const isColumnMenuOpen = ref(false);
        const activeColumnIndex = ref(0);
        const maxColumnSuggestions = 8;

        const columnMenuItems = computed(() => {
            const query = props.columnInput.trim();
            const lowered = query.toLowerCase();
            const items = [];
            const exact = props.workspaceColumns.find(col => col.title.toLowerCase() === lowered);
            if (query && !exact) {
                items.push({ type: 'create', id: '', value: query });
            }
            const existing = props.workspaceColumns
                .filter(col => !lowered || col.title.toLowerCase().includes(lowered))
                .slice(0, maxColumnSuggestions)
                .map(col => ({ type: 'existing', id: col.id, value: col.title }));
            return items.concat(existing);
        });

        watch(columnMenuItems, (items) => {
            if (!items.length || activeColumnIndex.value >= items.length) {
                activeColumnIndex.value = 0;
            }
        });

        function openColumnMenu() {
            isColumnMenuOpen.value = true;
        }

        function closeColumnMenu() {
            isColumnMenuOpen.value = false;
        }

        function onColumnInput(value) {
            emit('update:columnInput', value);
            const lowered = value.trim().toLowerCase();
            const exact = props.workspaceColumns.find(col => col.title.toLowerCase() === lowered);
            emit('update:columnId', exact ? exact.id : null);
            emit('clear-error');
            openColumnMenu();
            activeColumnIndex.value = 0;
        }

        function moveColumnSelection(step) {
            if (!columnMenuItems.value.length) return;
            const count = columnMenuItems.value.length;
            activeColumnIndex.value = (activeColumnIndex.value + step + count) % count;
        }

        function selectActiveColumn() {
            if (!columnMenuItems.value.length) return;
            selectColumnItem(columnMenuItems.value[activeColumnIndex.value]);
        }

        function selectColumnItem(item) {
            if (!item) return;
            emit('update:columnId', item.type === 'existing' ? item.id : null);
            emit('update:columnInput', item.value);
            closeColumnMenu();
            emit('select');
        }

        function reset() {
            closeColumnMenu();
        }

        expose({ reset });

        return {
            columnInputRef,
            isColumnMenuOpen,
            activeColumnIndex,
            columnMenuItems,
            MAX_COLUMN_NAME,
            openColumnMenu,
            closeColumnMenu,
            onColumnInput,
            moveColumnSelection,
            selectActiveColumn,
            selectColumnItem,
            reset
        };
    }
};

export default TaskModalColumnPicker;
