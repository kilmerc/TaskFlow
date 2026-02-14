import { store, mutations } from '../store.js';
import { normalizeTag } from '../utils/tagParser.js';
import { getActiveHashToken, replaceHashToken, getWorkspaceTags } from '../utils/tagAutocomplete.js';

Vue.component('kanban-quick-add', {
    props: {
        columnId: { type: String, required: true },
        showTrigger: { type: Boolean, default: true },
        insertPosition: {
            type: String,
            default: 'bottom',
            validator(value) {
                return ['top', 'bottom'].includes(value);
            }
        }
    },
    template: `
        <div class="quick-add-container" v-show="showTrigger || isAddingTask">
            <button
                v-if="showTrigger && !isAddingTask"
                type="button"
                class="quick-add-btn"
                aria-label="Add a task"
                @click.stop="startAddingTask"
            >
                <i class="fas fa-plus"></i> Add
            </button>
            <div v-else-if="isAddingTask" class="quick-add-input-wrapper" v-click-outside="finishAddingTask">
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
    `,
    data() {
        return {
            isAddingTask: false,
            newTaskTitle: '',
            quickAddError: '',
            isTagMenuOpen: false,
            tagMenuItems: [],
            activeTagIndex: 0,
            activeTokenRange: null,
            tagMenuPosition: { top: 0, left: 0 },
            maxTagSuggestions: 8
        };
    },
    computed: {
        column() {
            return store.columns[this.columnId] || {};
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
            const result = mutations.addTask(this.columnId, this.newTaskTitle, {
                position: this.insertPosition
            });
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

            const workspaceTags = getWorkspaceTags(this.column.workspaceId, store);
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
                'boxSizing', 'width', 'height', 'overflowX', 'overflowY',
                'borderTopWidth', 'borderRightWidth', 'borderBottomWidth', 'borderLeftWidth',
                'paddingTop', 'paddingRight', 'paddingBottom', 'paddingLeft',
                'fontStyle', 'fontVariant', 'fontWeight', 'fontStretch', 'fontSize',
                'lineHeight', 'fontFamily', 'textAlign', 'textTransform', 'textIndent',
                'textDecoration', 'letterSpacing', 'wordSpacing', 'tabSize', 'MozTabSize'
            ];

            mirrorProps.forEach(prop => { div.style[prop] = style[prop]; });

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
        }
    }
});
