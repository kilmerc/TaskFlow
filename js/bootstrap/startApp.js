import { registerServiceWorker } from './registerServiceWorker.js';

if (window.__DEPENDENCIES_LOADED__) {
    import('../app.js')
        .then(() => {
            registerServiceWorker();
        })
        .catch(error => {
            console.error('Failed to start TaskFlow app:', error);
        });
}
