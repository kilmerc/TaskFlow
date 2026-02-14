const REGISTRY_KEY = '__TASKFLOW_VUE2_COMPAT_REGISTRY__';

function getOrCreateRegistry() {
    if (!window[REGISTRY_KEY]) {
        window[REGISTRY_KEY] = {
            components: {},
            directives: {}
        };
    }

    return window[REGISTRY_KEY];
}

export function installVue2CompatShims() {
    const VueGlobal = window.Vue;
    if (!VueGlobal) {
        return;
    }

    const registry = getOrCreateRegistry();

    if (typeof VueGlobal.component !== 'function') {
        VueGlobal.component = function registerLegacyComponent(name, definition) {
            if (typeof name === 'string' && definition) {
                registry.components[name] = definition;
            }
            return definition;
        };
    }

    if (typeof VueGlobal.directive !== 'function') {
        VueGlobal.directive = function registerLegacyDirective(name, definition) {
            if (typeof name === 'string' && definition) {
                registry.directives[name] = definition;
            }
            return definition;
        };
    }

}

export function getLegacyRegistry() {
    return getOrCreateRegistry();
}
