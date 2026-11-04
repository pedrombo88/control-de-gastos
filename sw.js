/* Budviva 5.8 — recursos actualizados de red, uso offline conservado. */
const CACHE_PREFIX = 'control-de-gastos-';
const CACHE = CACHE_PREFIX + '5.8';
const CORE = ['./','./index.html','./recurring.js','./stats.js','./reconcile.js','./smart-import.js','./manifest.webmanifest','./icon.svg','./privacidad.html','./soporte.html'];

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
  if(request.method !== 'GET' || new URL(request.url).origin !== self.location.origin)return;
  if(request.mode === 'navigate'){
    event.respondWith((async () => {
      try {
        const response = await fetch(request,{cache:'no-store'});
        if(response.ok){
          const copy = response.clone();
          event.waitUntil(caches.open(CACHE).then(cache => cache.put('./index.html',copy)).catch(() => {}));
        }
        return response;
      }catch(err){
        const pathname=new URL(request.url).pathname;
        if(pathname.endsWith('/privacidad.html'))return await caches.match('./privacidad.html') || Response.error();
        if(pathname.endsWith('/soporte.html'))return await caches.match('./soporte.html') || Response.error();
        return await caches.match('./index.html') || Response.error();
      }
    })());
  }else{
    event.respondWith((async () => {
      try {
        const response = await fetch(request,{cache:'no-store'});
        if(response.ok){
          const copy=response.clone();
          event.waitUntil(caches.open(CACHE).then(cache => cache.put(request,copy)).catch(() => {}));
        }
        return response;
      }catch(err){
        return await caches.match(request) || Response.error();
      }
    })());
  }
});
