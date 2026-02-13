import { MAX_WORKSPACE_NAME, store, mutations } from '../store.js';

Vue.component('workspace-switcher', {
    template: `
        <div class="workspace-switcher" v-click-outside="onOutsideClick">
            <button
                ref="trigger"
                type="button"
                class="ws-current ws-current-btn"
                :aria-expanded="isOpen ? 'true' : 'false'"
                :aria-controls="dropdownId"
                aria-haspopup="menu"
                aria-label="Switch workspace"
                @click="toggleDropdown"
                @keydown="onTriggerKeydown"
            >
                <span class="ws-name">{{ currentWorkspaceName }}</span>
                <i class="fas fa-chevron-down" aria-hidden="true"></i>
            </button>

            <div
                v-if="isOpen"
                :id="dropdownId"
                class="ws-dropdown"
                role="menu"
                aria-label="Workspace menu"
                @keydown="onMenuKeydown"
            >
                <div class="ws-list">
                    <div
                        v-for="ws in workspaces"
                        :key="ws.id"
                        class="ws-item"
                        :class="{ active: ws.id === currentWorkspaceId }"
                    >
                        <button
                            type="button"
                            class="ws-item-btn ws-menu-focusable"
                            :class="{ active: ws.id === currentWorkspaceId }"
                            role="menuitem"
                            :aria-label="'Switch to workspace ' + ws.name"
                            @click="selectWorkspace(ws.id)"
                        >
                            <span>{{ ws.name }}</span>
                        </button>

                        <div class="ws-actions" v-if="ws.id === currentWorkspaceId">
                            <button
                                type="button"
                                class="ws-action-btn ws-menu-focusable"
                                role="menuitem"
                                aria-label="Rename workspace"
                                @click.stop="startRenaming(ws)"
                            >
                                <i class="fas fa-pencil-alt" aria-hidden="true"></i>
                            </button>
                            <button
                                v-if="workspaces.length > 1"
                                type="button"
                                class="ws-action-btn ws-menu-focusable"
                                role="menuitem"
                                aria-label="Delete workspace"
                                @click.stop="confirmDelete(ws)"
                            >
                                <i class="fas fa-trash-alt" aria-hidden="true"></i>
                            </button>
                        </div>
                    </div>
                </div>

                <button
                    type="button"
                    class="ws-create ws-menu-focusable"
                    role="menuitem"
                    aria-label="Create workspace"
                    @click="createWorkspace"
                >
                    <i class="fas fa-plus" aria-hidden="true"></i> New Workspace
                </button>
            </div>
        </div>
    `,
    data() {
        return {
            isOpen: false,
            sharedStore: store,
            dropdownId: `workspace-dropdown-${Math.random().toString(36).slice(2)}`
        };
    },
    computed: {
        workspaces() {
            return this.sharedStore.workspaces;
        },
        currentWorkspaceId() {
            return this.sharedStore.currentWorkspaceId;
        },
        currentWorkspaceName() {
            const ws = this.workspaces.find(workspace => workspace.id === this.currentWorkspaceId);
            return ws ? ws.name : 'Select Workspace';
        }
    },
    methods: {
        toggleDropdown() {
            if (this.isOpen) {
                this.closeDropdown(false);
                return;
            }
            this.openDropdown(0);
        },
        openDropdown(focusIndex = 0) {
            this.isOpen = true;
            this.$nextTick(() => this.focusMenuItem(focusIndex));
        },
        closeDropdown(restoreTrigger = false) {
            this.isOpen = false;
            if (restoreTrigger) {
                this.$nextTick(() => {
                    if (this.$refs.trigger) {
                        this.$refs.trigger.focus();
                    }
                });
            }
        },
        onOutsideClick() {
            this.closeDropdown(false);
        },
        focusMenuItem(index) {
            const items = this.getMenuItems();
            if (!items.length) return;
            const bounded = Math.max(0, Math.min(index, items.length - 1));
            items[bounded].focus();
        },
        getMenuItems() {
            return Array.from(this.$el.querySelectorAll('.ws-menu-focusable'));
        },
        onTriggerKeydown(event) {
            if (event.key === 'ArrowDown') {
                event.preventDefault();
                this.openDropdown(0);
                return;
            }
            if (event.key === 'ArrowUp') {
                event.preventDefault();
                this.openDropdown(this.getMenuItems().length - 1);
                return;
            }
            if (event.key === 'Escape') {
                event.preventDefault();
                this.closeDropdown(true);
            }
        },
        onMenuKeydown(event) {
            const items = this.getMenuItems();
            if (!items.length) return;
            const currentIndex = items.indexOf(document.activeElement);

            if (event.key === 'ArrowDown') {
                event.preventDefault();
                const next = currentIndex < 0 ? 0 : (currentIndex + 1) % items.length;
                items[next].focus();
                return;
            }
            if (event.key === 'ArrowUp') {
                event.preventDefault();
                const next = currentIndex < 0 ? items.length - 1 : (currentIndex - 1 + items.length) % items.length;
                items[next].focus();
                return;
            }
            if (event.key === 'Home') {
                event.preventDefault();
                items[0].focus();
                return;
            }
            if (event.key === 'End') {
                event.preventDefault();
                items[items.length - 1].focus();
                return;
            }
            if (event.key === 'Escape') {
                event.preventDefault();
                this.closeDropdown(true);
            }
        },
        selectWorkspace(id) {
            mutations.switchWorkspace(id);
            this.closeDropdown(true);
        },
        createWorkspace() {
            this.closeDropdown(true);
            mutations.openDialog({
                variant: 'prompt',
                title: 'Create workspace',
                message: 'Enter a name for the new workspace.',
                confirmLabel: 'Create',
                cancelLabel: 'Cancel',
                input: {
                    placeholder: 'Workspace name',
                    maxLength: MAX_WORKSPACE_NAME
                },
                action: {
                    type: 'workspace.create'
                }
            });
        },
        startRenaming(ws) {
            this.closeDropdown(true);
            mutations.openDialog({
                variant: 'prompt',
                title: 'Rename workspace',
                message: 'Update the workspace name.',
                confirmLabel: 'Save',
                cancelLabel: 'Cancel',
                initialValue: ws.name,
                input: {
                    placeholder: 'Workspace name',
                    maxLength: MAX_WORKSPACE_NAME
                },
                action: {
                    type: 'workspace.rename',
                    payload: { workspaceId: ws.id }
                }
            });
        },
        confirmDelete(ws) {
            this.closeDropdown(true);
            mutations.openDialog({
                variant: 'confirm',
                title: 'Delete workspace?',
                message: `Delete workspace \"${ws.name}\" and all its tasks?`,
                confirmLabel: 'Delete workspace',
                cancelLabel: 'Cancel',
                destructive: true,
                action: {
                    type: 'workspace.delete',
                    payload: { workspaceId: ws.id }
                }
            });
        }
    },
    directives: {
        'click-outside': {
            bind(el, binding, vnode) {
                el.clickOutsideEvent = function onClickOutside(event) {
                    if (!(el === event.target || el.contains(event.target))) {
                        vnode.context[binding.expression](event);
                    }
                };
                document.body.addEventListener('click', el.clickOutsideEvent);
            },
            unbind(el) {
                document.body.removeEventListener('click', el.clickOutsideEvent);
            }
        }
    }
});
