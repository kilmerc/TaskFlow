import { MAX_COLUMN_NAME, MAX_TASK_TITLE, store, mutations } from '../store.js';
import { PRIORITY_VALUES } from '../utils/taskFilters.js';
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
                    <div v-if="isEdit" class="dropdown modal-task-actions" :class="{ active: isTaskActionsOpen }" v-click-outside="closeTaskActions">
                        <button
                            ref="taskActionsTrigger"
                            type="button"
                            class="column-menu-trigger"
                            aria-label="Task actions"
                            aria-haspopup="menu"
                            :aria-expanded="isTaskActionsOpen ? 'true' : 'false'"
                            :aria-controls="taskActionsMenuId"
                            @click="toggleTaskActions"
                            @keydown.down.prevent="openTaskActionsAndFocus(0)"
                            @keydown.up.prevent="openTaskActionsAndFocus(getTaskActionItems().length - 1)"
                            @keydown.esc.prevent="closeTaskActions(true)"
                        >
                            <i class="fas fa-ellipsis-h" aria-hidden="true"></i>
                        </button>
                        <div
                            v-if="isTaskActionsOpen"
                            class="dropdown-menu"
                            :id="taskActionsMenuId"
                            role="menu"
                            @keydown="onTaskActionsKeydown"
                        >
                            <button class="menu-item" role="menuitem" type="button" @click="saveAsTemplate">Save as template</button>
                        </div>
                    </div>
                    <button class="close-btn" @click="close" title="Close Modal"><i class="fas fa-times"></i></button>
                </header>

                <div class="modal-body">
                    <div v-if="showTitleError" class="form-error">{{ titleErrorMessage }}</div>

                    <task-modal-column-picker
                        ref="columnPicker"
                        :workspace-columns="workspaceColumns"
                        :column-id="localColumnId"
                        :column-input="localColumnInput"
                        :show-error="showColumnError"
                        :error-message="columnErrorMessage"
                        @update:columnId="localColumnId = $event"
                        @update:columnInput="localColumnInput = $event"
                        @clear-error="showColumnError = false; columnErrorMessage = 'Column is required.'"
                        @blur="onColumnBlur"
                        @select="onColumnSelect"
                    ></task-modal-column-picker>

                    <div class="form-group">
                        <label>Description</label>
                        <textarea v-model="localDescription" @blur="saveDescription" placeholder="Add a description..." rows="4"></textarea>
                    </div>

                    <task-modal-tag-editor
                        ref="tagEditor"
                        :selected-tags="selectedTags"
                        :workspace-tags="workspaceTags"
                        @add-tag="onAddTag"
                        @remove-tag="onRemoveTag"
                        @remove-last-tag="onRemoveLastTag"
                    ></task-modal-tag-editor>

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

                    <task-modal-subtasks
                        v-if="isEdit"
                        :task-id="task.id"
                    ></task-modal-subtasks>
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
            showTitleError: false,
            showColumnError: false,
            titleErrorMessage: 'Task title is required.',
            columnErrorMessage: 'Column is required.',
            colors: ['gray', 'red', 'orange', 'yellow', 'green', 'blue', 'purple', 'pink'],
            priorities: PRIORITY_VALUES,
            MAX_TASK_TITLE,
            MAX_COLUMN_NAME,
            isTaskActionsOpen: false,
            taskActionsMenuId: `task-actions-${Math.random().toString(36).slice(2)}`
        };
    },
    computed: {
        task() { return store.activeTaskId ? store.tasks[store.activeTaskId] : null; },
        draft() { return store.taskModalDraft || null; },
        mode() { return store.taskModalMode || (this.task ? 'edit' : null); },
        isEdit() { return this.mode === 'edit' && !!this.task; },
        isCreate() { return this.mode === 'create'; },
        isOpen() { return this.isEdit || this.isCreate; },
        colorClass() { return `task-color-${this.localColor}`; },
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
        workspaceTags() { return getWorkspaceTags(this.workspaceId, store); }
    },
    watch: {
        mode: { immediate: true, handler() { this.resetFromContext(); } },
        task() { if (this.isEdit) this.resetFromContext(); },
        draft: { deep: true, handler() { if (this.isCreate) this.resetFromContext(); } }
    },
    mounted() { document.addEventListener('keydown', this.onEsc); },
    beforeDestroy() { document.removeEventListener('keydown', this.onEsc); },
    methods: {
        resetFromContext() {
            this.closeTaskActions(false);
            this.showTitleError = false;
            this.showColumnError = false;
            this.titleErrorMessage = 'Task title is required.';
            this.columnErrorMessage = 'Column is required.';
            if (this.$refs.tagEditor) this.$refs.tagEditor.reset();
            if (this.$refs.columnPicker) this.$refs.columnPicker.reset();
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
        toggleTaskActions() {
            if (this.isTaskActionsOpen) {
                this.closeTaskActions(false);
                return;
            }
            this.openTaskActionsAndFocus(0);
        },
        openTaskActionsAndFocus(index = 0) {
            this.isTaskActionsOpen = true;
            this.$nextTick(() => {
                const items = this.getTaskActionItems();
                if (!items.length) return;
                const bounded = Math.max(0, Math.min(index, items.length - 1));
                items[bounded].focus();
            });
        },
        closeTaskActions(restoreTrigger = false) {
            if (!this.isTaskActionsOpen) return;
            this.isTaskActionsOpen = false;
            if (restoreTrigger) {
                this.$nextTick(() => {
                    if (this.$refs.taskActionsTrigger) {
                        this.$refs.taskActionsTrigger.focus();
                    }
                });
            }
        },
        getTaskActionItems() {
            if (!this.$el) return [];
            return Array.from(this.$el.querySelectorAll('.modal-task-actions .dropdown-menu .menu-item'));
        },
        onTaskActionsKeydown(event) {
            const items = this.getTaskActionItems();
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
                this.closeTaskActions(true);
            }
        },
        saveAsTemplate() {
            if (!this.isEdit || !this.task) return;
            this.closeTaskActions(true);
            mutations.openDialog({
                variant: 'prompt',
                title: 'Save as template',
                message: 'Enter a template name.',
                confirmLabel: 'Save',
                cancelLabel: 'Cancel',
                input: {
                    placeholder: 'Template name',
                    maxLength: MAX_TASK_TITLE
                },
                action: {
                    type: 'template.saveFromTask',
                    payload: { taskId: this.task.id }
                }
            });
        },
        toggleCompleted() { if (this.isEdit) mutations.toggleTaskCompletion(this.task.id); },
        onEsc(e) {
            if (e.key !== 'Escape' || !this.isOpen) return;
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
        onColumnBlur() { if (this.isEdit) this.saveColumn(); },
        onColumnSelect() { if (this.isEdit) this.saveColumn(); },
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
        onAddTag(normalized) {
            const current = this.selectedTags;
            if (this.isEdit) {
                mutations.updateTask(this.task.id, { tags: [...current, normalized] });
            } else {
                this.localTags = [...current, normalized];
            }
        },
        onRemoveTag(tagToRemove) {
            const nextTags = this.selectedTags.filter(tag => tag !== tagToRemove);
            if (this.isEdit) {
                mutations.updateTask(this.task.id, { tags: nextTags });
            } else {
                this.localTags = nextTags;
            }
        },
        onRemoveLastTag() {
            const nextTags = this.selectedTags.slice(0, this.selectedTags.length - 1);
            if (this.isEdit) {
                mutations.updateTask(this.task.id, { tags: nextTags });
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
        }
    }
});
