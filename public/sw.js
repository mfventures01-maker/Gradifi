// ============================================================================
// GRADIFI / SEFAES - SERVICE WORKER
// Offline-First Architecture
// Constitutional Law 8: Build Engines, Not Pages
// ============================================================================

const CACHE_VERSION = 'v2';
const STATIC_CACHE = `gradifi-static-${CACHE_VERSION}`;
const DYNAMIC_CACHE = `gradifi-dynamic-${CACHE_VERSION}`;
const ASSET_CACHE = `gradifi-assets-${CACHE_VERSION}`;

// Assets to cache on install
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/favicon.ico'
];

// Asset extensions to cache
const ASSET_EXTENSIONS = [
  '.js', '.css', '.png', '.jpg', '.svg', '.woff2', '.woff', '.ttf'
];

// Routes to cache
const DYNAMIC_ROUTES = [
  '/api/',
  '/portal/principal',
  '/portal/teacher',
  '/portal/student',
  '/portal/parent',
  '/portal/bursar',
  '/portal/vp',
  '/onboarding',
  '/tools',
  '/tools/word-counter',
  '/tools/paraphraser',
  '/tools/readability',
  '/tools/citation',
  '/tools/summarizer'
];

// Install Event - Cache static assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then((cache) => {
        console.log('[SW] Caching static assets...');
        return cache.addAll(STATIC_ASSETS);
      })
      .then(() => self.skipWaiting())
  );
});

// Activate Event - Clean old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys
          .filter((key) => key !== STATIC_CACHE && key !== DYNAMIC_CACHE && key !== ASSET_CACHE)
          .map((key) => caches.delete(key))
      );
    })
    .then(() => self.clients.claim())
  );
});

// Fetch Event - Cache-first strategy
self.addEventListener('fetch', (event) => {
  const request = event.request;
  const url = new URL(request.url);

  // Skip non-GET requests and Supabase requests
  if (request.method !== 'GET' || url.hostname.includes('supabase.co')) {
    event.respondWith(fetch(request));
    return;
  }

  // Handle static assets (js, css, images)
  if (ASSET_EXTENSIONS.some(ext => url.pathname.endsWith(ext))) {
    event.respondWith(
      caches.match(request)
        .then((cached) => {
          if (cached) {
            // Return cached, update in background
            fetch(request).then((response) => {
              caches.open(ASSET_CACHE).then((cache) => {
                cache.put(request, response);
              });
            }).catch(() => {});
            return cached;
          }
          return fetch(request).then((response) => {
            const clone = response.clone();
            caches.open(ASSET_CACHE).then((cache) => {
              cache.put(request, clone);
            });
            return response;
          });
        })
    );
    return;
  }

  // Handle dynamic routes (HTML pages)
  if (DYNAMIC_ROUTES.some(route => url.pathname.startsWith(route))) {
    event.respondWith(
      caches.match(request)
        .then((cached) => {
          // Stale-while-revalidate
          const fetchPromise = fetch(request)
            .then((response) => {
              const clone = response.clone();
              caches.open(DYNAMIC_CACHE).then((cache) => {
                cache.put(request, clone);
              });
              return response;
            })
            .catch(() => {
              // If offline and no cache, return offline page
              return caches.match('/offline.html') || new Response('Offline - Please check your connection', {
                status: 503,
                statusText: 'Service Unavailable'
              });
            });

          if (cached) {
            // Return cached immediately, update in background
            return cached;
          }
          return fetchPromise;
        })
    );
    return;
  }

  // Default: Network-first with cache fallback
  event.respondWith(
    fetch(request)
      .then((response) => {
        const clone = response.clone();
        caches.open(DYNAMIC_CACHE).then((cache) => {
          cache.put(request, clone);
        });
        return response;
      })
      .catch(() => {
        return caches.match(request)
          .then((cached) => cached || new Response('Offline content not available', {
            status: 404,
            statusText: 'Not Found'
          }));
      })
  );
});
