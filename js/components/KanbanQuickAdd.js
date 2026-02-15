import { store, mutations } from '../store.js';
import { normalizeTag, parseTagsFromTitle } from '../utils/tagParser.js';
import { getActiveHashToken, replaceHashToken, getWorkspaceTags } from '../utils/tagAutocomplete.js';
import { getActiveSlashToken, replaceSlashToken, parseTemplateCommand } from '../utils/templateAutocomplete.js';
import { uiCopy } from '../config/uiCopy.js';

const { ref, computed, nextTick } = Vue;

const KanbanQuickAdd = {
    name: 'KanbanQuickAdd',
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
                <app-icon name="plus"></app-icon> {{ uiCopy.actions.addTaskCta }}
            </button>
            <div v-else-if="isAddingTask" class="quick-add-input-wrapper" v-click-outside="finishAddingTask">
                <textarea
                    ref="addTaskInput"
                    v-model="newTaskTitle"
                    :placeholder="uiCopy.placeholders.quickAddTitle"
                    @keydown.enter.prevent="onQuickAddEnter"
                    @keydown.tab="onQuickAddTab"
                    @keydown.down="onQuickAddArrow(1, $event)"
                    @keydown.up="onQuickAddArrow(-1, $event)"
                    @keydown.esc.prevent="onQuickAddEsc"
                    @input="onQuickAddInput"
                    @click="refreshQuickAddSuggestionMenu"
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
                        @mousedown.prevent="selectQuickAddSuggestion(item)"
                    >
                        <span v-if="item.type === 'create'">Create "#{{ item.value }}"</span>
                        <span v-else-if="menuMode === 'template'">/{{ item.value }}</span>
                        <span v-else>#{{ item.value }}</span>
                    </div>
                </div>

                <div class="add-actions">
                    <button class="btn-primary" @mousedown.prevent="confirmAddTask" title="Add Card">{{ uiCopy.actions.addTask }}</button>
                    <button class="btn-text" @mousedown.prevent="cancelAddingTask" aria-label="Cancel add task"><app-icon name="x"></app-icon></button>
                </div>
            </div>
        </div>
    `,
    setup(props, { expose }) {
        const addTaskInput = ref(null);
        const isAddingTask = ref(false);
        const newTaskTitle = ref('');
        const quickAddError = ref('');
        const isTagMenuOpen = ref(false);
        const tagMenuItems = ref([]);
        const activeTagIndex = ref(0);
        const activeTokenRange = ref(null);
        const tagMenuPosition = ref({ top: 0, left: 0 });
        const maxTagSuggestions = 8;
        const menuMode = ref('tag');

        const column = computed(() => {
            return store.columns[props.columnId] || {};
        });

        const workspaceTemplates = computed(() => {
            if (!column.value.workspaceId) return [];
            return Object.values(store.taskTemplates || {})
                .filter(template => template && template.workspaceId === column.value.workspaceId)
                .sort((a, b) => a.name.localeCompare(b.name));
        });

        function startAddingTask() {
            isAddingTask.value = true;
            newTaskTitle.value = '';
            quickAddError.value = '';
            closeQuickAddTagMenu();
            nextTick(() => {
                if (addTaskInput.value) {
                    addTaskInput.value.focus();
                }
            });
        }

        function cancelAddingTask() {
            isAddingTask.value = false;
            quickAddError.value = '';
            closeQuickAddTagMenu();
        }

        function finishAddingTask() {
            if (newTaskTitle.value.trim()) {
                confirmAddTask({
                    keepOpen: false,
                    focusAfterSuccess: false
                });
            } else {
                cancelAddingTask();
            }
        }

        function confirmAddTask(options = {}) {
            const keepOpen = options.keepOpen !== false;
            const focusAfterSuccess = options.focusAfterSuccess !== false;

            const templateCommandResult = createFromTemplateCommand({
                keepOpen,
                focusAfterSuccess
            });
            if (templateCommandResult.handled) {
                return;
            }

            const result = mutations.addTask(props.columnId, newTaskTitle.value, {
                position: props.insertPosition
            });
            if (!result.ok) {
                quickAddError.value = result.error.message;
                return;
            }

            quickAddError.value = '';
            if (keepOpen) {
                newTaskTitle.value = '';
                closeQuickAddTagMenu();
                if (focusAfterSuccess) {
                    nextTick(() => {
                        if (addTaskInput.value) {
                            addTaskInput.value.focus();
                        }
                    });
                }
                return;
            }

            cancelAddingTask();
        }

        function onQuickAddEnter() {
            if (isTagMenuOpen.value && tagMenuItems.value.length) {
                acceptQuickAddSuggestion();
                return;
            }
            confirmAddTask();
        }

        function onQuickAddTab(event) {
            if (!isTagMenuOpen.value || !tagMenuItems.value.length) return;
            event.preventDefault();
            acceptQuickAddSuggestion();
        }

        function onQuickAddEsc() {
            if (isTagMenuOpen.value) {
                closeQuickAddTagMenu();
                return;
            }
            cancelAddingTask();
        }

        function onQuickAddArrow(step, event) {
            if (!isTagMenuOpen.value || !tagMenuItems.value.length) return;
            event.preventDefault();
            const total = tagMenuItems.value.length;
            activeTagIndex.value = (activeTagIndex.value + step + total) % total;
        }

        function onQuickAddInput() {
            quickAddError.value = '';
            activeTagIndex.value = 0;
            refreshQuickAddSuggestionMenu();
        }

        function onQuickAddKeyup(event) {
            if (['ArrowUp', 'ArrowDown', 'Enter', 'Escape', 'Tab'].includes(event.key)) {
                return;
            }
            refreshQuickAddSuggestionMenu();
        }

        function refreshQuickAddSuggestionMenu() {
            if (!isAddingTask.value) return;

            const input = addTaskInput.value;
            if (!input) return;

            const caretIndex = typeof input.selectionStart === 'number' ? input.selectionStart : newTaskTitle.value.length;

            const slashToken = getActiveSlashToken(newTaskTitle.value, caretIndex);
            if (slashToken) {
                const query = normalizeTag(slashToken.query || '');
                const items = workspaceTemplates.value
                    .filter(template => !query || template.name.includes(query))
                    .slice(0, maxTagSuggestions)
                    .map(template => ({ type: 'existing', value: template.name }));

                if (!items.length) {
                    closeQuickAddTagMenu();
                    return;
                }

                menuMode.value = 'template';
                activeTokenRange.value = { start: slashToken.start, end: slashToken.end };
                tagMenuItems.value = items;
                if (activeTagIndex.value >= items.length) {
                    activeTagIndex.value = 0;
                }
                isTagMenuOpen.value = true;
                positionQuickAddTagMenu(input, caretIndex);
                return;
            }

            const token = getActiveHashToken(newTaskTitle.value, caretIndex);
            if (!token) {
                closeQuickAddTagMenu();
                return;
            }

            const workspaceTags = getWorkspaceTags(column.value.workspaceId, store);
            const query = (token.query || '').toLowerCase();

            const existingItems = workspaceTags
                .filter(tag => !query || tag.includes(query))
                .slice(0, maxTagSuggestions)
                .map(tag => ({ type: 'existing', value: tag }));

            const normalizedQuery = normalizeTag(token.query || '');
            const includeCreate = normalizedQuery && !workspaceTags.includes(normalizedQuery);

            const items = includeCreate
                ? [{ type: 'create', value: normalizedQuery }, ...existingItems]
                : existingItems;

            if (!items.length) {
                closeQuickAddTagMenu();
                return;
            }

            menuMode.value = 'tag';
            activeTokenRange.value = { start: token.start, end: token.end };
            tagMenuItems.value = items;
            if (activeTagIndex.value >= items.length) {
                activeTagIndex.value = 0;
            }
            isTagMenuOpen.value = true;
            positionQuickAddTagMenu(input, caretIndex);
        }

        function acceptQuickAddSuggestion() {
            if (!tagMenuItems.value.length) return;
            const item = tagMenuItems.value[activeTagIndex.value];
            selectQuickAddSuggestion(item);
        }

        function selectQuickAddSuggestion(item) {
            if (!item || !item.value || !activeTokenRange.value) return;

            const replaced = menuMode.value === 'template'
                ? replaceSlashToken(newTaskTitle.value, activeTokenRange.value, item.value)
                : replaceHashToken(newTaskTitle.value, activeTokenRange.value, item.value);
            newTaskTitle.value = replaced.text;
            closeQuickAddTagMenu();

            nextTick(() => {
                const input = addTaskInput.value;
                if (!input) return;
                input.focus();
                input.selectionStart = replaced.caretIndex;
                input.selectionEnd = replaced.caretIndex;
                refreshQuickAddSuggestionMenu();
            });
        }

        function createFromTemplateCommand(options = {}) {
            const keepOpen = options.keepOpen !== false;
            const focusAfterSuccess = options.focusAfterSuccess !== false;
            const command = parseTemplateCommand(newTaskTitle.value);
            if (!command) {
                return { handled: false };
            }

            const normalizedTemplateName = normalizeTag(command.templateName);
            const selectedTemplate = workspaceTemplates.value.find(template => template.name === normalizedTemplateName);
            if (!selectedTemplate) {
                quickAddError.value = 'Select an existing template.';
                return { handled: true };
            }

            const parsed = parseTagsFromTitle(command.remainder || '');
            const result = mutations.createTaskFromTemplate({
                templateId: selectedTemplate.id,
                columnId: props.columnId,
                title: parsed.title,
                inlineTags: parsed.tags,
                position: props.insertPosition
            });
            if (!result.ok) {
                quickAddError.value = result.error.message;
                return { handled: true };
            }

            quickAddError.value = '';
            if (keepOpen) {
                newTaskTitle.value = '';
                closeQuickAddTagMenu();
                if (focusAfterSuccess) {
                    nextTick(() => {
                        if (addTaskInput.value) {
                            addTaskInput.value.focus();
                        }
                    });
                }
            } else {
                cancelAddingTask();
            }
            return { handled: true };
        }

        function closeQuickAddTagMenu() {
            isTagMenuOpen.value = false;
            tagMenuItems.value = [];
            activeTagIndex.value = 0;
            activeTokenRange.value = null;
            menuMode.value = 'tag';
        }

        function positionQuickAddTagMenu(textarea, caretIndex) {
            const caret = getTextareaCaretCoordinates(textarea, caretIndex);
            if (!caret) {
                tagMenuPosition.value = {
                    top: textarea.offsetHeight + 6,
                    left: 0
                };
                return;
            }

            const maxLeft = Math.max(0, textarea.clientWidth - 230);
            tagMenuPosition.value = {
                top: Math.max(34, caret.top + caret.lineHeight + 6),
                left: Math.max(0, Math.min(caret.left, maxLeft))
            };
        }

        function getTextareaCaretCoordinates(textarea, caretIndex) {
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
        }

        expose({ startAddingTask });

        return {
            addTaskInput,
            isAddingTask,
            newTaskTitle,
            quickAddError,
            isTagMenuOpen,
            tagMenuItems,
            activeTagIndex,
            tagMenuPosition,
            menuMode,
            uiCopy,
            startAddingTask,
            cancelAddingTask,
            finishAddingTask,
            confirmAddTask,
            onQuickAddEnter,
            onQuickAddTab,
            onQuickAddEsc,
            onQuickAddArrow,
            onQuickAddInput,
            onQuickAddKeyup,
            refreshQuickAddSuggestionMenu,
            selectQuickAddSuggestion
        };
    }
};

export default KanbanQuickAdd;
