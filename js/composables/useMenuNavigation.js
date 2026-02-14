import { useUniqueId } from './useUniqueId.js';

export function useMenuNavigation(options = {}) {
    const { ref, nextTick, unref } = Vue;

    const isOpen = ref(false);
    const menuId = useUniqueId(options.idPrefix || 'menu');

    function resolveRoot() {
        return unref(options.rootRef) || null;
    }

    function resolveTrigger() {
        return unref(options.triggerRef) || null;
    }

    function getMenuItems() {
        const root = resolveRoot();
        if (!root) return [];
        const selector = options.focusableSelector || '.menu-item';
        return Array.from(root.querySelectorAll(selector));
    }

    function focusMenuItem(index) {
        const items = getMenuItems();
        if (!items.length) return;
        const bounded = Math.max(0, Math.min(index, items.length - 1));
        items[bounded].focus();
    }

    function openMenuAndFocus(index = 0) {
        isOpen.value = true;
        nextTick(() => {
            focusMenuItem(index);
        });
    }

    function closeMenu(restoreTrigger = false) {
        isOpen.value = false;
        if (restoreTrigger) {
            nextTick(() => {
                const trigger = resolveTrigger();
                if (trigger && typeof trigger.focus === 'function') {
                    trigger.focus();
                }
            });
        }
    }

    function toggleMenu() {
        if (isOpen.value) {
            closeMenu(false);
            return;
        }
        openMenuAndFocus(0);
    }

    function onMenuKeydown(event) {
        const items = getMenuItems();
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
            closeMenu(true);
        }
    }

    function onTriggerKeydown(event, lastIndexResolver = null) {
        if (event.key === 'ArrowDown') {
            event.preventDefault();
            openMenuAndFocus(0);
            return;
        }
        if (event.key === 'ArrowUp') {
            event.preventDefault();
            const lastIndex = typeof lastIndexResolver === 'function'
                ? lastIndexResolver()
                : (getMenuItems().length - 1);
            openMenuAndFocus(lastIndex);
            return;
        }
        if (event.key === 'Escape') {
            event.preventDefault();
            closeMenu(true);
        }
    }

    return {
        isOpen,
        menuId,
        getMenuItems,
        focusMenuItem,
        openMenuAndFocus,
        closeMenu,
        toggleMenu,
        onMenuKeydown,
        onTriggerKeydown
    };
}
