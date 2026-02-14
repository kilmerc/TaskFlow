import { MAX_TASK_TITLE, store, mutations } from '../store.js';
import { PRIORITY_VALUES } from '../utils/taskFilters.js';

const TemplateGalleryModal = {
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
    data() {
        return {
            editingTemplateId: null,
            form: {
                name: '',
                description: '',
                tags: [],
                priority: '',
                color: 'gray',
                subtasks: []
            },
            newSubtaskText: '',
            formError: '',
            priorities: PRIORITY_VALUES,
            colors: ['gray', 'red', 'orange', 'yellow', 'green', 'blue', 'purple', 'pink'],
            MAX_TASK_TITLE
        };
    },
    computed: {
        isOpen() {
            return !!store.templateGalleryOpen;
        },
        workspaceId() {
            return store.currentWorkspaceId;
        },
        templates() {
            if (!this.workspaceId) return [];
            return Object.values(store.taskTemplates || {})
                .filter(template => template && template.workspaceId === this.workspaceId)
                .sort((a, b) => a.name.localeCompare(b.name));
        },
        editingTemplate() {
            return this.editingTemplateId ? store.taskTemplates[this.editingTemplateId] : null;
        },
        workspaceTags() {
            const tags = new Set();
            this.templates.forEach(template => {
                (template.tags || []).forEach(tag => tags.add(tag));
            });
            return Array.from(tags).sort((a, b) => a.localeCompare(b));
        }
    },
    watch: {
        isOpen: {
            immediate: true,
            handler(isOpen) {
                if (!isOpen) {
                    this.resetEditor();
                    return;
                }

                if (this.templates.length > 0) {
                    this.startEdit(this.templates[0]);
                } else {
                    this.resetEditor();
                }
            }
        },
        templates() {
            if (!this.isOpen) return;
            if (!this.templates.length) {
                this.resetEditor();
                return;
            }

            const stillExists = this.editingTemplateId
                && this.templates.some(template => template.id === this.editingTemplateId);
            if (!stillExists) {
                this.startEdit(this.templates[0]);
            }
        }
    },
    methods: {
        close() {
            mutations.closeTemplateGallery();
        },
        resetEditor() {
            this.editingTemplateId = null;
            this.formError = '';
            this.newSubtaskText = '';
            this.form = {
                name: '',
                description: '',
                tags: [],
                priority: '',
                color: 'gray',
                subtasks: []
            };
        },
        startEdit(template) {
            if (!template) return;
            this.editingTemplateId = template.id;
            this.formError = '';
            this.newSubtaskText = '';
            this.form = {
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
        },
        onAddTag(tag) {
            this.form.tags = [...this.form.tags, tag];
        },
        onRemoveTag(tagToRemove) {
            this.form.tags = this.form.tags.filter(tag => tag !== tagToRemove);
        },
        onRemoveLastTag() {
            this.form.tags = this.form.tags.slice(0, this.form.tags.length - 1);
        },
        addSubtask() {
            const text = (this.newSubtaskText || '').replace(/\s+/g, ' ').trim();
            if (!text) return;
            this.form.subtasks = [...this.form.subtasks, { text, done: false }];
            this.newSubtaskText = '';
        },
        updateSubtask(index, value) {
            const next = this.form.subtasks.slice();
            next[index] = {
                text: typeof value === 'string' ? value : '',
                done: false
            };
            this.form.subtasks = next;
        },
        removeSubtask(index) {
            const next = this.form.subtasks.slice();
            next.splice(index, 1);
            this.form.subtasks = next;
        },
        saveTemplate() {
            if (!this.editingTemplateId) return;

            const result = mutations.updateTaskTemplate(this.editingTemplateId, {
                name: this.form.name,
                description: this.form.description,
                tags: this.form.tags,
                priority: this.form.priority || null,
                color: this.form.color,
                subtasks: this.form.subtasks
            });

            if (!result.ok) {
                this.formError = result.error.message;
                return;
            }

            this.formError = '';
            const updated = store.taskTemplates[this.editingTemplateId];
            if (updated) {
                this.startEdit(updated);
            }
            mutations.pushToast({
                variant: 'success',
                message: 'Template updated.'
            });
        },
        confirmDelete(template) {
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
    }
};

export default TemplateGalleryModal;

