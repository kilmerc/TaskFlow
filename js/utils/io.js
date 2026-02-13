import { store, hydrate, persist } from '../store.js';

export function exportData() {
    try {
        // Create a dedicated snapshot object to avoid vue-observer clutter if any
        // JSON.stringify handles observables fine, but let's be explicit about what we save
        const snapshot = {
            appVersion: store.appVersion,
            theme: store.theme,
            currentWorkspaceId: store.currentWorkspaceId,
            workspaces: store.workspaces,
            columns: store.columns,
            tasks: store.tasks,
            columnTaskOrder: store.columnTaskOrder,
            activeFilters: store.activeFilters
        };

        const json = JSON.stringify(snapshot, null, 2);
        const blob = new Blob([json], { type: 'application/json' });
        const url = URL.createObjectURL(blob);

        const a = document.createElement('a');
        a.href = url;
        const date = new Date().toISOString().slice(0, 10);
        a.download = `taskflow-backup-${date}.json`;
        document.body.appendChild(a);
        a.click();

        // Cleanup
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    } catch (e) {
        console.error('Export failed:', e);
        alert('Failed to export data. See console for details.');
    }
}

export function importData(file) {
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
        try {
            const content = e.target.result;
            const data = JSON.parse(content);

            // Basic validation
            if (!data.appVersion || !data.workspaces || !Array.isArray(data.workspaces)) {
                throw new Error('Invalid TaskFlow backup file structure.');
            }

            // Hydrate store with new data
            hydrate(data);

            // Persist immediately to save the imported state
            persist();

            // Re-apply theme
            document.documentElement.setAttribute('data-theme', store.theme);

            alert('Import successful!');
        } catch (err) {
            console.error('Import failed:', err);
            alert('Import failed: ' + err.message);
        }
    };
    reader.readAsText(file);
}
