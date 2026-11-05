/* Budviva 6.6.0 — caché por ruta sin sustituir la pantalla principal. */
const CACHE_PREFIX = 'control-de-gastos-';
const CACHE = CACHE_PREFIX + '6.6.0';
const CORE = ['./','./index.html','./recurring.js','./stats.js','./reconcile.js','./documents.js','./backup-crypto.js','./smart-import.js','./manifest.webmanifest','./icon.svg','./privacidad.html','./soporte.html','./compartidos.html','./compartidos.js','./shared-config.js','./shared-expenses.js'];

function sameOrigin(request) {
  return new URL(request.url).origin === self.location.origin;
}

function navigationFallback(url) {
  const path = new URL(url).pathname;
  if (path.endsWith('/privacidad.html')) return './privacidad.html';
  if (path.endsWith('/soporte.html')) return './soporte.html';
  if (path.endsWith('/compartidos.html')) return './compartidos.html';
  const scopePath = new URL(self.registration.scope).pathname;
  if (path === scopePath || path === scopePath + 'index.html') return './index.html';
  return null;
}

self.addEventListener('install', event => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE);
    const requests = CORE.map(path => new Request(new URL(path, self.registration.scope).href, {cache:'reload'}));
    await cache.addAll(requests);
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter(k => k.startsWith(CACHE_PREFIX) && k !== CACHE).map(k => caches.delete(k)));
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', event => {
  const request = event.request;
  if (request.method !== 'GET' || !sameOrigin(request)) return;
  if (request.mode === 'navigate') {
    event.respondWith((async () => {
      const fallback = navigationFallback(request.url);
      try {
        const response = await fetch(request, {cache:'no-store'});
        if (response.ok && fallback) {
          const copy = response.clone();
          event.waitUntil(caches.open(CACHE).then(cache => cache.put(fallback, copy)).catch(() => {}));
        }
        return response;
      } catch (_err) {
        return (fallback && await caches.match(new URL(fallback, self.registration.scope).href)) || Response.error();
      }
    })());
    return;
  }

  event.respondWith((async () => {
    try {
      const response = await fetch(request, {cache:'no-store'});
      if (response.ok) {
        const copy = response.clone();
        event.waitUntil(caches.open(CACHE).then(cache => cache.put(request, copy)).catch(() => {}));
      }
      return response;
    } catch (_err) {
      return await caches.match(request) || Response.error();
    }
  })());
});
