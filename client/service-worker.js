// client/service-worker.js
const CACHE_NAME = 'jarvis-v1';
const urlsToCache = [
  '/',
  '/index.html',
  '/style.css',
  '/main.js',
  '/three-setup.js'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(urlsToCache))
  );
});

self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(response => response || fetch(event.request))
  );
});