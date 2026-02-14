import { getLegacyRegistry } from './vue2Compat.js';

// Global directives
import '../directives/clickOutside.js';

// Import components for side-effects (legacy Vue.component registration)
// Subcomponents must be imported before their parent components
import '../components/KanbanColumnHeader.js';
import '../components/KanbanQuickAdd.js';
import '../components/TaskModalColumnPicker.js';
import '../components/TaskModalTagEditor.js';
import '../components/TaskModalSubtasks.js';
import '../components/WorkspaceSwitcher.js';
import '../components/KanbanBoard.js';
import '../components/KanbanColumn.js';
import '../components/CalendarView.js';
import '../components/CalendarSidebar.js';
import '../components/EisenhowerView.js';
import '../components/TaskCard.js';
import '../components/TaskModal.js';
import '../components/FilterBar.js';
import '../components/SearchControls.js';
import '../components/AppDialog.js';
import '../components/AppToast.js';
import '../components/TemplateGalleryModal.js';

function applyLifecycleAliases(definition) {
    if (!definition || typeof definition !== 'object') {
        return definition;
    }

    if (typeof definition.beforeDestroy === 'function' && typeof definition.beforeUnmount !== 'function') {
        definition.beforeUnmount = definition.beforeDestroy;
    }

    if (typeof definition.destroyed === 'function' && typeof definition.unmounted !== 'function') {
        definition.unmounted = definition.destroyed;
    }

    return definition;
}

function createClickOutsideDirective() {
    return {
        beforeMount(el, binding) {
            el.__clickOutsideValue__ = binding.value;
            el.__clickOutsideHandler__ = function onClickOutside(event) {
                if (el === event.target || el.contains(event.target)) {
                    return;
                }

                if (typeof el.__clickOutsideValue__ === 'function') {
                    el.__clickOutsideValue__(event);
                }
            };
            document.body.addEventListener('click', el.__clickOutsideHandler__);
        },
        updated(el, binding) {
            el.__clickOutsideValue__ = binding.value;
        },
        unmounted(el) {
            document.body.removeEventListener('click', el.__clickOutsideHandler__);
            delete el.__clickOutsideHandler__;
            delete el.__clickOutsideValue__;
        }
    };
}

function adaptLegacyDirective(definition) {
    if (!definition || typeof definition !== 'object') {
        return definition;
    }

    if (
        typeof definition.beforeMount === 'function'
        || typeof definition.mounted === 'function'
        || typeof definition.updated === 'function'
        || typeof definition.unmounted === 'function'
    ) {
        return definition;
    }

    const adapted = {};

    if (typeof definition.bind === 'function') {
        adapted.beforeMount = definition.bind;
    }
    if (typeof definition.inserted === 'function') {
        adapted.mounted = definition.inserted;
    }
    if (typeof definition.update === 'function') {
        adapted.updated = definition.update;
    }
    if (typeof definition.componentUpdated === 'function') {
        adapted.updated = definition.componentUpdated;
    }
    if (typeof definition.unbind === 'function') {
        adapted.unmounted = definition.unbind;
    }

    return adapted;
}

export function registerGlobals(app) {
    const legacyRegistry = getLegacyRegistry();
    const componentEntries = Object.entries(legacyRegistry.components || {});
    const directiveEntries = Object.entries(legacyRegistry.directives || {});

    componentEntries.forEach(([name, definition]) => {
        app.component(name, applyLifecycleAliases(definition));
    });

    directiveEntries.forEach(([name, definition]) => {
        if (name === 'click-outside') {
            app.directive(name, createClickOutsideDirective());
            return;
        }

        const adapted = adaptLegacyDirective(definition);
        if (adapted) {
            app.directive(name, adapted);
        }
    });

    const draggable = window.vuedraggable && (window.vuedraggable.default || window.vuedraggable);
    if (draggable) {
        app.component('draggable', draggable);
    }
}
