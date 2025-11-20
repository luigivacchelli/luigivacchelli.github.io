// 1. Update this version number every time you update your website content!
const CACHE_NAME = 'luigi-portfolio-v1';

// 2. List of files to cache immediately (The "Core")
const ASSETS_TO_CACHE = [
  './',                 // The root index
  './index.html',       // The HTML file
  './stile.css',        // The CSS
  './script.js',        // The JS
  './fonts/Kirome/Kirome.woff2', // Critical Font
  './logos/lores/loaderlogo.webp', // Preloader Image
  './lv/lores/sleepy.webp' // Easter Egg Image
];

// Install Event: Cache the core assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('[Service Worker] Caching all: app shell and content');
        return cache.addAll(ASSETS_TO_CACHE);
      })
  );
});

// Fetch Event: Serve from Cache, Fallback to Network
self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        // Cache hit - return response
        if (response) {
          return response;
        }
        // Clone the request (streams can only be consumed once)
        const fetchRequest = event.request.clone();

        return fetch(fetchRequest).then(
          (response) => {
            // Check if we received a valid response
            if(!response || response.status !== 200 || response.type !== 'basic') {
              return response;
            }

            // Clone the response
            const responseToCache = response.clone();

            // Add the new file to the cache for next time
            caches.open(CACHE_NAME)
              .then((cache) => {
                cache.put(event.request, responseToCache);
              });

            return response;
          }
        );
      })
  );
});

// Activate Event: Clean up old caches
self.addEventListener('activate', (event) => {
  const cacheWhitelist = [CACHE_NAME];
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheWhitelist.indexOf(cacheName) === -1) {
            // Delete old versions of the cache
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});

//  Created by Luigi Vacchelli on 20/11/25.

