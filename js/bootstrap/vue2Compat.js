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

function isArrayIndex(key) {
    return Number.isInteger(Number(key)) && Number(key) >= 0;
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

    if (typeof VueGlobal.observable !== 'function' && typeof VueGlobal.reactive === 'function') {
        VueGlobal.observable = VueGlobal.reactive;
    }

    if (typeof VueGlobal.set !== 'function') {
        VueGlobal.set = function legacySet(target, key, value) {
            if (!target) {
                return value;
            }

            if (Array.isArray(target) && isArrayIndex(key)) {
                target.splice(Number(key), 1, value);
                return value;
            }

            target[key] = value;
            return value;
        };
    }

    if (typeof VueGlobal.delete !== 'function') {
        VueGlobal.delete = function legacyDelete(target, key) {
            if (!target) {
                return;
            }

            if (Array.isArray(target) && isArrayIndex(key)) {
                target.splice(Number(key), 1);
                return;
            }

            delete target[key];
        };
    }
}

export function getLegacyRegistry() {
    return getOrCreateRegistry();
}
