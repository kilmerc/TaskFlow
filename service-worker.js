const PRECACHE_VERSION = '2';
const RUNTIME_VERSION = '2';
const PRECACHE_NAME = `taskflow-precache-v${PRECACHE_VERSION}`;
const RUNTIME_NAME = `taskflow-runtime-v${RUNTIME_VERSION}`;

const APP_SHELL_URL = new URL('./index.html', self.location).toString();

const LOCAL_ASSETS = [
    './',
    './index.html',
    './manifest.webmanifest',
    './img/favicon.png',
    './img/icons/icon-192.png',
    './img/icons/icon-512.png',
    './css/base.css',
    './css/layout.css',
    './css/style.css',
    './css/components/workspace.css',
    './css/components/polish.css',
    './css/components/kanban-modal.css',
    './js/app.js',
    './js/store.js',
    './js/config/uiCopy.js',
    './js/directives/clickOutside.js',
    './js/bootstrap/dependencyCheck.js',
    './js/bootstrap/registerGlobals.js',
    './js/bootstrap/registerServiceWorker.js',
    './js/bootstrap/startApp.js',
    './js/composables/useDebouncedAction.js',
    './js/composables/useMenuNavigation.js',
    './js/composables/useUniqueId.js',
    './js/composables/useWorkspaceTaskContext.js',
    './js/components/AppDialog.js',
    './js/components/AppIcon.js',
    './js/components/AppToast.js',
    './js/components/CalendarSidebar.js',
    './js/components/CalendarView.js',
    './js/components/EisenhowerView.js',
    './js/components/FilterBar.js',
    './js/components/KanbanBoard.js',
    './js/components/KanbanColumn.js',
    './js/components/KanbanColumnHeader.js',
    './js/components/KanbanQuickAdd.js',
    './js/components/SearchControls.js',
    './js/components/TaskCard.js',
    './js/components/TaskModal.js',
    './js/components/TaskModalColumnPicker.js',
    './js/components/TaskModalSubtasks.js',
    './js/components/TaskModalTagEditor.js',
    './js/components/TemplateGalleryModal.js',
    './js/components/WorkspaceSwitcher.js',
    './js/utils/id.js',
    './js/utils/io.js',
    './js/utils/print.js',
    './js/utils/tagAutocomplete.js',
    './js/utils/tagParser.js',
    './js/utils/tagStyle.js',
    './js/utils/taskFilters.js',
    './js/utils/templateAutocomplete.js'
];

const CDN_ASSETS = [
    'https://cdn.jsdelivr.net/npm/vue@3.5.28/dist/vue.global.prod.js',
    'https://cdn.jsdelivr.net/npm/sortablejs@1.15.7/Sortable.min.js',
    'https://cdn.jsdelivr.net/npm/vuedraggable@4.1.0/dist/vuedraggable.umd.min.js'
];

const ALLOWED_EXTERNAL_ORIGINS = new Set([
    'https://cdn.jsdelivr.net'
]);

self.addEventListener('install', event => {
    event.waitUntil((async () => {
        const precache = await caches.open(PRECACHE_NAME);
        await precache.addAll(LOCAL_ASSETS);

        const runtimeCache = await caches.open(RUNTIME_NAME);
        await Promise.all(CDN_ASSETS.map(async assetUrl => {
            try {
                const response = await fetch(assetUrl, { cache: 'no-cache' });
                if (response && response.ok) {
                    await runtimeCache.put(assetUrl, response);
                }
            } catch (error) {
                console.warn('Failed to pre-cache external asset:', assetUrl, error);
            }
        }));
    })());
});

self.addEventListener('activate', event => {
    event.waitUntil((async () => {
        const validCacheNames = new Set([PRECACHE_NAME, RUNTIME_NAME]);
        const existingNames = await caches.keys();
        await Promise.all(existingNames.map(cacheName => {
            if (!cacheName.startsWith('taskflow-')) {
                return Promise.resolve();
            }
            if (validCacheNames.has(cacheName)) {
                return Promise.resolve();
            }
            return caches.delete(cacheName);
        }));
    })());
});

self.addEventListener('fetch', event => {
    if (event.request.method !== 'GET') {
        return;
    }

    if (event.request.mode === 'navigate') {
        event.respondWith(handleNavigationRequest(event.request));
        return;
    }

    if (isStaticAssetRequest(event.request.url)) {
        event.respondWith(handleStaticAssetRequest(event.request));
    }
});

function isStaticAssetRequest(requestUrl) {
    const url = new URL(requestUrl);
    if (url.origin === self.location.origin) {
        return true;
    }
    return ALLOWED_EXTERNAL_ORIGINS.has(url.origin);
}

async function handleNavigationRequest(request) {
    try {
        const response = await fetch(request);
        if (response && response.ok) {
            const runtimeCache = await caches.open(RUNTIME_NAME);
            await runtimeCache.put(request, response.clone());
        }
        return response;
    } catch (error) {
        const fallbacks = [
            request,
            APP_SHELL_URL,
            './',
            './index.html',
            new URL('./', self.location).toString()
        ];

        for (const fallbackRequest of fallbacks) {
            const fallbackResponse = await caches.match(fallbackRequest);
            if (fallbackResponse) {
                return fallbackResponse;
            }
        }

        return new Response('Offline and no app shell available.', {
            status: 503,
            statusText: 'Service Unavailable',
            headers: { 'Content-Type': 'text/plain; charset=UTF-8' }
        });
    }
}

async function handleStaticAssetRequest(request) {
    const cached = await caches.match(request);
    if (cached) {
        return cached;
    }

    try {
        const response = await fetch(request);
        if (response && (response.ok || response.type === 'opaque')) {
            const runtimeCache = await caches.open(RUNTIME_NAME);
            await runtimeCache.put(request, response.clone());
        }
        return response;
    } catch (error) {
        const fallback = await caches.match(request);
        if (fallback) {
            return fallback;
        }
        throw error;
    }
}
