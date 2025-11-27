const CACHE_NAME = 'mcrypt-v1';
const OFFLINE_PAGE = '/offline-notification.html';

// Install event: Pre-cache the offline notification page
self.addEventListener('install', (event) => {
    console.log('[Service Worker] Installing...');
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            console.log('[Service Worker] Caching offline notification page');
            return cache.add(OFFLINE_PAGE);
        }).then(() => {
            // Activate immediately without waiting for other tabs to close
            return self.skipWaiting();
        })
    );
});

// Activate event: Clean up old caches
self.addEventListener('activate', (event) => {
    console.log('[Service Worker] Activating...');
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cacheName) => {
                    if (cacheName !== CACHE_NAME) {
                        console.log('[Service Worker] Deleting old cache:', cacheName);
                        return caches.delete(cacheName);
                    }
                })
            );
        }).then(() => {
            return self.clients.claim();
        })
    );
});

// Fetch event: Network-first strategy with offline fallback
self.addEventListener('fetch', (event) => {
    const { request } = event;
    const url = new URL(request.url);

    // Only intercept GET requests
    if (request.method !== 'GET') {
        return;
    }

    // For the root URL (/), use network-first strategy with offline fallback
    if (url.pathname === '/' || url.pathname === '/index.html') {
        event.respondWith(
            fetch(request)
                .then((response) => {
                    // Cache successful responses
                    if (response && response.status === 200) {
                        const responseClone = response.clone();
                        caches.open(CACHE_NAME).then((cache) => {
                            cache.put(request, responseClone);
                        });
                    }
                    return response;
                })
                .catch(() => {
                    // Network failed, serve offline page
                    console.log('[Service Worker] Network request failed, serving offline page');
                    return caches.match(OFFLINE_PAGE);
                })
        );
    } else {
        // For other resources, use cache-first strategy
        event.respondWith(
            caches.match(request)
                .then((response) => {
                    if (response) {
                        return response;
                    }
                    return fetch(request)
                        .then((response) => {
                            // Cache successful responses
                            if (response && response.status === 200) {
                                const responseClone = response.clone();
                                caches.open(CACHE_NAME).then((cache) => {
                                    cache.put(request, responseClone);
                                });
                            }
                            return response;
                        })
                        .catch(() => {
                            // Return offline page as fallback for failed requests
                            return caches.match(OFFLINE_PAGE);
                        });
                })
        );
    }
});
