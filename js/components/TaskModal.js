import { MAX_COLUMN_NAME, MAX_TASK_TITLE, store, mutations } from '../store.js';
import { PRIORITY_VALUES } from '../utils/taskFilters.js';
import { normalizeTag } from '../utils/tagParser.js';
import { getWorkspaceTags } from '../utils/tagAutocomplete.js';

Vue.component('task-modal', {
    template: `
        <div class="modal-backdrop" @click.self="close" v-if="isOpen">
            <div class="modal-content" :class="colorClass">
                <header class="modal-header">
                    <div class="modal-title-row">
                        <input
                            v-if="isEdit"
                            type="checkbox"
                            class="task-checkbox modal-checkbox"
                            :checked="task.isCompleted"
                            @change="toggleCompleted"
                            title="Mark as complete"
                        >
                        <input
                            class="modal-title-input"
                            :class="{ 'title-completed': isEdit && task.isCompleted }"
                            v-model="localTitle"
                            :maxlength="MAX_TASK_TITLE"
                            @blur="onTitleBlur"
                            @keyup.enter="$event.target.blur()"
                            placeholder="Task Title *"
                        >
                    </div>
                    <button class="close-btn" @click="close" title="Close Modal"><i class="fas fa-times"></i></button>
                </header>

                <div class="modal-body">
                    <div v-if="showTitleError" class="form-error">{{ titleErrorMessage }}</div>

                    <div class="form-group">
                        <label>Column <span class="required-marker">*</span></label>
                        <div class="column-combobox" v-click-outside="closeColumnMenu">
                            <input
                                ref="columnInput"
                                type="text"
                                class="column-combobox-input"
                                v-model="localColumnInput"
                                :maxlength="MAX_COLUMN_NAME"
                                placeholder="Select or create a column..."
                                @focus="openColumnMenu"
                                @input="onColumnInput"
                                @blur="onColumnBlur"
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
                            <div v-else-if="isColumnMenuOpen && localColumnInput.trim()" class="column-combobox-menu">
                                <div class="column-combobox-empty">No matching columns</div>
                            </div>
                        </div>
                        <div v-if="showColumnError" class="form-error">{{ columnErrorMessage }}</div>
                    </div>

                    <div class="form-group">
                        <label>Description</label>
                        <textarea v-model="localDescription" @blur="saveDescription" placeholder="Add a description..." rows="4"></textarea>
                    </div>

                    <div class="form-group">
                        <label>Tags</label>
                        <div class="tag-combobox" v-click-outside="closeTagMenu">
                            <div class="tag-chip-list" @click="focusTagInput">
                                <span v-for="tag in selectedTags" :key="tag" class="tag-chip tag-pill" :style="getTagStyle(tag)">
                                    {{ tag }}
                                    <button type="button" class="tag-chip-remove" @click.stop="removeTag(tag)" title="Remove tag">
                                        <i class="fas fa-times"></i>
                                    </button>
                                </span>
                                <input
                                    ref="tagInput"
                                    type="text"
                                    class="tag-combobox-input"
                                    v-model="localTagInput"
                                    placeholder="Add or search tags..."
                                    @focus="openTagMenu"
                                    @input="onTagInput"
                                    @keydown.down.prevent="moveTagSelection(1)"
                                    @keydown.up.prevent="moveTagSelection(-1)"
                                    @keydown.enter.prevent="selectActiveTag"
                                    @keydown.tab.prevent="selectActiveTag"
                                    @keydown.esc.stop.prevent="closeTagMenu"
                                    @keydown.backspace="onTagBackspace"
                                >
                            </div>
                            <div v-if="isTagMenuOpen && tagMenuItems.length" class="tag-combobox-menu">
                                <div
                                    v-for="(item, index) in tagMenuItems"
                                    :key="item.type + '-' + item.value"
                                    class="tag-combobox-item"
                                    :class="{ active: index === activeTagIndex, 'is-create': item.type === 'create' }"
                                    @mousedown.prevent="selectTagItem(item)"
                                >
                                    <span v-if="item.type === 'create'">Create "#{{ item.value }}"</span>
                                    <span v-else>#{{ item.value }}</span>
                                </div>
                            </div>
                            <div v-else-if="isTagMenuOpen && localTagInput.trim()" class="tag-combobox-menu">
                                <div class="tag-combobox-empty">No matching tags</div>
                            </div>
                        </div>
                    </div>

                    <div class="form-row">
                        <div class="form-group">
                            <label>Due Date</label>
                            <input type="date" v-model="localDueDate" @change="saveDueDate" title="Set Due Date">
                        </div>
                        <div class="form-group">
                            <label>Priority</label>
                            <select v-model="localPriority" @change="savePriority" title="Set Priority">
                                <option value="">Unassigned</option>
                                <option v-for="priority in priorities" :key="priority" :value="priority">{{ priority }}</option>
                            </select>
                        </div>
                        <div class="form-group">
                            <label>Color</label>
                            <div class="color-picker">
                                <button
                                    v-for="color in colors"
                                    :key="color"
                                    type="button"
                                    class="color-dot"
                                    :class="['bg-' + color, { selected: localColor === color }]"
                                    @click="saveColor(color)"
                                    :title="'Set color to ' + color"
                                ></button>
                            </div>
                        </div>
                    </div>

                    <div class="subtasks-section" v-if="isEdit">
                        <label>Subtasks</label>
                        <div class="progress-bar" v-if="subtasks.length > 0">
                            <div class="progress-fill" :style="{ width: progress + '%' }"></div>
                        </div>
                        <draggable
                            v-model="subtasks"
                            tag="ul"
                            class="subtask-list"
                            handle=".subtask-drag-handle"
                            ghost-class="subtask-ghost"
                            drag-class="subtask-drag"
                            :animation="150"
                            :disabled="!canDragSubtasks"
                        >
                            <li v-for="(st, index) in subtasks" :key="subtaskKey(st, index)" class="subtask-item">
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
                </div>

                <footer class="modal-footer">
                    <button v-if="isEdit" class="btn btn-danger" @click="deleteTask" title="Permanently delete this task">Delete Task</button>
                    <span v-else></span>
                    <button class="btn btn-primary" @click="submitModal" :title="isCreate ? 'Create task' : 'Save and close'">{{ isCreate ? 'Create Task' : 'OK' }}</button>
                </footer>
            </div>
        </div>
    `,
    data() {
        return {
            localTitle: '',
            localDescription: '',
            localDueDate: null,
            localPriority: '',
            localColor: 'gray',
            localTags: [],
            localColumnId: null,
            localColumnInput: '',
            isColumnMenuOpen: false,
            activeColumnIndex: 0,
            localTagInput: '',
            isTagMenuOpen: false,
            activeTagIndex: 0,
            maxTagSuggestions: 8,
            maxColumnSuggestions: 8,
            newSubtaskText: '',
            subtaskKeySeed: 0,
            subtaskKeyMap: typeof WeakMap === 'function' ? new WeakMap() : null,
            showTitleError: false,
            showColumnError: false,
            titleErrorMessage: 'Task title is required.',
            columnErrorMessage: 'Column is required.',
            colors: ['gray', 'red', 'orange', 'yellow', 'green', 'blue', 'purple', 'pink'],
            priorities: PRIORITY_VALUES,
            MAX_TASK_TITLE,
            MAX_COLUMN_NAME
        };
    },
    computed: {
        task() { return store.activeTaskId ? store.tasks[store.activeTaskId] : null; },
        draft() { return store.taskModalDraft || null; },
        mode() { return store.taskModalMode || (this.task ? 'edit' : null); },
        isEdit() { return this.mode === 'edit' && !!this.task; },
        isCreate() { return this.mode === 'create'; },
        isOpen() { return this.isEdit || this.isCreate; },
        subtasks: {
            get() { return this.isEdit ? (this.task.subtasks || []) : []; },
            set(value) { if (this.isEdit) mutations.reorderSubtasks(this.task.id, value); }
        },
        canDragSubtasks() { return this.subtasks.length > 1; },
        colorClass() { return `task-color-${this.localColor}`; },
        progress() {
            if (!this.subtasks.length) return 0;
            const done = this.subtasks.filter(st => st.done).length;
            return (done / this.subtasks.length) * 100;
        },
        selectedTags() {
            if (this.isEdit && Array.isArray(this.task.tags)) return this.task.tags;
            return this.localTags;
        },
        workspaceId() {
            if (this.isEdit && this.task) {
                const col = store.columns[this.task.columnId];
                return col ? col.workspaceId : null;
            }
            if (this.isCreate) {
                return (this.draft && this.draft.workspaceId) || store.currentWorkspaceId;
            }
            return null;
        },
        workspace() { return store.workspaces.find(ws => ws.id === this.workspaceId) || null; },
        workspaceColumns() {
            if (!this.workspace || !Array.isArray(this.workspace.columns)) return [];
            return this.workspace.columns.map(id => store.columns[id]).filter(Boolean);
        },
        workspaceTags() { return getWorkspaceTags(this.workspaceId, store); },
        tagMenuItems() {
            const selectedSet = new Set(this.selectedTags);
            const query = this.localTagInput.trim().toLowerCase();
            const items = [];
            const normalizedInput = normalizeTag(this.localTagInput);
            const hasInput = normalizedInput.length > 0;
            const exists = this.workspaceTags.includes(normalizedInput);
            if (hasInput && !exists && !selectedSet.has(normalizedInput)) items.push({ type: 'create', value: normalizedInput });
            const existing = this.workspaceTags
                .filter(tag => !selectedSet.has(tag))
                .filter(tag => !query || tag.includes(query))
                .slice(0, this.maxTagSuggestions)
                .map(tag => ({ type: 'existing', value: tag }));
            return items.concat(existing);
        },
        columnMenuItems() {
            const query = this.localColumnInput.trim();
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
        mode: { immediate: true, handler() { this.resetFromContext(); } },
        task() { if (this.isEdit) this.resetFromContext(); },
        draft: { deep: true, handler() { if (this.isCreate) this.resetFromContext(); } },
        tagMenuItems(items) { if (!items.length || this.activeTagIndex >= items.length) this.activeTagIndex = 0; },
        columnMenuItems(items) { if (!items.length || this.activeColumnIndex >= items.length) this.activeColumnIndex = 0; }
    },
    mounted() { document.addEventListener('keydown', this.onEsc); },
    beforeDestroy() { document.removeEventListener('keydown', this.onEsc); },
    methods: {
        resetFromContext() {
            this.showTitleError = false;
            this.showColumnError = false;
            this.titleErrorMessage = 'Task title is required.';
            this.columnErrorMessage = 'Column is required.';
            this.localTagInput = '';
            this.closeTagMenu();
            this.closeColumnMenu();
            if (this.isEdit && this.task) {
                this.localTitle = this.task.title || '';
                this.localDescription = this.task.description || '';
                this.localDueDate = this.task.dueDate || null;
                this.localPriority = this.task.priority || '';
                this.localColor = this.task.color || 'gray';
                this.localTags = Array.isArray(this.task.tags) ? this.task.tags.slice() : [];
                this.localColumnId = this.task.columnId || null;
                this.localColumnInput = this.getColumnTitle(this.localColumnId);
                return;
            }
            if (this.isCreate) {
                const draft = this.draft || {};
                this.localTitle = draft.title || '';
                this.localDescription = draft.description || '';
                this.localDueDate = draft.dueDate || null;
                this.localPriority = draft.priority || '';
                this.localColor = draft.color || 'gray';
                this.localTags = Array.isArray(draft.tags) ? draft.tags.slice() : [];
                this.localColumnId = draft.columnId && store.columns[draft.columnId] ? draft.columnId : (this.workspaceColumns[0] ? this.workspaceColumns[0].id : null);
                this.localColumnInput = this.localColumnId ? this.getColumnTitle(this.localColumnId) : '';
                return;
            }
            this.localTitle = '';
            this.localDescription = '';
            this.localDueDate = null;
            this.localPriority = '';
            this.localColor = 'gray';
            this.localTags = [];
            this.localColumnId = null;
            this.localColumnInput = '';
        },
        close() { mutations.closeTaskModal(); },
        toggleCompleted() { if (this.isEdit) mutations.toggleTaskCompletion(this.task.id); },
        onEsc(e) {
            if (e.key !== 'Escape' || !this.isOpen) return;
            if (this.isTagMenuOpen) { this.closeTagMenu(); return; }
            if (this.isColumnMenuOpen) { this.closeColumnMenu(); return; }
            this.close();
        },
        onTitleBlur() {
            const trimmed = (this.localTitle || '').replace(/\s+/g, ' ').trim();
            this.localTitle = trimmed;
            if (this.isEdit && this.task) {
                if (trimmed === this.task.title) return;
                const result = mutations.updateTask(this.task.id, { title: trimmed });
                if (!result.ok) {
                    this.showTitleError = true;
                    this.titleErrorMessage = result.error.message;
                    this.localTitle = this.task.title;
                    return;
                }
                this.showTitleError = false;
                return;
            }
        },
        saveDescription() { if (this.isEdit && this.localDescription !== this.task.description) mutations.updateTask(this.task.id, { description: this.localDescription }); },
        saveDueDate() { if (this.isEdit) mutations.updateTask(this.task.id, { dueDate: this.localDueDate }); },
        savePriority() { if (this.isEdit) mutations.setTaskPriority(this.task.id, this.localPriority || null); },
        saveColor(color) { this.localColor = color; if (this.isEdit) mutations.updateTask(this.task.id, { color }); },
        getColumnTitle(columnId) { const column = store.columns[columnId]; return column ? column.title : ''; },
        openColumnMenu() { this.isColumnMenuOpen = true; },
        closeColumnMenu() { this.isColumnMenuOpen = false; },
        onColumnInput() {
            const query = this.localColumnInput.trim().toLowerCase();
            const exact = this.workspaceColumns.find(col => col.title.toLowerCase() === query);
            this.localColumnId = exact ? exact.id : null;
            this.showColumnError = false;
            this.columnErrorMessage = 'Column is required.';
            this.openColumnMenu();
            this.activeColumnIndex = 0;
        },
        onColumnBlur() { if (this.isEdit) this.saveColumn(); },
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
            this.localColumnId = item.type === 'existing' ? item.id : null;
            this.localColumnInput = item.value;
            this.closeColumnMenu();
            if (this.isEdit) this.saveColumn();
        },
        resolveColumnIdForSubmit() {
            if (this.localColumnId && store.columns[this.localColumnId]) {
                return { ok: true, columnId: this.localColumnId };
            }
            const title = this.localColumnInput.trim();
            if (!title) {
                return { ok: false, error: { message: 'Column is required.' } };
            }
            const existing = this.workspaceColumns.find(col => col.title.toLowerCase() === title.toLowerCase());
            if (existing) {
                return { ok: true, columnId: existing.id };
            }
            const workspaceId = this.workspaceId || store.currentWorkspaceId;
            if (!workspaceId) {
                return { ok: false, error: { message: 'Target workspace does not exist.' } };
            }

            const result = mutations.addColumn(workspaceId, title);
            if (!result.ok) {
                return { ok: false, error: result.error };
            }
            return { ok: true, columnId: result.data.columnId };
        },
        saveColumn() {
            if (!this.isEdit || !this.task) return;
            const result = this.resolveColumnIdForSubmit();
            if (!result.ok) {
                this.showColumnError = true;
                this.columnErrorMessage = result.error.message;
                this.localColumnId = this.task.columnId;
                this.localColumnInput = this.getColumnTitle(this.task.columnId);
                return;
            }
            this.showColumnError = false;
            this.columnErrorMessage = 'Column is required.';
            const columnId = result.columnId;
            this.localColumnId = columnId;
            this.localColumnInput = this.getColumnTitle(columnId);
            if (columnId !== this.task.columnId) {
                const updateResult = mutations.updateTask(this.task.id, { columnId });
                if (!updateResult.ok) {
                    this.showColumnError = true;
                    this.columnErrorMessage = updateResult.error.message;
                    this.localColumnId = this.task.columnId;
                    this.localColumnInput = this.getColumnTitle(this.task.columnId);
                }
            }
        },
        focusTagInput() {
            this.openTagMenu();
            this.$nextTick(() => { if (this.$refs.tagInput) this.$refs.tagInput.focus(); });
        },
        onTagInput() { this.openTagMenu(); this.activeTagIndex = 0; },
        openTagMenu() { this.isTagMenuOpen = true; },
        closeTagMenu() { this.isTagMenuOpen = false; },
        moveTagSelection(step) {
            if (!this.tagMenuItems.length) return;
            const count = this.tagMenuItems.length;
            this.activeTagIndex = (this.activeTagIndex + step + count) % count;
        },
        selectActiveTag() {
            if (this.tagMenuItems.length) { this.selectTagItem(this.tagMenuItems[this.activeTagIndex]); return; }
            const normalized = normalizeTag(this.localTagInput);
            if (normalized) this.addTag(normalized);
        },
        selectTagItem(item) { if (item && item.value) this.addTag(item.value); },
        addTag(value) {
            const normalized = normalizeTag(value);
            if (!normalized) return;
            const current = this.selectedTags;
            if (current.includes(normalized)) { this.localTagInput = ''; this.closeTagMenu(); return; }
            if (this.isEdit) {
                const result = mutations.updateTask(this.task.id, { tags: [...current, normalized] });
                if (!result.ok) return;
            } else {
                this.localTags = [...current, normalized];
            }
            this.localTagInput = '';
            this.openTagMenu();
            this.$nextTick(() => { if (this.$refs.tagInput) this.$refs.tagInput.focus(); });
        },
        removeTag(tagToRemove) {
            const nextTags = this.selectedTags.filter(tag => tag !== tagToRemove);
            if (this.isEdit) {
                const result = mutations.updateTask(this.task.id, { tags: nextTags });
                if (!result.ok) return;
            } else {
                this.localTags = nextTags;
            }
        },
        getTagStyle(tag) {
            let hash = 0;
            for (let i = 0; i < tag.length; i++) {
                hash = tag.charCodeAt(i) + ((hash << 5) - hash);
            }
            const hues = [0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330];
            const hue = hues[Math.abs(hash) % hues.length];
            return {
                backgroundColor: `hsl(${hue}, 70%, 90%)`,
                color: `hsl(${hue}, 80%, 25%)`,
                border: `1px solid hsl(${hue}, 60%, 80%)`
            };
        },
        onTagBackspace() {
            if (this.localTagInput.length > 0 || !this.selectedTags.length) return;
            const nextTags = this.selectedTags.slice(0, this.selectedTags.length - 1);
            if (this.isEdit) {
                const result = mutations.updateTask(this.task.id, { tags: nextTags });
                if (!result.ok) return;
            } else {
                this.localTags = nextTags;
            }
        },
        submitModal() {
            if (!this.isCreate) { this.close(); return; }
            const columnResult = this.resolveColumnIdForSubmit();
            if (!columnResult.ok) {
                this.showColumnError = true;
                this.columnErrorMessage = columnResult.error.message;
                return;
            }

            this.showColumnError = false;
            this.columnErrorMessage = 'Column is required.';

            const createResult = mutations.createTask({
                title: this.localTitle,
                columnId: columnResult.columnId,
                description: this.localDescription,
                dueDate: this.localDueDate || null,
                priority: this.localPriority || null,
                color: this.localColor,
                tags: this.localTags
            });
            if (!createResult.ok) {
                if (createResult.error.field === 'column') {
                    this.showColumnError = true;
                    this.columnErrorMessage = createResult.error.message;
                } else {
                    this.showTitleError = true;
                    this.titleErrorMessage = createResult.error.message;
                }
                return;
            }

            this.showTitleError = false;
            this.titleErrorMessage = 'Task title is required.';
            mutations.closeTaskModal();
        },
        deleteTask() {
            if (!this.isEdit) return;
            mutations.openDialog({
                variant: 'confirm',
                title: 'Delete task?',
                message: 'This task will be permanently deleted.',
                confirmLabel: 'Delete task',
                cancelLabel: 'Cancel',
                destructive: true,
                action: {
                    type: 'task.delete',
                    payload: { taskId: this.task.id }
                }
            });
        },
        addSubtask() { if (this.isEdit && this.newSubtaskText.trim()) { mutations.addSubtask(this.task.id, this.newSubtaskText.trim()); this.newSubtaskText = ''; } },
        toggleSubtask(index, done) { if (this.isEdit) mutations.updateSubtask(this.task.id, index, { done }); },
        updateSubtaskText(index, text) { if (this.isEdit) mutations.updateSubtask(this.task.id, index, { text }); },
        deleteSubtask(index) { if (this.isEdit) mutations.deleteSubtask(this.task.id, index); },
        subtaskKey(st, index) {
            if (!st || typeof st !== 'object' || !this.subtaskKeyMap) return `subtask-${index}`;
            if (!this.subtaskKeyMap.has(st)) {
                this.subtaskKeySeed += 1;
                this.subtaskKeyMap.set(st, `subtask-${this.subtaskKeySeed}`);
            }
            return this.subtaskKeyMap.get(st);
        }
    },
    directives: {
        'click-outside': {
            bind: function (el, binding, vnode) {
                el.clickOutsideEvent = function (event) {
                    if (!(el === event.target || el.contains(event.target))) {
                        const handler = vnode.context[binding.expression];
                        if (typeof handler === 'function') handler(event);
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
