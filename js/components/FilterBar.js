import { store, mutations } from '../store.js';
import { PRIORITY_VALUES } from '../utils/taskFilters.js';

Vue.component('filter-bar', {
    data() {
        return {
            isOpen: false
        };
    },
    template: `
        <div class="filter-bar" v-click-outside="closeDropdown">
            <button class="filter-btn" @click="toggleDropdown" :class="{ 'has-filters': activeFilterCount > 0 }" title="Filter Tasks">
                <i class="fas fa-filter"></i>
                <span v-if="activeFilterCount > 0" class="filter-badge">{{ activeFilterCount }}</span>
            </button>
            
            <div class="filter-dropdown" v-if="isOpen">
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
                            <span class="tag-pill" :style="getTagStyle(tag)">{{ tag }}</span>
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
            Object.values(store.tasks).forEach(task => {
                if (task.tags && task.tags.length) {
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
        getTagStyle(tag) {
            let hash = 0;
            for (let i = 0; i < tag.length; i++) {
                hash = tag.charCodeAt(i) + ((hash << 5) - hash);
            }
            const hues = [0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330];
            const hue = hues[Math.abs(hash) % hues.length];
            return {
                backgroundColor: `hsl(${hue}, 70%, 90%)`,
                color: `hsl(${hue}, 80%, 25%)`,
                border: `1px solid hsl(${hue}, 60%, 80%)`
            };
        },
        clearFilters() {
            mutations.clearFilters();
        }
    },
    directives: {
        'click-outside': {
            bind: function (el, binding, vnode) {
                el.clickOutsideEvent = function (event) {
                    if (!(el == event.target || el.contains(event.target))) {
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
