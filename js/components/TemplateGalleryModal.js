import { MAX_TASK_TITLE, store, mutations } from '../store.js';
import { PRIORITY_VALUES } from '../utils/taskFilters.js';

const { ref, computed, watch } = Vue;

const TemplateGalleryModal = {
    name: 'TemplateGalleryModal',
    template: `
        <div v-if="isOpen" class="modal-backdrop template-gallery-backdrop" @click.self="close">
            <div class="modal-content template-gallery-modal">
                <header class="modal-header">
                    <div class="modal-title-row">
                        <h3 class="template-gallery-title">Template Gallery</h3>
                    </div>
                    <button class="close-btn" @click="close" title="Close Template Gallery">
                        <i class="fas fa-times"></i>
                    </button>
                </header>

                <div class="modal-body template-gallery-body">
                    <aside class="template-gallery-list">
                        <div v-if="templates.length === 0" class="template-gallery-empty">
                            No templates yet. Save a task as template from the task modal menu.
                        </div>
                        <button
                            v-for="template in templates"
                            :key="template.id"
                            type="button"
                            class="template-gallery-item"
                            :class="{ active: template.id === editingTemplateId }"
                            @click="startEdit(template)"
                        >
                            <span class="template-gallery-item-name">{{ template.name }}</span>
                            <span class="template-gallery-item-meta">{{ template.tags.length }} tags</span>
                        </button>
                    </aside>

                    <section class="template-gallery-editor" v-if="editingTemplate">
                        <div class="form-group">
                            <label>Template Name</label>
                            <input
                                class="column-combobox-input"
                                v-model="form.name"
                                :maxlength="MAX_TASK_TITLE"
                                placeholder="Template name"
                            >
                            <div v-if="formError" class="form-error">{{ formError }}</div>
                        </div>

                        <div class="form-group">
                            <label>Description</label>
                            <textarea v-model="form.description" placeholder="Template description..." rows="3"></textarea>
                        </div>

                        <task-modal-tag-editor
                            :selected-tags="form.tags"
                            :workspace-tags="workspaceTags"
                            @add-tag="onAddTag"
                            @remove-tag="onRemoveTag"
                            @remove-last-tag="onRemoveLastTag"
                        ></task-modal-tag-editor>

                        <div class="form-row">
                            <div class="form-group">
                                <label>Priority</label>
                                <select v-model="form.priority">
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
                                        :class="['bg-' + color, { selected: form.color === color }]"
                                        @click="form.color = color"
                                        :title="'Set color to ' + color"
                                    ></button>
                                </div>
                            </div>
                        </div>

                        <div class="form-group template-subtasks-group">
                            <label>Subtasks</label>
                            <div class="template-subtask-list">
                                <div v-for="(subtask, index) in form.subtasks" :key="index" class="template-subtask-item">
                                    <input type="checkbox" class="subtask-checkbox" disabled>
                                    <input
                                        class="subtask-input"
                                        :value="subtask.text"
                                        @input="updateSubtask(index, $event.target.value)"
                                        placeholder="Subtask text"
                                    >
                                    <button type="button" class="delete-subtask-btn" @click="removeSubtask(index)" title="Delete subtask">
                                        <i class="fas fa-trash-alt"></i>
                                    </button>
                                </div>
                            </div>
                            <div class="add-subtask">
                                <i class="fas fa-plus"></i>
                                <input
                                    v-model="newSubtaskText"
                                    @keyup.enter="addSubtask"
                                    placeholder="Add subtask..."
                                >
                            </div>
                        </div>
                    </section>
                </div>

                <footer class="modal-footer template-gallery-footer">
                    <button
                        v-if="editingTemplate"
                        class="btn btn-danger"
                        @click="confirmDelete(editingTemplate)"
                        title="Delete template"
                    >
                        Delete Template
                    </button>
                    <span v-else></span>
                    <button
                        class="btn btn-primary"
                        :disabled="!editingTemplate"
                        @click="saveTemplate"
                        title="Save template changes"
                    >
                        Save Changes
                    </button>
                </footer>
            </div>
        </div>
    `,
    setup() {
        const editingTemplateId = ref(null);
        const form = ref({
            name: '',
            description: '',
            tags: [],
            priority: '',
            color: 'gray',
            subtasks: []
        });
        const newSubtaskText = ref('');
        const formError = ref('');
        const priorities = PRIORITY_VALUES;
        const colors = ['gray', 'red', 'orange', 'yellow', 'green', 'blue', 'purple', 'pink'];

        const isOpen = computed(() => !!store.templateGalleryOpen);
        const workspaceId = computed(() => store.currentWorkspaceId);

        const templates = computed(() => {
            if (!workspaceId.value) return [];
            return Object.values(store.taskTemplates || {})
                .filter(template => template && template.workspaceId === workspaceId.value)
                .sort((a, b) => a.name.localeCompare(b.name));
        });

        const editingTemplate = computed(() => {
            return editingTemplateId.value ? store.taskTemplates[editingTemplateId.value] : null;
        });

        const workspaceTags = computed(() => {
            const tags = new Set();
            templates.value.forEach(template => {
                (template.tags || []).forEach(tag => tags.add(tag));
            });
            return Array.from(tags).sort((a, b) => a.localeCompare(b));
        });

        watch(isOpen, (open) => {
            if (!open) {
                resetEditor();
                return;
            }

            if (templates.value.length > 0) {
                startEdit(templates.value[0]);
            } else {
                resetEditor();
            }
        }, { immediate: true });

        watch(templates, () => {
            if (!isOpen.value) return;
            if (!templates.value.length) {
                resetEditor();
                return;
            }

            const stillExists = editingTemplateId.value
                && templates.value.some(template => template.id === editingTemplateId.value);
            if (!stillExists) {
                startEdit(templates.value[0]);
            }
        });

        function close() {
            mutations.closeTemplateGallery();
        }

        function resetEditor() {
            editingTemplateId.value = null;
            formError.value = '';
            newSubtaskText.value = '';
            form.value = {
                name: '',
                description: '',
                tags: [],
                priority: '',
                color: 'gray',
                subtasks: []
            };
        }

        function startEdit(template) {
            if (!template) return;
            editingTemplateId.value = template.id;
            formError.value = '';
            newSubtaskText.value = '';
            form.value = {
                name: template.name || '',
                description: template.description || '',
                tags: Array.isArray(template.tags) ? template.tags.slice() : [],
                priority: template.priority || '',
                color: template.color || 'gray',
                subtasks: Array.isArray(template.subtasks)
                    ? template.subtasks.map(subtask => ({
                        text: typeof subtask.text === 'string' ? subtask.text : '',
                        done: false
                    }))
                    : []
            };
        }

        function onAddTag(tag) {
            form.value.tags = [...form.value.tags, tag];
        }

        function onRemoveTag(tagToRemove) {
            form.value.tags = form.value.tags.filter(tag => tag !== tagToRemove);
        }

        function onRemoveLastTag() {
            form.value.tags = form.value.tags.slice(0, form.value.tags.length - 1);
        }

        function addSubtask() {
            const text = (newSubtaskText.value || '').replace(/\s+/g, ' ').trim();
            if (!text) return;
            form.value.subtasks = [...form.value.subtasks, { text, done: false }];
            newSubtaskText.value = '';
        }

        function updateSubtask(index, value) {
            const next = form.value.subtasks.slice();
            next[index] = {
                text: typeof value === 'string' ? value : '',
                done: false
            };
            form.value.subtasks = next;
        }

        function removeSubtask(index) {
            const next = form.value.subtasks.slice();
            next.splice(index, 1);
            form.value.subtasks = next;
        }

        function saveTemplate() {
            if (!editingTemplateId.value) return;

            const result = mutations.updateTaskTemplate(editingTemplateId.value, {
                name: form.value.name,
                description: form.value.description,
                tags: form.value.tags,
                priority: form.value.priority || null,
                color: form.value.color,
                subtasks: form.value.subtasks
            });

            if (!result.ok) {
                formError.value = result.error.message;
                return;
            }

            formError.value = '';
            const updated = store.taskTemplates[editingTemplateId.value];
            if (updated) {
                startEdit(updated);
            }
            mutations.pushToast({
                variant: 'success',
                message: 'Template updated.'
            });
        }

        function confirmDelete(template) {
            if (!template) return;
            mutations.openDialog({
                variant: 'confirm',
                title: 'Delete template?',
                message: `Delete template "${template.name}"?`,
                confirmLabel: 'Delete template',
                cancelLabel: 'Cancel',
                destructive: true,
                action: {
                    type: 'template.delete',
                    payload: { templateId: template.id }
                }
            });
        }

        return {
            editingTemplateId,
            form,
            newSubtaskText,
            formError,
            priorities,
            colors,
            MAX_TASK_TITLE,
            isOpen,
            templates,
            editingTemplate,
            workspaceTags,
            close,
            startEdit,
            onAddTag,
            onRemoveTag,
            onRemoveLastTag,
            addSubtask,
            updateSubtask,
            removeSubtask,
            saveTemplate,
            confirmDelete
        };
    }
};

export default TemplateGalleryModal;
