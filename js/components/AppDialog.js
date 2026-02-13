import { store, mutations } from '../store.js';

Vue.component('app-dialog', {
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
    data() {
        const suffix = Math.random().toString(36).slice(2);
        return {
            titleId: `app-dialog-title-${suffix}`,
            descriptionId: `app-dialog-description-${suffix}`,
            inputId: `app-dialog-input-${suffix}`,
            restoreTarget: null
        };
    },
    computed: {
        dialog() {
            return store.dialog || {};
        },
        isOpen() {
            return !!this.dialog.isOpen;
        }
    },
    watch: {
        isOpen(isOpen) {
            if (isOpen) {
                this.restoreTarget = document.activeElement;
                this.$nextTick(() => this.focusFirstElement());
            } else if (this.restoreTarget && typeof this.restoreTarget.focus === 'function') {
                this.restoreTarget.focus();
                this.restoreTarget = null;
            }
        }
    },
    methods: {
        onInput(event) {
            mutations.setDialogInput(event.target.value);
        },
        onConfirm() {
            mutations.confirmDialog();
        },
        onCancel() {
            mutations.closeDialog();
        },
        onKeydown(event) {
            if (event.key === 'Escape') {
                event.preventDefault();
                this.onCancel();
                return;
            }

            if (event.key === 'Tab') {
                this.trapTab(event);
                return;
            }

            if (event.key === 'Enter') {
                if (event.target && event.target.tagName === 'TEXTAREA') return;
                event.preventDefault();
                this.onConfirm();
            }
        },
        getFocusableElements() {
            const panel = this.$refs.panel;
            if (!panel) return [];
            const nodes = panel.querySelectorAll(
                'button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
            );
            return Array.from(nodes).filter(node => !node.hasAttribute('hidden'));
        },
        trapTab(event) {
            const focusables = this.getFocusableElements();
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
        },
        focusFirstElement() {
            if (this.$refs.dialogInput) {
                this.$refs.dialogInput.focus();
                this.$refs.dialogInput.select();
                return;
            }
            if (this.$refs.confirmButton) {
                this.$refs.confirmButton.focus();
            }
        }
    }
});
