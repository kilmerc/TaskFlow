import { store, mutations } from '../store.js';

Vue.component('app-toast', {
    template: `
        <div class="app-toast-stack" aria-label="Notifications">
            <div
                v-for="toast in toasts"
                :key="toast.id"
                class="app-toast"
                :class="'app-toast-' + toast.variant"
                role="status"
                :aria-live="toast.variant === 'error' ? 'assertive' : 'polite'"
            >
                <div class="app-toast-message">{{ toast.message }}</div>
                <button
                    v-if="toast.dismissible !== false"
                    type="button"
                    class="app-toast-dismiss"
                    :aria-label="'Dismiss notification: ' + toast.message"
                    @click="dismiss(toast.id)"
                >
                    <i class="fas fa-times" aria-hidden="true"></i>
                </button>
            </div>
        </div>
    `,
    data() {
        return {
            timers: {}
        };
    },
    computed: {
        toasts() {
            return store.toasts || [];
        }
    },
    watch: {
        toasts: {
            deep: true,
            immediate: true,
            handler() {
                this.syncTimers();
            }
        }
    },
    beforeDestroy() {
        Object.keys(this.timers).forEach(id => {
            clearTimeout(this.timers[id]);
        });
        this.timers = {};
    },
    methods: {
        syncTimers() {
            const activeIds = new Set(this.toasts.map(toast => toast.id));

            Object.keys(this.timers).forEach(id => {
                if (!activeIds.has(id)) {
                    clearTimeout(this.timers[id]);
                    delete this.timers[id];
                }
            });

            this.toasts.forEach(toast => {
                if (this.timers[toast.id]) return;
                if (!toast.timeoutMs || toast.timeoutMs <= 0) return;

                this.timers[toast.id] = setTimeout(() => {
                    mutations.dismissToast(toast.id);
                    delete this.timers[toast.id];
                }, toast.timeoutMs);
            });
        },
        dismiss(toastId) {
            mutations.dismissToast(toastId);
        }
    }
});
