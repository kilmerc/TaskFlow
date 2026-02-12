import { store, mutations } from '../store.js';

Vue.component('filter-bar', {
    template: `
        <div class="filter-bar">
            <i class="fas fa-filter"></i>
            <select :value="activeFilter" @change="setFilter($event.target.value)">
                <option value="">All Tasks</option>
                <option v-for="tag in allTags" :key="tag" :value="tag">#{{ tag }}</option>
            </select>
            <button v-if="activeFilter" @click="clearFilter" class="clear-filter-btn" title="Clear Filter">
                <i class="fas fa-times"></i>
            </button>
        </div>
    `,
    computed: {
        activeFilter() {
            return store.activeFilter || '';
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
        setFilter(value) {
            mutations.setFilter(value || null);
        },
        clearFilter() {
            mutations.setFilter(null);
        }
    }
});
