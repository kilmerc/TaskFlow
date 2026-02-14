import { normalizeTag } from '../utils/tagParser.js';
import { getTagToneClass as computeTagToneClass } from '../utils/tagStyle.js';

const { ref, computed, watch, nextTick } = Vue;

const TaskModalTagEditor = {
    name: 'TaskModalTagEditor',
    props: {
        selectedTags: { type: Array, default: () => [] },
        workspaceTags: { type: Array, default: () => [] }
    },
    emits: ['add-tag', 'remove-tag', 'remove-last-tag'],
    template: `
        <div class="form-group">
            <label>Tags</label>
            <div class="tag-combobox" v-click-outside="closeTagMenu">
                <div class="tag-chip-list" @click="focusTagInput">
                    <span v-for="tag in selectedTags" :key="tag" class="tag-chip tag-pill" :class="getTagToneClass(tag)">
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
    `,
    setup(props, { emit, expose }) {
        const tagInput = ref(null);
        const localTagInput = ref('');
        const isTagMenuOpen = ref(false);
        const activeTagIndex = ref(0);
        const maxTagSuggestions = 8;

        const tagMenuItems = computed(() => {
            const selectedSet = new Set(props.selectedTags);
            const query = localTagInput.value.trim().toLowerCase();
            const items = [];
            const normalizedInput = normalizeTag(localTagInput.value);
            const hasInput = normalizedInput.length > 0;
            const exists = props.workspaceTags.includes(normalizedInput);
            if (hasInput && !exists && !selectedSet.has(normalizedInput)) {
                items.push({ type: 'create', value: normalizedInput });
            }
            const existing = props.workspaceTags
                .filter(tag => !selectedSet.has(tag))
                .filter(tag => !query || tag.includes(query))
                .slice(0, maxTagSuggestions)
                .map(tag => ({ type: 'existing', value: tag }));
            return items.concat(existing);
        });

        watch(tagMenuItems, (items) => {
            if (!items.length || activeTagIndex.value >= items.length) {
                activeTagIndex.value = 0;
            }
        });

        function focusTagInput() {
            openTagMenu();
            nextTick(() => {
                if (tagInput.value) {
                    tagInput.value.focus();
                }
            });
        }

        function onTagInput() {
            openTagMenu();
            activeTagIndex.value = 0;
        }

        function openTagMenu() {
            isTagMenuOpen.value = true;
        }

        function closeTagMenu() {
            isTagMenuOpen.value = false;
        }

        function moveTagSelection(step) {
            if (!tagMenuItems.value.length) return;
            const count = tagMenuItems.value.length;
            activeTagIndex.value = (activeTagIndex.value + step + count) % count;
        }

        function selectActiveTag() {
            if (tagMenuItems.value.length) {
                selectTagItem(tagMenuItems.value[activeTagIndex.value]);
                return;
            }
            const normalized = normalizeTag(localTagInput.value);
            if (normalized) {
                addTag(normalized);
            }
        }

        function selectTagItem(item) {
            if (item && item.value) {
                addTag(item.value);
            }
        }

        function addTag(value) {
            const normalized = normalizeTag(value);
            if (!normalized) return;
            if (props.selectedTags.includes(normalized)) {
                localTagInput.value = '';
                closeTagMenu();
                return;
            }

            emit('add-tag', normalized);
            localTagInput.value = '';
            openTagMenu();
            nextTick(() => {
                if (tagInput.value) {
                    tagInput.value.focus();
                }
            });
        }

        function removeTag(tagToRemove) {
            emit('remove-tag', tagToRemove);
        }

        function getTagToneClass(tag) {
            return computeTagToneClass(tag);
        }

        function onTagBackspace() {
            if (localTagInput.value.length > 0 || !props.selectedTags.length) return;
            emit('remove-last-tag');
        }

        function reset() {
            localTagInput.value = '';
            closeTagMenu();
        }

        expose({ reset });

        return {
            tagInput,
            localTagInput,
            isTagMenuOpen,
            activeTagIndex,
            tagMenuItems,
            focusTagInput,
            onTagInput,
            openTagMenu,
            closeTagMenu,
            moveTagSelection,
            selectActiveTag,
            selectTagItem,
            removeTag,
            getTagToneClass,
            onTagBackspace,
            reset
        };
    }
};

export default TaskModalTagEditor;
