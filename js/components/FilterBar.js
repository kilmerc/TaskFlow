import { store, mutations } from '../store.js';

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
                    <span>Filter by Tag</span>
                    <button v-if="activeFilterCount > 0" @click="clearFilters" class="btn-text-sm">Clear</button>
                </div>
                <div class="filter-list">
                    <label v-for="tag in allTags" :key="tag" class="filter-item">
                        <input type="checkbox" :checked="isTagActive(tag)" @change="toggleTag(tag)">
                        <span class="tag-text">#{{ tag }}</span>
                    </label>
                    <div v-if="allTags.length === 0" class="empty-filters">No tags found</div>
                </div>
            </div>
        </div>
    `,
    computed: {
        activeFilter() {
            return store.activeFilter || [];
        },
        activeFilterCount() {
            return this.activeFilter.length;
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
            mutations.toggleFilter(tag);
        },
        isTagActive(tag) {
            return this.activeFilter.includes(tag);
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
