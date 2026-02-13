Vue.directive('click-outside', {
    bind: function (el, binding, vnode) {
        el._clickOutsideHandler = function (event) {
            if (!(el === event.target || el.contains(event.target))) {
                var handler = vnode.context[binding.expression];
                if (typeof handler === 'function') handler(event);
            }
        };
        document.body.addEventListener('click', el._clickOutsideHandler);
    },
    unbind: function (el) {
        document.body.removeEventListener('click', el._clickOutsideHandler);
        delete el._clickOutsideHandler;
    }
});
