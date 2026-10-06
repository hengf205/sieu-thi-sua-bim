// Bump this name whenever the app shell changes so installed clients discard
// their previous UI and activate the updated files.
const CACHE_NAME = 'hoangnam-pos-v8';
const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './ban-hang.html',
  './quan-tri.html',
  './css/style.css',
  './js/data.js',
  './js/ban-hang.js',
  './js/quan-tri.js',
  './manifest.json',
  './icons/icon.svg',
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.0/css/all.min.css',
  'https://cdn.jsdelivr.net/npm/chart.js'
];

// Install Event - Cache assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[SW] Caching app shell & static assets');
      return cache.addAll(ASSETS_TO_CACHE).catch((err) => {
        console.warn('[SW] Caching warning (some remote assets may require network):', err);
      });
    })
  );
  self.skipWaiting();
});

// Activate Event - Clean old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cache) => {
          if (cache !== CACHE_NAME) {
            console.log('[SW] Clearing old cache:', cache);
            return caches.delete(cache);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Fetch Event - Serve from cache first, fallback to network
self.addEventListener('fetch', (event) => {
  const requestUrl = new URL(event.request.url);
  // Always get same-origin app files from the running server first. This keeps
  // POS installs up to date while retaining an offline fallback.
  if (requestUrl.origin === self.location.origin && !requestUrl.pathname.startsWith('/api/')) {
    event.respondWith(
      fetch(event.request).then((response) => {
        if (response.ok) {
          const copy = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
        }
        return response;
      }).catch(() => caches.match(event.request).then((cachedResponse) => {
        if (cachedResponse) return cachedResponse;
        if (event.request.headers.get('accept')?.includes('text/html')) return caches.match('./index.html');
      }))
    );
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse;
      }
      return fetch(event.request).catch(() => {
        // Return index.html if offline and requesting HTML
        if (event.request.headers.get('accept').includes('text/html')) {
          return caches.match('./index.html');
        }
      });
    })
  );
});
