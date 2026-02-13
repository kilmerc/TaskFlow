import { normalizeTag } from '../utils/tagParser.js';
import { getTagStyle as computeTagStyle } from '../utils/tagStyle.js';

Vue.component('task-modal-tag-editor', {
    props: {
        selectedTags: { type: Array, default: () => [] },
        workspaceTags: { type: Array, default: () => [] }
    },
    template: `
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
    `,
    data() {
        return {
            localTagInput: '',
            isTagMenuOpen: false,
            activeTagIndex: 0,
            maxTagSuggestions: 8
        };
    },
    computed: {
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
        }
    },
    watch: {
        tagMenuItems(items) {
            if (!items.length || this.activeTagIndex >= items.length) this.activeTagIndex = 0;
        }
    },
    methods: {
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
            if (this.selectedTags.includes(normalized)) { this.localTagInput = ''; this.closeTagMenu(); return; }
            this.$emit('add-tag', normalized);
            this.localTagInput = '';
            this.openTagMenu();
            this.$nextTick(() => { if (this.$refs.tagInput) this.$refs.tagInput.focus(); });
        },
        removeTag(tagToRemove) {
            this.$emit('remove-tag', tagToRemove);
        },
        getTagStyle(tag) {
            return computeTagStyle(tag);
        },
        onTagBackspace() {
            if (this.localTagInput.length > 0 || !this.selectedTags.length) return;
            this.$emit('remove-last-tag');
        },
        reset() {
            this.localTagInput = '';
            this.closeTagMenu();
        }
    }
});
