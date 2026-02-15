export function registerServiceWorker() {
    if (!('serviceWorker' in navigator)) {
        return;
    }

    const register = () => {
        navigator.serviceWorker.register('./service-worker.js', { scope: './' }).catch(error => {
            console.error('Service worker registration failed:', error);
        });
    };

    if (document.readyState === 'complete') {
        register();
        return;
    }

    window.addEventListener('load', register, { once: true });
}
