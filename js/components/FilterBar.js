import { store, mutations } from '../store.js';
import { PRIORITY_VALUES } from '../utils/taskFilters.js';
import { getTagToneClass as computeTagToneClass } from '../utils/tagStyle.js';

Vue.component('filter-bar', {
    data() {
        return {
            isOpen: false,
            dropdownId: `filter-dropdown-${Math.random().toString(36).slice(2)}`
        };
    },
    template: `
        <div class="filter-bar" v-click-outside="closeDropdown">
            <button
                class="filter-btn"
                @click="toggleDropdown"
                :class="{ 'has-filters': activeFilterCount > 0 }"
                title="Filter Tasks"
                :aria-expanded="isOpen ? 'true' : 'false'"
                :aria-controls="dropdownId"
                aria-haspopup="menu"
            >
                <i class="fas fa-filter"></i>
                <span v-if="activeFilterCount > 0" class="filter-badge">{{ activeFilterCount }}</span>
            </button>
            
            <div class="filter-dropdown" v-if="isOpen" :id="dropdownId">
                <div class="filter-header">
                    <span>Filters</span>
                    <button v-if="activeFilterCount > 0" @click="clearFilters" class="btn-text-sm" title="Clear all filters">Clear</button>
                </div>

                <div class="filter-section">
                    <div class="filter-section-title">Priority</div>
                    <div class="filter-list">
                        <label v-for="priority in allPriorities" :key="priority" class="filter-item">
                            <input type="checkbox" :checked="isPriorityActive(priority)" @change="togglePriority(priority)">
                            <span class="priority-pill priority-filter-pill" :class="'priority-' + priority.toLowerCase()">{{ priority }}</span>
                        </label>
                    </div>
                </div>

                <div class="filter-section">
                    <div class="filter-section-title">Tags</div>
                    <div class="filter-list">
                        <label v-for="tag in allTags" :key="tag" class="filter-item">
                            <input type="checkbox" :checked="isTagActive(tag)" @change="toggleTag(tag)">
                            <span class="tag-pill" :class="getTagToneClass(tag)">{{ tag }}</span>
                        </label>
                        <div v-if="allTags.length === 0" class="empty-filters">No tags found</div>
                    </div>
                </div>
            </div>
        </div>
    `,
    computed: {
        activeFilters() {
            return store.activeFilters || { tags: [], priorities: [] };
        },
        activeTagFilters() {
            return this.activeFilters.tags || [];
        },
        activePriorityFilters() {
            return this.activeFilters.priorities || [];
        },
        activeFilterCount() {
            return this.activeTagFilters.length + this.activePriorityFilters.length;
        },
        allPriorities() {
            return PRIORITY_VALUES;
        },
        allTags() {
            const tags = new Set();
            const workspaceId = store.currentWorkspaceId;
            Object.values(store.tasks).forEach(task => {
                if (task.tags && task.tags.length) {
                    const column = store.columns[task.columnId];
                    if (!workspaceId || !column || column.workspaceId !== workspaceId) {
                        return;
                    }
                    task.tags.forEach(tag => tags.add(tag));
                }
            });
            return Array.from(tags).sort();
        }
    },
    methods: {
        toggleDropdown() {
            this.isOpen = !this.isOpen;
        },
        closeDropdown() {
            this.isOpen = false;
        },
        toggleTag(tag) {
            mutations.toggleTagFilter(tag);
        },
        togglePriority(priority) {
            mutations.togglePriorityFilter(priority);
        },
        isTagActive(tag) {
            return this.activeTagFilters.includes(tag);
        },
        isPriorityActive(priority) {
            return this.activePriorityFilters.includes(priority);
        },
        getTagToneClass(tag) {
            return computeTagToneClass(tag);
        },
        clearFilters() {
            mutations.clearFilters();
        }
    }
});
