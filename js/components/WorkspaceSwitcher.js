import { MAX_WORKSPACE_NAME, store, mutations } from '../store.js';
import { useMenuNavigation } from '../composables/useMenuNavigation.js';

const { ref, computed } = Vue;

const WorkspaceSwitcher = {
    name: 'WorkspaceSwitcher',
    template: `
        <div ref="root" class="workspace-switcher" v-click-outside="onOutsideClick">
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
    setup() {
        const root = ref(null);
        const trigger = ref(null);

        const navigation = useMenuNavigation({
            rootRef: root,
            triggerRef: trigger,
            focusableSelector: '.ws-menu-focusable',
            idPrefix: 'workspace-dropdown'
        });

        const isOpen = navigation.isOpen;
        const dropdownId = navigation.menuId;

        const workspaces = computed(() => store.workspaces);
        const currentWorkspaceId = computed(() => store.currentWorkspaceId);
        const currentWorkspaceName = computed(() => {
            const ws = workspaces.value.find(workspace => workspace.id === currentWorkspaceId.value);
            return ws ? ws.name : 'Select Workspace';
        });

        function toggleDropdown() {
            navigation.toggleMenu();
        }

        function openDropdown(focusIndex = 0) {
            navigation.openMenuAndFocus(focusIndex);
        }

        function closeDropdown(restoreTrigger = false) {
            navigation.closeMenu(restoreTrigger);
        }

        function onOutsideClick() {
            closeDropdown(false);
        }

        function getMenuItems() {
            return navigation.getMenuItems();
        }

        function onTriggerKeydown(event) {
            navigation.onTriggerKeydown(event, () => getMenuItems().length - 1);
        }

        function onMenuKeydown(event) {
            navigation.onMenuKeydown(event);
        }

        function selectWorkspace(id) {
            mutations.switchWorkspace(id);
            closeDropdown(true);
        }

        function createWorkspace() {
            closeDropdown(true);
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
        }

        function startRenaming(ws) {
            closeDropdown(true);
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
        }

        function confirmDelete(ws) {
            closeDropdown(true);
            mutations.openDialog({
                variant: 'confirm',
                title: 'Delete workspace?',
                message: `Delete workspace "${ws.name}" and all its tasks?`,
                confirmLabel: 'Delete workspace',
                cancelLabel: 'Cancel',
                destructive: true,
                action: {
                    type: 'workspace.delete',
                    payload: { workspaceId: ws.id }
                }
            });
        }

        return {
            root,
            trigger,
            isOpen,
            dropdownId,
            workspaces,
            currentWorkspaceId,
            currentWorkspaceName,
            toggleDropdown,
            openDropdown,
            closeDropdown,
            onOutsideClick,
            onTriggerKeydown,
            onMenuKeydown,
            selectWorkspace,
            createWorkspace,
            startRenaming,
            confirmDelete
        };
    }
};

export default WorkspaceSwitcher;
