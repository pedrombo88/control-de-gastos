/* Control de Gastos — caché offline V2.1 */
const CACHE_PREFIX = 'control-de-gastos-';
const CACHE = CACHE_PREFIX + '5.5';
const ASSETS = ['./','./index.html','./recurring.js','./stats.js','./reconcile.js','./smart-import.js','./savings.js','./savings.css','./manifest.webmanifest','./icon.svg'];
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE).then(cache => cache.addAll(ASSETS)).then(() => self.skipWaiting())
  );
});
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(key => key.startsWith(CACHE_PREFIX) && key !== CACHE).map(key => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});
self.addEventListener('fetch', event => {
  const request = event.request;
  if (request.method !== 'GET' || new URL(request.url).origin !== self.location.origin) return;
  if (request.mode === 'navigate') {
    event.respondWith(fetch(request).catch(() => caches.match('./index.html')));
  } else {
    event.respondWith(caches.match(request).then(hit => hit || fetch(request)));
  }
});