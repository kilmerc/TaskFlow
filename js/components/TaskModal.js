import { MAX_COLUMN_NAME, MAX_TASK_TITLE, store, mutations } from '../store.js';
import { PRIORITY_VALUES } from '../utils/taskFilters.js';
import { getWorkspaceTags } from '../utils/tagAutocomplete.js';
import { useUniqueId } from '../composables/useUniqueId.js';

const { ref, computed, watch, nextTick, onMounted, onBeforeUnmount } = Vue;

const TaskModal = {
    name: 'TaskModal',
    template: `
        <div class="modal-backdrop" @click.self="close" v-if="isOpen">
            <div ref="modalContent" class="modal-content" :class="colorClass">
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
                    <div v-if="isEdit" class="dropdown modal-task-actions" :class="{ active: isTaskActionsOpen }" v-click-outside="onTaskActionsOutside">
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
    setup() {
        const modalContent = ref(null);
        const tagEditor = ref(null);
        const columnPicker = ref(null);
        const taskActionsTrigger = ref(null);

        const localTitle = ref('');
        const localDescription = ref('');
        const localDueDate = ref(null);
        const localPriority = ref('');
        const localColor = ref('gray');
        const localTags = ref([]);
        const localColumnId = ref(null);
        const localColumnInput = ref('');
        const showTitleError = ref(false);
        const showColumnError = ref(false);
        const titleErrorMessage = ref('Task title is required.');
        const columnErrorMessage = ref('Column is required.');
        const colors = ['gray', 'red', 'orange', 'yellow', 'green', 'blue', 'purple', 'pink'];
        const priorities = PRIORITY_VALUES;
        const isTaskActionsOpen = ref(false);
        const taskActionsMenuId = useUniqueId('task-actions');

        const task = computed(() => store.activeTaskId ? store.tasks[store.activeTaskId] : null);
        const draft = computed(() => store.taskModalDraft || null);
        const mode = computed(() => store.taskModalMode || (task.value ? 'edit' : null));
        const isEdit = computed(() => mode.value === 'edit' && !!task.value);
        const isCreate = computed(() => mode.value === 'create');
        const isOpen = computed(() => isEdit.value || isCreate.value);
        const colorClass = computed(() => `task-color-${localColor.value}`);

        const selectedTags = computed(() => {
            if (isEdit.value && Array.isArray(task.value.tags)) {
                return task.value.tags;
            }
            return localTags.value;
        });

        const workspaceId = computed(() => {
            if (isEdit.value && task.value) {
                const col = store.columns[task.value.columnId];
                return col ? col.workspaceId : null;
            }
            if (isCreate.value) {
                return (draft.value && draft.value.workspaceId) || store.currentWorkspaceId;
            }
            return null;
        });

        const workspace = computed(() => {
            return store.workspaces.find(ws => ws.id === workspaceId.value) || null;
        });

        const workspaceColumns = computed(() => {
            if (!workspace.value || !Array.isArray(workspace.value.columns)) return [];
            return workspace.value.columns.map(id => store.columns[id]).filter(Boolean);
        });

        const workspaceTags = computed(() => {
            return getWorkspaceTags(workspaceId.value, store);
        });

        watch(mode, () => {
            resetFromContext();
        }, { immediate: true });

        watch(task, () => {
            if (isEdit.value) {
                resetFromContext();
            }
        });

        watch(draft, () => {
            if (isCreate.value) {
                resetFromContext();
            }
        }, { deep: true });

        onMounted(() => {
            document.addEventListener('keydown', onEsc);
        });

        onBeforeUnmount(() => {
            document.removeEventListener('keydown', onEsc);
        });

        function resetFromContext() {
            closeTaskActions(false);
            showTitleError.value = false;
            showColumnError.value = false;
            titleErrorMessage.value = 'Task title is required.';
            columnErrorMessage.value = 'Column is required.';
            if (tagEditor.value) {
                tagEditor.value.reset();
            }
            if (columnPicker.value) {
                columnPicker.value.reset();
            }

            if (isEdit.value && task.value) {
                localTitle.value = task.value.title || '';
                localDescription.value = task.value.description || '';
                localDueDate.value = task.value.dueDate || null;
                localPriority.value = task.value.priority || '';
                localColor.value = task.value.color || 'gray';
                localTags.value = Array.isArray(task.value.tags) ? task.value.tags.slice() : [];
                localColumnId.value = task.value.columnId || null;
                localColumnInput.value = getColumnTitle(localColumnId.value);
                return;
            }

            if (isCreate.value) {
                const draftValue = draft.value || {};
                localTitle.value = draftValue.title || '';
                localDescription.value = draftValue.description || '';
                localDueDate.value = draftValue.dueDate || null;
                localPriority.value = draftValue.priority || '';
                localColor.value = draftValue.color || 'gray';
                localTags.value = Array.isArray(draftValue.tags) ? draftValue.tags.slice() : [];
                localColumnId.value = draftValue.columnId && store.columns[draftValue.columnId]
                    ? draftValue.columnId
                    : (workspaceColumns.value[0] ? workspaceColumns.value[0].id : null);
                localColumnInput.value = localColumnId.value ? getColumnTitle(localColumnId.value) : '';
                return;
            }

            localTitle.value = '';
            localDescription.value = '';
            localDueDate.value = null;
            localPriority.value = '';
            localColor.value = 'gray';
            localTags.value = [];
            localColumnId.value = null;
            localColumnInput.value = '';
        }

        function close() {
            mutations.closeTaskModal();
        }

        function toggleTaskActions() {
            if (isTaskActionsOpen.value) {
                closeTaskActions(false);
                return;
            }
            openTaskActionsAndFocus(0);
        }

        function openTaskActionsAndFocus(index = 0) {
            isTaskActionsOpen.value = true;
            nextTick(() => {
                const items = getTaskActionItems();
                if (!items.length) return;
                const bounded = Math.max(0, Math.min(index, items.length - 1));
                items[bounded].focus();
            });
        }

        function closeTaskActions(restoreTrigger = false) {
            if (!isTaskActionsOpen.value) return;
            isTaskActionsOpen.value = false;
            if (restoreTrigger) {
                nextTick(() => {
                    if (taskActionsTrigger.value) {
                        taskActionsTrigger.value.focus();
                    }
                });
            }
        }

        function onTaskActionsOutside() {
            closeTaskActions(false);
        }

        function getTaskActionItems() {
            if (!modalContent.value) return [];
            return Array.from(modalContent.value.querySelectorAll('.modal-task-actions .dropdown-menu .menu-item'));
        }

        function onTaskActionsKeydown(event) {
            const items = getTaskActionItems();
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
                closeTaskActions(true);
            }
        }

        function saveAsTemplate() {
            if (!isEdit.value || !task.value) return;
            closeTaskActions(false);
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
                    payload: { taskId: task.value.id }
                }
            });
        }

        function toggleCompleted() {
            if (isEdit.value && task.value) {
                mutations.toggleTaskCompletion(task.value.id);
            }
        }

        function onEsc(event) {
            if (event.key !== 'Escape' || !isOpen.value) return;
            close();
        }

        function onTitleBlur() {
            const trimmed = (localTitle.value || '').replace(/\s+/g, ' ').trim();
            localTitle.value = trimmed;
            if (isEdit.value && task.value) {
                if (trimmed === task.value.title) return;
                const result = mutations.updateTask(task.value.id, { title: trimmed });
                if (!result.ok) {
                    showTitleError.value = true;
                    titleErrorMessage.value = result.error.message;
                    localTitle.value = task.value.title;
                    return;
                }
                showTitleError.value = false;
            }
        }

        function saveDescription() {
            if (isEdit.value && task.value && localDescription.value !== task.value.description) {
                mutations.updateTask(task.value.id, { description: localDescription.value });
            }
        }

        function saveDueDate() {
            if (isEdit.value && task.value) {
                mutations.updateTask(task.value.id, { dueDate: localDueDate.value });
            }
        }

        function savePriority() {
            if (isEdit.value && task.value) {
                mutations.setTaskPriority(task.value.id, localPriority.value || null);
            }
        }

        function saveColor(color) {
            localColor.value = color;
            if (isEdit.value && task.value) {
                mutations.updateTask(task.value.id, { color });
            }
        }

        function getColumnTitle(columnId) {
            const column = store.columns[columnId];
            return column ? column.title : '';
        }

        function onColumnBlur() {
            if (isEdit.value) {
                saveColumn();
            }
        }

        function onColumnSelect() {
            if (isEdit.value) {
                saveColumn();
            }
        }

        function resolveColumnIdForSubmit() {
            if (localColumnId.value && store.columns[localColumnId.value]) {
                return { ok: true, columnId: localColumnId.value };
            }

            const title = localColumnInput.value.trim();
            if (!title) {
                return { ok: false, error: { message: 'Column is required.' } };
            }

            const existing = workspaceColumns.value.find(col => col.title.toLowerCase() === title.toLowerCase());
            if (existing) {
                return { ok: true, columnId: existing.id };
            }

            const currentWorkspaceId = workspaceId.value || store.currentWorkspaceId;
            if (!currentWorkspaceId) {
                return { ok: false, error: { message: 'Target workspace does not exist.' } };
            }

            const result = mutations.addColumn(currentWorkspaceId, title);
            if (!result.ok) {
                return { ok: false, error: result.error };
            }
            return { ok: true, columnId: result.data.columnId };
        }

        function saveColumn() {
            if (!isEdit.value || !task.value) return;
            const result = resolveColumnIdForSubmit();
            if (!result.ok) {
                showColumnError.value = true;
                columnErrorMessage.value = result.error.message;
                localColumnId.value = task.value.columnId;
                localColumnInput.value = getColumnTitle(task.value.columnId);
                return;
            }

            showColumnError.value = false;
            columnErrorMessage.value = 'Column is required.';
            const columnId = result.columnId;
            localColumnId.value = columnId;
            localColumnInput.value = getColumnTitle(columnId);
            if (columnId !== task.value.columnId) {
                const updateResult = mutations.updateTask(task.value.id, { columnId });
                if (!updateResult.ok) {
                    showColumnError.value = true;
                    columnErrorMessage.value = updateResult.error.message;
                    localColumnId.value = task.value.columnId;
                    localColumnInput.value = getColumnTitle(task.value.columnId);
                }
            }
        }

        function onAddTag(normalized) {
            const current = selectedTags.value;
            if (isEdit.value && task.value) {
                mutations.updateTask(task.value.id, { tags: [...current, normalized] });
            } else {
                localTags.value = [...current, normalized];
            }
        }

        function onRemoveTag(tagToRemove) {
            const nextTags = selectedTags.value.filter(tag => tag !== tagToRemove);
            if (isEdit.value && task.value) {
                mutations.updateTask(task.value.id, { tags: nextTags });
            } else {
                localTags.value = nextTags;
            }
        }

        function onRemoveLastTag() {
            const nextTags = selectedTags.value.slice(0, selectedTags.value.length - 1);
            if (isEdit.value && task.value) {
                mutations.updateTask(task.value.id, { tags: nextTags });
            } else {
                localTags.value = nextTags;
            }
        }

        function submitModal() {
            if (!isCreate.value) {
                close();
                return;
            }

            const columnResult = resolveColumnIdForSubmit();
            if (!columnResult.ok) {
                showColumnError.value = true;
                columnErrorMessage.value = columnResult.error.message;
                return;
            }

            showColumnError.value = false;
            columnErrorMessage.value = 'Column is required.';

            const createResult = mutations.createTask({
                title: localTitle.value,
                columnId: columnResult.columnId,
                description: localDescription.value,
                dueDate: localDueDate.value || null,
                priority: localPriority.value || null,
                color: localColor.value,
                tags: localTags.value
            });
            if (!createResult.ok) {
                if (createResult.error.field === 'column') {
                    showColumnError.value = true;
                    columnErrorMessage.value = createResult.error.message;
                } else {
                    showTitleError.value = true;
                    titleErrorMessage.value = createResult.error.message;
                }
                return;
            }

            showTitleError.value = false;
            titleErrorMessage.value = 'Task title is required.';
            mutations.closeTaskModal();
        }

        function deleteTask() {
            if (!isEdit.value || !task.value) return;
            mutations.openDialog({
                variant: 'confirm',
                title: 'Delete task?',
                message: 'This task will be permanently deleted.',
                confirmLabel: 'Delete task',
                cancelLabel: 'Cancel',
                destructive: true,
                action: {
                    type: 'task.delete',
                    payload: { taskId: task.value.id }
                }
            });
        }

        return {
            modalContent,
            tagEditor,
            columnPicker,
            taskActionsTrigger,
            localTitle,
            localDescription,
            localDueDate,
            localPriority,
            localColor,
            localTags,
            localColumnId,
            localColumnInput,
            showTitleError,
            showColumnError,
            titleErrorMessage,
            columnErrorMessage,
            colors,
            priorities,
            MAX_TASK_TITLE,
            MAX_COLUMN_NAME,
            taskActionsMenuId,
            isTaskActionsOpen,
            task,
            isEdit,
            isCreate,
            isOpen,
            colorClass,
            selectedTags,
            workspaceColumns,
            workspaceTags,
            close,
            toggleTaskActions,
            openTaskActionsAndFocus,
            closeTaskActions,
            onTaskActionsOutside,
            getTaskActionItems,
            onTaskActionsKeydown,
            saveAsTemplate,
            toggleCompleted,
            onTitleBlur,
            saveDescription,
            saveDueDate,
            savePriority,
            saveColor,
            onColumnBlur,
            onColumnSelect,
            onAddTag,
            onRemoveTag,
            onRemoveLastTag,
            submitModal,
            deleteTask
        };
    }
};

export default TaskModal;
