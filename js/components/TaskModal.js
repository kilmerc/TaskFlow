import { store, mutations } from '../store.js';
import { PRIORITY_VALUES } from '../utils/taskFilters.js';
import { normalizeTag } from '../utils/tagParser.js';
import { getWorkspaceTags } from '../utils/tagAutocomplete.js';

Vue.component('task-modal', {
    template: `
        <div class="modal-backdrop" @click.self="close" v-if="task">
            <div class="modal-content" :class="colorClass">
                <header class="modal-header">
                    <div class="modal-title-row">
                        <input
                            type="checkbox"
                            class="task-checkbox modal-checkbox"
                            :checked="task.isCompleted"
                            @change="toggleCompleted"
                            title="Mark as complete"
                        >
                        <input
                            class="modal-title-input"
                            :class="{ 'title-completed': task.isCompleted }"
                            v-model="localTitle"
                            @blur="saveTitle"
                            @keyup.enter="$event.target.blur()"
                            placeholder="Task Title"
                        >
                    </div>
                    <button class="close-btn" @click="close" title="Close Modal"><i class="fas fa-times"></i></button>
                </header>

                <div class="modal-body">
                    <div class="form-group">
                        <label>Description</label>
                        <textarea
                            v-model="localDescription"
                            @blur="saveDescription"
                            placeholder="Add a description..."
                            rows="4"
                        ></textarea>
                    </div>

                    <div class="form-group">
                        <label>Tags</label>
                        <div class="tag-combobox" v-click-outside="closeTagMenu">
                            <div class="tag-chip-list" @click="focusTagInput">
                                <span v-for="tag in selectedTags" :key="tag" class="tag-chip">
                                    #{{ tag }}
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
                                <option v-for="priority in priorities" :key="priority" :value="priority">
                                    {{ priority }}
                                </option>
                            </select>
                        </div>
                        <div class="form-group">
                            <label>Color</label>
                            <div class="color-picker">
                                <button
                                    v-for="color in colors"
                                    :key="color"
                                    class="color-dot"
                                    :class="['bg-' + color, { selected: localColor === color }]"
                                    @click="saveColor(color)"
                                    :title="'Set color to ' + color"
                                ></button>
                            </div>
                        </div>
                    </div>

                    <div class="subtasks-section">
                        <label>Subtasks</label>
                        <div class="progress-bar" v-if="subtasks.length > 0">
                            <div class="progress-fill" :style="{ width: progress + '%' }"></div>
                        </div>

                        <ul class="subtask-list">
                            <li v-for="(st, index) in subtasks" :key="index" class="subtask-item">
                                <input
                                    type="checkbox"
                                    :checked="st.done"
                                    @change="toggleSubtask(index, $event.target.checked)"
                                    title="Mark as done"
                                >
                                <input
                                    type="text"
                                    :value="st.text"
                                    @change="updateSubtaskText(index, $event.target.value)"
                                    class="subtask-input"
                                    :class="{ completed: st.done }"
                                    placeholder="Subtask..."
                                >
                                <button class="delete-subtask-btn" @click="deleteSubtask(index)" title="Delete Subtask">
                                    <i class="fas fa-trash-alt"></i>
                                </button>
                            </li>
                        </ul>

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
                    <button class="btn btn-danger" @click="deleteTask" title="Permanently delete this task">Delete Task</button>
                    <button class="btn btn-primary" @click="close" title="Save and close">OK</button>
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
            localTagInput: '',
            isTagMenuOpen: false,
            activeTagIndex: 0,
            maxTagSuggestions: 8,
            newSubtaskText: '',
            colors: ['gray', 'red', 'orange', 'yellow', 'green', 'blue', 'purple', 'pink'],
            priorities: PRIORITY_VALUES
        };
    },
    computed: {
        task() {
            return store.activeTaskId ? store.tasks[store.activeTaskId] : null;
        },
        subtasks() {
            return this.task ? (this.task.subtasks || []) : [];
        },
        colorClass() {
            return `task-color-${this.localColor}`;
        },
        progress() {
            if (!this.subtasks.length) return 0;
            const done = this.subtasks.filter(st => st.done).length;
            return (done / this.subtasks.length) * 100;
        },
        selectedTags() {
            if (!this.task || !Array.isArray(this.task.tags)) return [];
            return this.task.tags;
        },
        workspaceId() {
            if (!this.task) return null;
            const column = store.columns[this.task.columnId];
            return column ? column.workspaceId : null;
        },
        workspaceTags() {
            return getWorkspaceTags(this.workspaceId, store);
        },
        tagMenuItems() {
            const selectedSet = new Set(this.selectedTags);
            const query = this.localTagInput.trim().toLowerCase();
            const items = [];

            const normalizedInput = normalizeTag(this.localTagInput);
            const hasNormalizedInput = normalizedInput.length > 0;
            const existsInWorkspace = this.workspaceTags.includes(normalizedInput);
            const alreadySelected = selectedSet.has(normalizedInput);

            if (hasNormalizedInput && !existsInWorkspace && !alreadySelected) {
                items.push({
                    type: 'create',
                    value: normalizedInput
                });
            }

            const filteredExisting = this.workspaceTags
                .filter(tag => !selectedSet.has(tag))
                .filter(tag => !query || tag.includes(query))
                .slice(0, this.maxTagSuggestions)
                .map(tag => ({
                    type: 'existing',
                    value: tag
                }));

            return items.concat(filteredExisting);
        }
    },
    watch: {
        task: {
            immediate: true,
            handler(newTask) {
                if (newTask) {
                    this.localTitle = newTask.title;
                    this.localDescription = newTask.description || '';
                    this.localDueDate = newTask.dueDate;
                    this.localPriority = newTask.priority || '';
                    this.localColor = newTask.color || 'gray';
                } else {
                    this.localTitle = '';
                    this.localDescription = '';
                    this.localDueDate = null;
                    this.localPriority = '';
                    this.localColor = 'gray';
                }
                this.localTagInput = '';
                this.closeTagMenu();
            }
        },
        tagMenuItems(newItems) {
            if (!newItems.length) {
                this.activeTagIndex = 0;
                return;
            }
            if (this.activeTagIndex >= newItems.length) {
                this.activeTagIndex = 0;
            }
        }
    },
    mounted() {
        document.addEventListener('keydown', this.onEsc);
    },
    beforeDestroy() {
        document.removeEventListener('keydown', this.onEsc);
    },
    methods: {
        close() {
            store.activeTaskId = null;
        },
        toggleCompleted() {
            mutations.toggleTaskCompletion(this.task.id);
        },
        onEsc(e) {
            if (e.key !== 'Escape') return;
            if (this.isTagMenuOpen) {
                this.closeTagMenu();
                return;
            }
            this.close();
        },
        saveTitle() {
            if (this.localTitle.trim() !== this.task.title) {
                mutations.updateTask(this.task.id, { title: this.localTitle });
            }
        },
        saveDescription() {
            if (this.localDescription !== this.task.description) {
                mutations.updateTask(this.task.id, { description: this.localDescription });
            }
        },
        saveDueDate() {
            mutations.updateTask(this.task.id, { dueDate: this.localDueDate });
        },
        savePriority() {
            const value = this.localPriority || null;
            mutations.setTaskPriority(this.task.id, value);
        },
        saveColor(color) {
            this.localColor = color;
            mutations.updateTask(this.task.id, { color });
        },
        focusTagInput() {
            this.openTagMenu();
            this.$nextTick(() => {
                if (this.$refs.tagInput) {
                    this.$refs.tagInput.focus();
                }
            });
        },
        onTagInput() {
            this.openTagMenu();
            this.activeTagIndex = 0;
        },
        openTagMenu() {
            this.isTagMenuOpen = true;
        },
        closeTagMenu() {
            this.isTagMenuOpen = false;
        },
        moveTagSelection(step) {
            if (!this.tagMenuItems.length) return;
            this.openTagMenu();
            const count = this.tagMenuItems.length;
            this.activeTagIndex = (this.activeTagIndex + step + count) % count;
        },
        selectActiveTag() {
            if (this.tagMenuItems.length) {
                this.selectTagItem(this.tagMenuItems[this.activeTagIndex]);
                return;
            }
            const normalized = normalizeTag(this.localTagInput);
            if (normalized) {
                this.addTag(normalized);
            }
        },
        selectTagItem(item) {
            if (!item || !item.value) return;
            this.addTag(item.value);
        },
        addTag(value) {
            if (!this.task) return;

            const normalized = normalizeTag(value);
            if (!normalized) return;

            const current = Array.isArray(this.task.tags) ? this.task.tags : [];
            if (current.includes(normalized)) {
                this.localTagInput = '';
                this.closeTagMenu();
                return;
            }

            mutations.updateTask(this.task.id, { tags: [...current, normalized] });
            this.localTagInput = '';
            this.openTagMenu();

            this.$nextTick(() => {
                if (this.$refs.tagInput) {
                    this.$refs.tagInput.focus();
                }
            });
        },
        removeTag(tagToRemove) {
            if (!this.task || !Array.isArray(this.task.tags)) return;
            const nextTags = this.task.tags.filter(tag => tag !== tagToRemove);
            mutations.updateTask(this.task.id, { tags: nextTags });
        },
        onTagBackspace() {
            if (this.localTagInput.length > 0) return;
            if (!this.task || !Array.isArray(this.task.tags) || !this.task.tags.length) return;
            const nextTags = this.task.tags.slice(0, this.task.tags.length - 1);
            mutations.updateTask(this.task.id, { tags: nextTags });
        },
        deleteTask() {
            if (confirm('Are you sure you want to delete this task?')) {
                mutations.deleteTask(this.task.id);
            }
        },
        addSubtask() {
            if (this.newSubtaskText.trim()) {
                mutations.addSubtask(this.task.id, this.newSubtaskText.trim());
                this.newSubtaskText = '';
            }
        },
        toggleSubtask(index, done) {
            mutations.updateSubtask(this.task.id, index, { done });
        },
        updateSubtaskText(index, text) {
            mutations.updateSubtask(this.task.id, index, { text });
        },
        deleteSubtask(index) {
            mutations.deleteSubtask(this.task.id, index);
        }
    },
    directives: {
        'click-outside': {
            bind: function (el, binding, vnode) {
                el.clickOutsideEvent = function (event) {
                    if (!(el === event.target || el.contains(event.target))) {
                        vnode.context[binding.expression](event);
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
