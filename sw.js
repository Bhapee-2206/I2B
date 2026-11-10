/**
 * EDUTRACK PROGRESSIVE WEB APP (PWA) SERVICE WORKER
 * Offline App Shell Caching & Installability
 */

const CACHE_NAME = 'edutrack-pwa-v2.4';
const APP_SHELL_ASSETS = [
  './',
  './index.html',
  './login.html',
  './manifest.json',
  './css/style.css',
  './css/components.css',
  './css/dashboard.css',
  './css/responsive.css',
  './css/attendance.css',
  './js/config.js',
  './js/utils.js',
  './js/auth.js',
  './js/programmes.js',
  './js/fees.js',
  './js/students.js',
  './js/attendance.js',
  './js/monthly-fees.js',
  './js/payments.js',
  './js/receipts.js',
  './js/promotions.js',
  './js/reports.js',
  './js/settings.js',
  './js/excel-import.js',
  './js/dashboard.js',
  './js/app.js',
  './assets/logo/logo.jpg',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/apple-touch-icon.png'
];

// 1. Install Event – Precache App Shell
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[ServiceWorker] Caching app shell assets');
      return cache.addAll(APP_SHELL_ASSETS);
    }).then(() => self.skipWaiting())
  );
});

// 2. Activate Event – Clean Old Caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keyList) => {
      return Promise.all(
        keyList.map((key) => {
          if (key !== CACHE_NAME) {
            console.log('[ServiceWorker] Removing old cache', key);
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// 3. Fetch Event – Network-First for API / Supabase, Stale-While-Revalidate for local files
self.addEventListener('fetch', (event) => {
  const requestUrl = new URL(event.request.url);

  // Always go to network for Supabase API, Auth, and third-party CDNs to ensure fresh data
  if (
    requestUrl.origin.includes('supabase.co') ||
    requestUrl.origin.includes('wa.me') ||
    event.request.method !== 'GET'
  ) {
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        // Fetch in background to update cache
        fetch(event.request).then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, networkResponse.clone());
            });
          }
        }).catch(() => {});
        return cachedResponse;
      }

      // If not in cache, fetch from network
      return fetch(event.request).then((networkResponse) => {
        if (!networkResponse || networkResponse.status !== 200 || networkResponse.type !== 'basic') {
          return networkResponse;
        }

        const responseToCache = networkResponse.clone();
        caches.open(CACHE_NAME).then((cache) => {
          cache.put(event.request, responseToCache);
        });

        return networkResponse;
      }).catch(() => {
        // Offline fallback for navigation requests
        if (event.request.mode === 'navigate') {
          return caches.match('./index.html');
        }
      });
    })
  );
});

