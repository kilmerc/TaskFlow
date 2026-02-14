import { installVue2CompatShims } from './vue2Compat.js';

if (window.__DEPENDENCIES_LOADED__) {
    installVue2CompatShims();
    import('../app.js');
}
