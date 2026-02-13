import { store, hydrate, persist, mutations } from '../store.js';

function validateBackupData(data) {
    if (!data || typeof data !== 'object') {
        return { ok: false, code: 'unsupported_structure', message: 'Backup format is unsupported.' };
    }

    if (!Array.isArray(data.workspaces)) {
        return { ok: false, code: 'missing_required_fields', message: 'Backup is missing required fields.' };
    }

    if (!data.columns || typeof data.columns !== 'object') {
        return { ok: false, code: 'missing_required_fields', message: 'Backup is missing required fields.' };
    }

    if (!data.tasks || typeof data.tasks !== 'object') {
        return { ok: false, code: 'missing_required_fields', message: 'Backup is missing required fields.' };
    }

    return { ok: true };
}

export function exportData() {
    try {
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

        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        mutations.pushToast({
            variant: 'success',
            message: 'Backup exported successfully.'
        });
    } catch (e) {
        console.error('Export failed:', e);
        mutations.pushToast({
            variant: 'error',
            message: 'Export failed. Please try again.'
        });
    }
}

export function importData(file) {
    if (!file) return false;

    const reader = new FileReader();
    reader.onload = (e) => {
        try {
            const content = e.target.result;
            let data = null;
            try {
                data = JSON.parse(content);
            } catch (jsonError) {
                mutations.pushToast({
                    variant: 'error',
                    message: 'Invalid backup JSON file.'
                });
                return;
            }

            const validation = validateBackupData(data);
            if (!validation.ok) {
                mutations.pushToast({
                    variant: 'error',
                    message: validation.message
                });
                return;
            }

            hydrate(data);
            persist();
            document.documentElement.setAttribute('data-theme', store.theme);
            mutations.pushToast({
                variant: 'success',
                message: 'Import successful.'
            });
        } catch (err) {
            console.error('Import failed:', err);
            mutations.pushToast({
                variant: 'error',
                message: 'Import failed. Backup format is unsupported.'
            });
        }
    };
    reader.onerror = () => {
        mutations.pushToast({
            variant: 'error',
            message: 'Import failed while reading the selected file.'
        });
    };
    reader.readAsText(file);
    return true;
}
