import { store, hydrate, persist } from './store.js';

// Global error handler for Vue
Vue.config.errorHandler = function (err, vm, info) {
    console.error('Vue Error:', err, info);
};

// Main App instance
new Vue({
    el: '#app',
    data: {
        store: store // Share the store with the template
    },
    computed: {
        appTheme() {
            return this.store.theme;
        }
    },
    watch: {
        appTheme: {
            immediate: true,
            handler(newTheme) {
                document.documentElement.setAttribute('data-theme', newTheme);
            }
        }
    },
    created() {
        console.log('App Initializing...');
        hydrate();
    },
    methods: {
        toggleTheme() {
            this.store.theme = this.store.theme === 'dark' ? 'light' : 'dark';
            persist();
        }
    }
});
