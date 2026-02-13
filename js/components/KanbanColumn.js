import { MAX_COLUMN_NAME, store, mutations } from '../store.js';
import { printColumn } from '../utils/print.js';
import { hasActiveFilters, taskMatchesFilters } from '../utils/taskFilters.js';
import { normalizeTag } from '../utils/tagParser.js';
import { getActiveHashToken, replaceHashToken, getWorkspaceTags } from '../utils/tagAutocomplete.js';

Vue.component('kanban-column', {
    props: {
        columnId: {
            type: String,
            required: true
        }
    },
    template: `
        <div class="kanban-column">
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

            <div class="task-list">
                <draggable
                    v-model="displayTasks"
                    group="tasks"
                    class="task-list-draggable"
                    ghost-class="task-ghost"
                    drag-class="task-drag"
                    :animation="150"
                    :disabled="hasFilters"
                    @end="onTaskDrop"
                >
                    <task-card
                        v-for="taskId in displayTasks"
                        :key="taskId"
                        :task-id="taskId"
                    ></task-card>
                </draggable>

                <div class="quick-add-container">
                    <button
                        v-if="!isAddingTask"
                        type="button"
                        class="quick-add-btn"
                        aria-label="Add a task"
                        @click.stop="startAddingTask"
                    >
                        <i class="fas fa-plus"></i> Add
                    </button>
                    <div v-else class="quick-add-input-wrapper" v-click-outside="finishAddingTask">
                        <textarea
                            ref="addTaskInput"
                            v-model="newTaskTitle"
                            placeholder="Enter a title for this card..."
                            @keydown.enter.prevent="onQuickAddEnter"
                            @keydown.tab="onQuickAddTab"
                            @keydown.down="onQuickAddArrow(1, $event)"
                            @keydown.up="onQuickAddArrow(-1, $event)"
                            @keydown.esc.prevent="onQuickAddEsc"
                            @input="onQuickAddInput"
                            @click="refreshQuickAddTagMenu"
                            @keyup="onQuickAddKeyup"
                            rows="2"
                            :maxlength="200"
                            aria-label="Task title"
                        ></textarea>
                        <div v-if="quickAddError" class="form-error">{{ quickAddError }}</div>

                        <div
                            v-if="isTagMenuOpen && tagMenuItems.length"
                            class="quick-add-tag-menu"
                            :style="{ top: tagMenuPosition.top + 'px', left: tagMenuPosition.left + 'px' }"
                        >
                            <div
                                v-for="(item, index) in tagMenuItems"
                                :key="item.type + '-' + item.value"
                                class="quick-add-tag-item"
                                :class="{ active: index === activeTagIndex, 'is-create': item.type === 'create' }"
                                @mousedown.prevent="selectQuickAddTag(item)"
                            >
                                <span v-if="item.type === 'create'">Create "#{{ item.value }}"</span>
                                <span v-else>#{{ item.value }}</span>
                            </div>
                        </div>

                        <div class="add-actions">
                            <button class="btn-primary" @mousedown.prevent="confirmAddTask" title="Add Card">Add Card</button>
                            <button class="btn-text" @mousedown.prevent="cancelAddingTask" aria-label="Cancel add task"><i class="fas fa-times"></i></button>
                        </div>
                    </div>
                </div>

                <div v-if="completedCount > 0" class="completed-section">
                    <button type="button" class="completed-toggle" @click="toggleShowCompleted" :aria-expanded="showCompleted ? 'true' : 'false'">
                        <i class="fas" :class="showCompleted ? 'fa-chevron-down' : 'fa-chevron-right'"></i>
                        <span>{{ completedCount }} completed</span>
                    </button>
                    <div v-if="showCompleted" class="completed-tasks-list">
                        <task-card
                            v-for="taskId in completedTasks"
                            :key="taskId"
                            :task-id="taskId"
                        ></task-card>
                    </div>
                </div>
            </div>
        </div>
    `,
    data() {
        return {
            sharedStore: store,
            isRenaming: false,
            renameValue: '',
            renameError: '',
            isMenuOpen: false,
            menuId: `column-menu-${Math.random().toString(36).slice(2)}`,
            isAddingTask: false,
            newTaskTitle: '',
            quickAddError: '',
            isTagMenuOpen: false,
            tagMenuItems: [],
            activeTagIndex: 0,
            activeTokenRange: null,
            tagMenuPosition: {
                top: 0,
                left: 0
            },
            maxTagSuggestions: 8,
            MAX_COLUMN_NAME
        };
    },
    computed: {
        column() {
            return this.sharedStore.columns[this.columnId] || {};
        },
        activeFilters() {
            return this.sharedStore.activeFilters || { tags: [], priorities: [] };
        },
        hasFilters() {
            return hasActiveFilters(this.activeFilters);
        },
        filteredTaskIds() {
            const allTasks = this.sharedStore.columnTaskOrder[this.columnId] || [];
            if (!this.hasFilters) return allTasks;

            return allTasks.filter(taskId => {
                const task = this.sharedStore.tasks[taskId];
                return taskMatchesFilters(task, this.activeFilters);
            });
        },
        displayTasks: {
            get() {
                return this.filteredTaskIds.filter(taskId => {
                    const task = this.sharedStore.tasks[taskId];
                    return task && !task.isCompleted;
                });
            },
            set(value) {
                if (!this.hasFilters) {
                    const columnOrder = this.sharedStore.columnTaskOrder[this.columnId] || [];
                    const completedIds = columnOrder.filter(taskId => {
                        const task = this.sharedStore.tasks[taskId];
                        return task && task.isCompleted;
                    });
                    mutations.updateColumnTaskOrder(this.columnId, [...value, ...completedIds]);
                }
            }
        },
        completedTasks() {
            return this.filteredTaskIds
                .filter(taskId => {
                    const task = this.sharedStore.tasks[taskId];
                    return task && task.isCompleted;
                })
                .sort((a, b) => {
                    const aTask = this.sharedStore.tasks[a];
                    const bTask = this.sharedStore.tasks[b];
                    const aTime = Date.parse(aTask.completedAt || 0);
                    const bTime = Date.parse(bTask.completedAt || 0);
                    return bTime - aTime;
                });
        },
        showCompleted() {
            return this.column.showCompleted || false;
        },
        completedCount() {
            return this.completedTasks.length;
        }
    },
    watch: {
        displayTasks: function (newVal) {
            newVal.forEach(taskId => {
                const task = this.sharedStore.tasks[taskId];
                if (task && task.columnId !== this.columnId) {
                    task.columnId = this.columnId;
                }
            });
        }
    },
    methods: {
        startAddingTask() {
            this.isAddingTask = true;
            this.newTaskTitle = '';
            this.quickAddError = '';
            this.closeQuickAddTagMenu();
            this.$nextTick(() => {
                if (this.$refs.addTaskInput) {
                    this.$refs.addTaskInput.focus();
                }
            });
        },
        cancelAddingTask() {
            this.isAddingTask = false;
            this.quickAddError = '';
            this.closeQuickAddTagMenu();
        },
        finishAddingTask() {
            if (this.newTaskTitle.trim()) {
                this.confirmAddTask();
            } else {
                this.cancelAddingTask();
            }
        },
        confirmAddTask() {
            const result = mutations.addTask(this.columnId, this.newTaskTitle);
            if (!result.ok) {
                this.quickAddError = result.error.message;
                return;
            }
            this.quickAddError = '';
            this.newTaskTitle = '';
            this.closeQuickAddTagMenu();
            this.$nextTick(() => {
                if (this.$refs.addTaskInput) {
                    this.$refs.addTaskInput.focus();
                }
            });
        },
        onQuickAddEnter() {
            if (this.isTagMenuOpen && this.tagMenuItems.length) {
                this.acceptQuickAddTag();
                return;
            }
            this.confirmAddTask();
        },
        onQuickAddTab(event) {
            if (!this.isTagMenuOpen || !this.tagMenuItems.length) return;
            event.preventDefault();
            this.acceptQuickAddTag();
        },
        onQuickAddEsc() {
            if (this.isTagMenuOpen) {
                this.closeQuickAddTagMenu();
                return;
            }
            this.cancelAddingTask();
        },
        onQuickAddArrow(step, event) {
            if (!this.isTagMenuOpen || !this.tagMenuItems.length) return;
            event.preventDefault();
            const total = this.tagMenuItems.length;
            this.activeTagIndex = (this.activeTagIndex + step + total) % total;
        },
        onQuickAddInput() {
            this.activeTagIndex = 0;
            this.refreshQuickAddTagMenu();
        },
        onQuickAddKeyup(event) {
            if (['ArrowUp', 'ArrowDown', 'Enter', 'Escape', 'Tab'].includes(event.key)) {
                return;
            }
            this.refreshQuickAddTagMenu();
        },
        refreshQuickAddTagMenu() {
            if (!this.isAddingTask) return;

            const input = this.$refs.addTaskInput;
            if (!input) return;

            const caretIndex = typeof input.selectionStart === 'number' ? input.selectionStart : this.newTaskTitle.length;
            const token = getActiveHashToken(this.newTaskTitle, caretIndex);
            if (!token) {
                this.closeQuickAddTagMenu();
                return;
            }

            const workspaceTags = getWorkspaceTags(this.column.workspaceId, this.sharedStore);
            const query = (token.query || '').toLowerCase();

            const existingItems = workspaceTags
                .filter(tag => !query || tag.includes(query))
                .slice(0, this.maxTagSuggestions)
                .map(tag => ({ type: 'existing', value: tag }));

            const normalizedQuery = normalizeTag(token.query || '');
            const includeCreate = normalizedQuery && !workspaceTags.includes(normalizedQuery);

            const items = includeCreate
                ? [{ type: 'create', value: normalizedQuery }, ...existingItems]
                : existingItems;

            if (!items.length) {
                this.closeQuickAddTagMenu();
                return;
            }

            this.activeTokenRange = {
                start: token.start,
                end: token.end
            };
            this.tagMenuItems = items;
            if (this.activeTagIndex >= items.length) {
                this.activeTagIndex = 0;
            }
            this.isTagMenuOpen = true;
            this.positionQuickAddTagMenu(input, caretIndex);
        },
        acceptQuickAddTag() {
            if (!this.tagMenuItems.length) return;
            const item = this.tagMenuItems[this.activeTagIndex];
            this.selectQuickAddTag(item);
        },
        selectQuickAddTag(item) {
            if (!item || !item.value || !this.activeTokenRange) return;

            const replaced = replaceHashToken(this.newTaskTitle, this.activeTokenRange, item.value);
            this.newTaskTitle = replaced.text;
            this.closeQuickAddTagMenu();

            this.$nextTick(() => {
                const input = this.$refs.addTaskInput;
                if (!input) return;
                input.focus();
                input.selectionStart = replaced.caretIndex;
                input.selectionEnd = replaced.caretIndex;
                this.refreshQuickAddTagMenu();
            });
        },
        closeQuickAddTagMenu() {
            this.isTagMenuOpen = false;
            this.tagMenuItems = [];
            this.activeTagIndex = 0;
            this.activeTokenRange = null;
        },
        positionQuickAddTagMenu(textarea, caretIndex) {
            const caret = this.getTextareaCaretCoordinates(textarea, caretIndex);
            if (!caret) {
                this.tagMenuPosition = {
                    top: textarea.offsetHeight + 6,
                    left: 0
                };
                return;
            }

            const maxLeft = Math.max(0, textarea.clientWidth - 230);
            this.tagMenuPosition = {
                top: Math.max(34, caret.top + caret.lineHeight + 6),
                left: Math.max(0, Math.min(caret.left, maxLeft))
            };
        },
        getTextareaCaretCoordinates(textarea, caretIndex) {
            if (!textarea || typeof window === 'undefined') return null;

            const div = document.createElement('div');
            const style = window.getComputedStyle(textarea);
            const mirrorProps = [
                'boxSizing',
                'width',
                'height',
                'overflowX',
                'overflowY',
                'borderTopWidth',
                'borderRightWidth',
                'borderBottomWidth',
                'borderLeftWidth',
                'paddingTop',
                'paddingRight',
                'paddingBottom',
                'paddingLeft',
                'fontStyle',
                'fontVariant',
                'fontWeight',
                'fontStretch',
                'fontSize',
                'lineHeight',
                'fontFamily',
                'textAlign',
                'textTransform',
                'textIndent',
                'textDecoration',
                'letterSpacing',
                'wordSpacing',
                'tabSize',
                'MozTabSize'
            ];

            mirrorProps.forEach(prop => {
                div.style[prop] = style[prop];
            });

            div.style.position = 'absolute';
            div.style.visibility = 'hidden';
            div.style.whiteSpace = 'pre-wrap';
            div.style.wordWrap = 'break-word';
            div.style.overflow = 'hidden';
            div.style.left = '-9999px';
            div.style.top = '0';

            div.textContent = textarea.value.slice(0, caretIndex);
            const span = document.createElement('span');
            span.textContent = textarea.value.slice(caretIndex) || '\u200b';
            div.appendChild(span);

            document.body.appendChild(div);

            const lineHeight = parseFloat(style.lineHeight) || parseFloat(style.fontSize) || 16;
            const coordinates = {
                top: span.offsetTop - textarea.scrollTop,
                left: span.offsetLeft - textarea.scrollLeft,
                lineHeight
            };

            document.body.removeChild(div);
            return coordinates;
        },
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
            const allIds = [...this.displayTasks, ...this.completedTasks];
            const tasks = allIds.map(id => this.sharedStore.tasks[id]).filter(t => t);
            printColumn(this.column, tasks);
        },
        toggleShowCompleted() {
            mutations.toggleColumnShowCompleted(this.columnId);
        },
        deleteColumn() {
            this.isMenuOpen = false;
            const taskCount = (this.sharedStore.columnTaskOrder[this.columnId] || []).length;
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
        },
        onTaskDrop() {
            // Most logic handled by v-model setter and watcher.
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
