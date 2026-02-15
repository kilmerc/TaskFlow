import { store, mutations } from '../store.js';

const { computed, watch, onBeforeUnmount } = Vue;

const AppToast = {
    name: 'AppToast',
    template: `
        <transition-group name="toast-stack" tag="div" class="app-toast-stack" aria-label="Notifications">
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
                        <app-icon name="x" aria-hidden="true"></app-icon>
                    </button>
                </div>
        </transition-group>
    `,
    setup() {
        const timers = {};

        const toasts = computed(() => {
            return store.toasts || [];
        });

        function syncTimers() {
            const activeIds = new Set(toasts.value.map(toast => toast.id));

            Object.keys(timers).forEach(id => {
                if (!activeIds.has(id)) {
                    clearTimeout(timers[id]);
                    delete timers[id];
                }
            });

            toasts.value.forEach(toast => {
                if (timers[toast.id]) return;
                if (!toast.timeoutMs || toast.timeoutMs <= 0) return;

                timers[toast.id] = setTimeout(() => {
                    mutations.dismissToast(toast.id);
                    delete timers[toast.id];
                }, toast.timeoutMs);
            });
        }

        function dismiss(toastId) {
            mutations.dismissToast(toastId);
        }

        watch(toasts, () => {
            syncTimers();
        }, {
            deep: true,
            immediate: true
        });

        onBeforeUnmount(() => {
            Object.keys(timers).forEach(id => {
                clearTimeout(timers[id]);
            });
        });

        return {
            toasts,
            dismiss
        };
    }
};

export default AppToast;
