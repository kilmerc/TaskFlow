export function useDebouncedAction(fn, delay = 200) {
    const { onBeforeUnmount } = Vue;
    let timeoutId = null;

    function cancel() {
        if (timeoutId) {
            clearTimeout(timeoutId);
            timeoutId = null;
        }
    }

    function schedule(...args) {
        cancel();
        timeoutId = setTimeout(() => {
            timeoutId = null;
            fn(...args);
        }, delay);
    }

    onBeforeUnmount(cancel);

    return {
        schedule,
        cancel
    };
}
