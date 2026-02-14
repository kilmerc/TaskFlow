export const clickOutsideDirective = {
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
