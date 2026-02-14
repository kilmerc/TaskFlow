import { store, mutations } from '../store.js';
import { PRIORITY_VALUES } from '../utils/taskFilters.js';
import { getTagToneClass as computeTagToneClass } from '../utils/tagStyle.js';
import { useUniqueId } from '../composables/useUniqueId.js';
import { useWorkspaceTaskContext } from '../composables/useWorkspaceTaskContext.js';

const { ref, computed } = Vue;

const FilterBar = {
    name: 'FilterBar',
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
    setup() {
        const isOpen = ref(false);
        const dropdownId = useUniqueId('filter-dropdown');
        const currentWorkspace = computed(() => {
            return store.workspaces.find(workspace => workspace.id === store.currentWorkspaceId) || null;
        });
        const context = useWorkspaceTaskContext(currentWorkspace);

        const activeFilters = computed(() => {
            return store.activeFilters || { tags: [], priorities: [] };
        });

        const activeTagFilters = computed(() => {
            return activeFilters.value.tags || [];
        });

        const activePriorityFilters = computed(() => {
            return activeFilters.value.priorities || [];
        });

        const activeFilterCount = computed(() => {
            return activeTagFilters.value.length + activePriorityFilters.value.length;
        });

        const allPriorities = computed(() => {
            return PRIORITY_VALUES;
        });

        const allTags = computed(() => {
            const tags = new Set();
            context.workspaceTasks.value.forEach(task => {
                if (task.tags && task.tags.length) {
                    task.tags.forEach(tag => tags.add(tag));
                }
            });
            return Array.from(tags).sort();
        });

        function toggleDropdown() {
            isOpen.value = !isOpen.value;
        }

        function closeDropdown() {
            isOpen.value = false;
        }

        function toggleTag(tag) {
            mutations.toggleTagFilter(tag);
        }

        function togglePriority(priority) {
            mutations.togglePriorityFilter(priority);
        }

        function isTagActive(tag) {
            return activeTagFilters.value.includes(tag);
        }

        function isPriorityActive(priority) {
            return activePriorityFilters.value.includes(priority);
        }

        function getTagToneClass(tag) {
            return computeTagToneClass(tag);
        }

        function clearFilters() {
            mutations.clearFilters();
        }

        return {
            isOpen,
            dropdownId,
            activeFilterCount,
            allPriorities,
            allTags,
            toggleDropdown,
            closeDropdown,
            toggleTag,
            togglePriority,
            isTagActive,
            isPriorityActive,
            getTagToneClass,
            clearFilters
        };
    }
};

export default FilterBar;
