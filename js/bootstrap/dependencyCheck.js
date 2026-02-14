(function checkDependencies() {
    const hasVue = !!window.Vue;
    const hasSortable = !!window.Sortable;
    const hasDraggable = !!window.vuedraggable;
    const hasAllDependencies = hasVue && hasSortable && hasDraggable;

    window.__DEPENDENCIES_LOADED__ = hasAllDependencies;

    if (hasAllDependencies) {
        return;
    }

    console.error('Dependencies failed to load');
    console.error('Vue:', hasVue);
    console.error('Sortable:', hasSortable);
    console.error('vuedraggable:', hasDraggable);

    const appDiv = document.getElementById('app');
    if (!appDiv) {
        return;
    }

    appDiv.removeAttribute('v-cloak');
    appDiv.innerHTML = [
        '<div class="dependency-error-banner">',
        '<h2>Critical Error</h2>',
        '<p>Failed to load required libraries. Please check your internet connection.</p>',
        '</div>'
    ].join('');
})();
