import { store, mutations } from '../store.js';
import { useUniqueId } from '../composables/useUniqueId.js';

const { ref, computed, watch, nextTick } = Vue;

const AppDialog = {
    name: 'AppDialog',
    template: `
        <div v-if="isOpen" class="app-dialog-backdrop" @click.self="onCancel">
            <div
                ref="panel"
                class="app-dialog-panel"
                role="dialog"
                aria-modal="true"
                :aria-labelledby="titleId"
                :aria-describedby="descriptionId"
                @keydown="onKeydown"
            >
                <h3 :id="titleId" class="app-dialog-title">{{ dialog.title }}</h3>
                <p :id="descriptionId" class="app-dialog-message">{{ dialog.message }}</p>

                <div v-if="dialog.input && dialog.input.enabled" class="app-dialog-input-group">
                    <label class="sr-only" :for="inputId">Dialog input</label>
                    <input
                        :id="inputId"
                        ref="dialogInput"
                        type="text"
                        class="app-dialog-input"
                        :placeholder="dialog.input.placeholder || ''"
                        :maxlength="dialog.input.maxLength || null"
                        :value="dialog.input.value || ''"
                        @input="onInput"
                    >
                </div>

                <div v-if="dialog.error" class="app-dialog-error">{{ dialog.error }}</div>

                <div class="app-dialog-actions">
                    <button type="button" class="btn-text" @click="onCancel">{{ dialog.cancelLabel || 'Cancel' }}</button>
                    <button
                        ref="confirmButton"
                        type="button"
                        class="btn-primary"
                        :class="{ 'btn-danger': dialog.destructive }"
                        @click="onConfirm"
                    >
                        {{ dialog.confirmLabel || 'Confirm' }}
                    </button>
                </div>
            </div>
        </div>
    `,
    setup() {
        const panel = ref(null);
        const dialogInput = ref(null);
        const confirmButton = ref(null);
        const titleId = useUniqueId('app-dialog-title');
        const descriptionId = useUniqueId('app-dialog-description');
        const inputId = useUniqueId('app-dialog-input');
        const restoreTarget = ref(null);

        const dialog = computed(() => {
            return store.dialog || {};
        });

        const isOpen = computed(() => {
            return !!dialog.value.isOpen;
        });

        watch(isOpen, (open) => {
            if (open) {
                restoreTarget.value = document.activeElement;
                nextTick(() => focusFirstElement());
            } else if (restoreTarget.value && typeof restoreTarget.value.focus === 'function') {
                restoreTarget.value.focus();
                restoreTarget.value = null;
            }
        });

        function onInput(event) {
            mutations.setDialogInput(event.target.value);
        }

        function onConfirm() {
            mutations.confirmDialog();
        }

        function onCancel() {
            mutations.closeDialog();
        }

        function onKeydown(event) {
            if (event.key === 'Escape') {
                event.preventDefault();
                onCancel();
                return;
            }

            if (event.key === 'Tab') {
                trapTab(event);
                return;
            }

            if (event.key === 'Enter') {
                if (event.target && event.target.tagName === 'TEXTAREA') return;
                event.preventDefault();
                onConfirm();
            }
        }

        function getFocusableElements() {
            if (!panel.value) return [];
            const nodes = panel.value.querySelectorAll(
                'button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
            );
            return Array.from(nodes).filter(node => !node.hasAttribute('hidden'));
        }

        function trapTab(event) {
            const focusables = getFocusableElements();
            if (!focusables.length) return;

            const first = focusables[0];
            const last = focusables[focusables.length - 1];
            const isShift = event.shiftKey;
            const active = document.activeElement;

            if (isShift && active === first) {
                event.preventDefault();
                last.focus();
            } else if (!isShift && active === last) {
                event.preventDefault();
                first.focus();
            }
        }

        function focusFirstElement() {
            if (dialogInput.value) {
                dialogInput.value.focus();
                dialogInput.value.select();
                return;
            }
            if (confirmButton.value) {
                confirmButton.value.focus();
            }
        }

        return {
            panel,
            dialogInput,
            confirmButton,
            titleId,
            descriptionId,
            inputId,
            dialog,
            isOpen,
            onInput,
            onConfirm,
            onCancel,
            onKeydown
        };
    }
};

export default AppDialog;
