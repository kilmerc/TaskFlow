import { store, mutations } from '../store.js';

Vue.component('workspace-switcher', {
    template: `
        <div class="workspace-switcher" v-click-outside="closeDropdown">
            <div class="ws-current" @click="toggleDropdown">
                <span class="ws-name">{{ currentWorkspaceName }}</span>
                <i class="fas fa-chevron-down"></i>
            </div>
            
            <div v-if="isOpen" class="ws-dropdown">
                <div class="ws-list">
                    <div 
                        v-for="ws in workspaces" 
                        :key="ws.id" 
                        class="ws-item"
                        :class="{ active: ws.id === currentWorkspaceId }"
                        @click="selectWorkspace(ws.id)"
                    >
                        <span>{{ ws.name }}</span>
                        <div class="ws-actions" v-if="ws.id === currentWorkspaceId">
                            <i class="fas fa-pencil-alt" @click.stop="startRenaming(ws)" title="Rename"></i>
                            <i class="fas fa-trash-alt" @click.stop="confirmDelete(ws)" title="Delete" v-if="workspaces.length > 1"></i>
                        </div>
                    </div>
                </div>
                <div class="ws-create" @click="createWorkspace">
                    <i class="fas fa-plus"></i> New Workspace
                </div>
            </div>

            <!-- Simple Modal for Rename/Delete/Create could go here, or just use browser prompts for MVP -->
        </div>
    `,
    data() {
        return {
            isOpen: false,
            sharedStore: store
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
            const ws = this.workspaces.find(w => w.id === this.currentWorkspaceId);
            return ws ? ws.name : 'Select Workspace';
        }
    },
    methods: {
        toggleDropdown() {
            this.isOpen = !this.isOpen;
        },
        closeDropdown() {
            this.isOpen = false;
        },
        selectWorkspace(id) {
            mutations.switchWorkspace(id);
            this.isOpen = false;
        },
        createWorkspace() {
            const name = prompt('Enter workspace name:', 'New Workspace');
            if (name) {
                mutations.addWorkspace(name);
                this.isOpen = false;
            }
        },
        startRenaming(ws) {
            const newName = prompt('Rename workspace:', ws.name);
            if (newName && newName !== ws.name) {
                mutations.updateWorkspace(ws.id, newName);
            }
        },
        confirmDelete(ws) {
            if (confirm(`Delete workspace "${ws.name}" and all its tasks?`)) {
                mutations.deleteWorkspace(ws.id);
            }
        }
    },
    directives: {
        'click-outside': {
            bind: function (el, binding, vnode) {
                el.clickOutsideEvent = function (event) {
                    // check that click was outside the el and his children
                    if (!(el == event.target || el.contains(event.target))) {
                        // and if it did, call method provided in attribute value
                        vnode.context[binding.expression](event);
                    }
                };
                document.body.addEventListener('click', el.clickOutsideEvent);
            },
            unbind: function (el) {
                document.body.removeEventListener('click', el.clickOutsideEvent);
            },
        }
    }
});
