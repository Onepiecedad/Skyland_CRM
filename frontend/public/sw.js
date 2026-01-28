/* eslint-disable no-restricted-globals */

/**
 * Skyland CRM Service Worker
 * Provides offline support, caching, and background sync
 */

const CACHE_NAME = 'skyland-crm-v1';
const STATIC_CACHE_NAME = 'skyland-static-v1';
const DYNAMIC_CACHE_NAME = 'skyland-dynamic-v1';

// Static resources to cache immediately
const STATIC_ASSETS = [
    '/',
    '/index.html',
    '/manifest.json',
    '/offline.html'
];

// API endpoints to cache with network-first strategy
const API_CACHE_PATTERNS = [
    /\/rest\/v1\/customers/,
    /\/rest\/v1\/jobs/,
    /\/rest\/v1\/leads/,
    /\/rest\/v1\/notes/
];

// Install event - cache static assets
self.addEventListener('install', (event) => {
    console.log('[SW] Installing service worker...');

    event.waitUntil(
        caches.open(STATIC_CACHE_NAME)
            .then((cache) => {
                console.log('[SW] Caching static assets');
                return cache.addAll(STATIC_ASSETS);
            })
            .then(() => {
                // Skip waiting to activate immediately
                return self.skipWaiting();
            })
            .catch((error) => {
                console.error('[SW] Failed to cache static assets:', error);
            })
    );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
    console.log('[SW] Activating service worker...');

    event.waitUntil(
        caches.keys()
            .then((cacheNames) => {
                return Promise.all(
                    cacheNames
                        .filter((name) => {
                            // Delete old cache versions
                            return name.startsWith('skyland-') &&
                                name !== STATIC_CACHE_NAME &&
                                name !== DYNAMIC_CACHE_NAME;
                        })
                        .map((name) => {
                            console.log('[SW] Deleting old cache:', name);
                            return caches.delete(name);
                        })
                );
            })
            .then(() => {
                // Claim all clients immediately
                return self.clients.claim();
            })
    );
});

// Fetch event - serve from cache or network
self.addEventListener('fetch', (event) => {
    const { request } = event;
    const url = new URL(request.url);

    // Skip non-GET requests
    if (request.method !== 'GET') {
        return;
    }

    // Skip chrome-extension and other non-http requests
    if (!url.protocol.startsWith('http')) {
        return;
    }

    // Skip Supabase auth endpoints (always need fresh data)
    if (url.pathname.includes('/auth/')) {
        return;
    }

    // Check if this is an API request
    const isApiRequest = url.pathname.includes('/rest/v1/') ||
        url.hostname.includes('supabase');

    if (isApiRequest) {
        // Network-first strategy for API requests
        event.respondWith(networkFirstStrategy(request));
    } else if (request.destination === 'image') {
        // Cache-first for images
        event.respondWith(cacheFirstStrategy(request));
    } else {
        // Stale-while-revalidate for other requests (HTML, JS, CSS)
        event.respondWith(staleWhileRevalidate(request));
    }
});

/**
 * Network-first strategy
 * Try network first, fall back to cache if offline
 */
async function networkFirstStrategy(request) {
    try {
        const networkResponse = await fetch(request);

        // Clone and cache successful responses
        if (networkResponse.ok) {
            const cache = await caches.open(DYNAMIC_CACHE_NAME);
            cache.put(request, networkResponse.clone());
        }

        return networkResponse;
    } catch (error) {
        // Network failed, try cache
        const cachedResponse = await caches.match(request);

        if (cachedResponse) {
            console.log('[SW] Serving from cache (offline):', request.url);
            return cachedResponse;
        }

        // Return offline fallback for navigation requests
        if (request.mode === 'navigate') {
            return caches.match('/offline.html');
        }

        throw error;
    }
}

/**
 * Cache-first strategy
 * Try cache first, then network
 */
async function cacheFirstStrategy(request) {
    const cachedResponse = await caches.match(request);

    if (cachedResponse) {
        return cachedResponse;
    }

    try {
        const networkResponse = await fetch(request);

        // Cache successful responses
        if (networkResponse.ok) {
            const cache = await caches.open(DYNAMIC_CACHE_NAME);
            cache.put(request, networkResponse.clone());
        }

        return networkResponse;
    } catch (error) {
        // Return a placeholder for images if offline
        return new Response('', { status: 408, statusText: 'Offline' });
    }
}

/**
 * Stale-while-revalidate strategy
 * Return cached version immediately, update cache in background
 */
async function staleWhileRevalidate(request) {
    const cache = await caches.open(DYNAMIC_CACHE_NAME);
    const cachedResponse = await cache.match(request);

    // Fetch from network in background
    const fetchPromise = fetch(request)
        .then((networkResponse) => {
            if (networkResponse.ok) {
                cache.put(request, networkResponse.clone());
            }
            return networkResponse;
        })
        .catch(() => {
            // Network failed, return cached or offline page
            return cachedResponse || caches.match('/offline.html');
        });

    // Return cached version immediately, or wait for network
    return cachedResponse || fetchPromise;
}

// Handle messages from the main thread
self.addEventListener('message', (event) => {
    if (event.data && event.data.type === 'SKIP_WAITING') {
        self.skipWaiting();
    }

    if (event.data && event.data.type === 'CLEAR_CACHE') {
        caches.keys().then((names) => {
            names.forEach((name) => caches.delete(name));
        });
    }
});

// Background sync for offline actions
self.addEventListener('sync', (event) => {
    console.log('[SW] Background sync:', event.tag);

    if (event.tag === 'sync-pending-actions') {
        event.waitUntil(syncPendingActions());
    }
});

async function syncPendingActions() {
    // This would sync any pending offline mutations
    // For now, just log that sync occurred
    console.log('[SW] Syncing pending actions...');
}

// Push notifications (future feature)
self.addEventListener('push', (event) => {
    if (event.data) {
        const data = event.data.json();

        self.registration.showNotification(data.title || 'Skyland CRM', {
            body: data.body || 'Nytt meddelande',
            icon: '/icons/icon-192x192.png',
            badge: '/icons/icon-72x72.png',
            tag: data.tag || 'default',
            data: data.url || '/'
        });
    }
});

// Handle notification clicks
self.addEventListener('notificationclick', (event) => {
    event.notification.close();

    const url = event.notification.data || '/';

    event.waitUntil(
        self.clients.matchAll({ type: 'window' })
            .then((clients) => {
                // Focus existing window or open new one
                for (const client of clients) {
                    if (client.url === url && 'focus' in client) {
                        return client.focus();
                    }
                }
                return self.clients.openWindow(url);
            })
    );
});
