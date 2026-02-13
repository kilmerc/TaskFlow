import { MAX_COLUMN_NAME } from '../store.js';

Vue.component('task-modal-column-picker', {
    props: {
        workspaceColumns: { type: Array, default: () => [] },
        columnId: { type: String, default: null },
        columnInput: { type: String, default: '' },
        showError: { type: Boolean, default: false },
        errorMessage: { type: String, default: 'Column is required.' }
    },
    template: `
        <div class="form-group">
            <label>Column <span class="required-marker">*</span></label>
            <div class="column-combobox" v-click-outside="closeColumnMenu">
                <input
                    ref="columnInput"
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
    data() {
        return {
            isColumnMenuOpen: false,
            activeColumnIndex: 0,
            maxColumnSuggestions: 8,
            MAX_COLUMN_NAME
        };
    },
    computed: {
        columnMenuItems() {
            const query = this.columnInput.trim();
            const lowered = query.toLowerCase();
            const items = [];
            const exact = this.workspaceColumns.find(col => col.title.toLowerCase() === lowered);
            if (query && !exact) items.push({ type: 'create', id: '', value: query });
            const existing = this.workspaceColumns
                .filter(col => !lowered || col.title.toLowerCase().includes(lowered))
                .slice(0, this.maxColumnSuggestions)
                .map(col => ({ type: 'existing', id: col.id, value: col.title }));
            return items.concat(existing);
        }
    },
    watch: {
        columnMenuItems(items) {
            if (!items.length || this.activeColumnIndex >= items.length) this.activeColumnIndex = 0;
        }
    },
    methods: {
        openColumnMenu() { this.isColumnMenuOpen = true; },
        closeColumnMenu() { this.isColumnMenuOpen = false; },
        onColumnInput(value) {
            this.$emit('update:columnInput', value);
            const lowered = value.trim().toLowerCase();
            const exact = this.workspaceColumns.find(col => col.title.toLowerCase() === lowered);
            this.$emit('update:columnId', exact ? exact.id : null);
            this.$emit('clear-error');
            this.openColumnMenu();
            this.activeColumnIndex = 0;
        },
        moveColumnSelection(step) {
            if (!this.columnMenuItems.length) return;
            const count = this.columnMenuItems.length;
            this.activeColumnIndex = (this.activeColumnIndex + step + count) % count;
        },
        selectActiveColumn() {
            if (!this.columnMenuItems.length) return;
            this.selectColumnItem(this.columnMenuItems[this.activeColumnIndex]);
        },
        selectColumnItem(item) {
            if (!item) return;
            this.$emit('update:columnId', item.type === 'existing' ? item.id : null);
            this.$emit('update:columnInput', item.value);
            this.closeColumnMenu();
            this.$emit('select');
        },
        reset() {
            this.closeColumnMenu();
        }
    }
});
