/**
 * Service Worker Registration
 * Registers the service worker and handles updates
 */

export function registerServiceWorker() {
    if ('serviceWorker' in navigator) {
        window.addEventListener('load', async () => {
            try {
                const registration = await navigator.serviceWorker.register('/sw.js', {
                    scope: '/'
                });

                console.log('[App] Service Worker registered:', registration.scope);

                // Check for updates
                registration.addEventListener('updatefound', () => {
                    const newWorker = registration.installing;

                    if (newWorker) {
                        newWorker.addEventListener('statechange', () => {
                            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                                // New content available, prompt user
                                showUpdateNotification();
                            }
                        });
                    }
                });

                // Handle controller change (new SW activated)
                navigator.serviceWorker.addEventListener('controllerchange', () => {
                    console.log('[App] New service worker activated');
                });

            } catch (error) {
                console.error('[App] Service Worker registration failed:', error);
            }
        });
    }
}

/**
 * Unregister service worker (for development/debugging)
 */
export async function unregisterServiceWorker() {
    if ('serviceWorker' in navigator) {
        const registration = await navigator.serviceWorker.ready;
        await registration.unregister();
        console.log('[App] Service Worker unregistered');
    }
}

/**
 * Show update notification to user
 */
function showUpdateNotification() {
    // Check if we have a toast function available
    if (window.showToast) {
        window.showToast({
            title: 'Uppdatering tillgänglig',
            description: 'En ny version finns. Klicka för att uppdatera.',
            action: {
                label: 'Uppdatera',
                onClick: () => {
                    window.location.reload();
                }
            }
        });
    } else {
        // Fallback: use confirm dialog
        const shouldUpdate = window.confirm(
            'En ny version av Skyland CRM finns tillgänglig. Vill du uppdatera nu?'
        );

        if (shouldUpdate) {
            window.location.reload();
        }
    }
}

/**
 * Check if app can be installed (PWA)
 */
export function setupInstallPrompt() {
    let deferredPrompt = null;

    window.addEventListener('beforeinstallprompt', (event) => {
        // Prevent default browser install prompt
        event.preventDefault();

        // Store the event for later use
        deferredPrompt = event;

        // Dispatch custom event that components can listen to
        window.dispatchEvent(new CustomEvent('pwa-install-available', {
            detail: { prompt: deferredPrompt }
        }));

        console.log('[App] Install prompt available');
    });

    window.addEventListener('appinstalled', () => {
        deferredPrompt = null;
        console.log('[App] App installed successfully');

        // Track installation
        window.dispatchEvent(new CustomEvent('pwa-installed'));
    });

    return {
        canInstall: () => deferredPrompt !== null,
        promptInstall: async () => {
            if (!deferredPrompt) {
                console.log('[App] Install prompt not available');
                return false;
            }

            deferredPrompt.prompt();
            const { outcome } = await deferredPrompt.userChoice;

            console.log('[App] Install prompt outcome:', outcome);

            if (outcome === 'accepted') {
                deferredPrompt = null;
            }

            return outcome === 'accepted';
        }
    };
}

/**
 * Check if app is running as installed PWA
 */
export function isRunningAsPWA() {
    return window.matchMedia('(display-mode: standalone)').matches ||
        window.navigator.standalone === true;
}

/**
 * Request notification permission
 */
export async function requestNotificationPermission() {
    if (!('Notification' in window)) {
        console.log('[App] Notifications not supported');
        return false;
    }

    if (Notification.permission === 'granted') {
        return true;
    }

    if (Notification.permission !== 'denied') {
        const permission = await Notification.requestPermission();
        return permission === 'granted';
    }

    return false;
}
