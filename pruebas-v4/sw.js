/* Sólo controla /pruebas-v4/: no altera la aplicación instalada. */
const CACHE='control-gastos-test-v4-20261102-b';
const FILES=['./','./index.html','./smart-import.js','./stats.js','./manifest.webmanifest','../recurring.js','../icon.svg'];
self.addEventListener('install',e=>e.waitUntil(caches.open(CACHE).then(c=>c.addAll(FILES)).then(()=>self.skipWaiting())));
self.addEventListener('activate',e=>e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k.startsWith('control-gastos-test-')&&k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',e=>{
 const req=e.request;if(req.method!=='GET'||new URL(req.url).origin!==self.location.origin)return;
 if(req.mode==='navigate')e.respondWith(fetch(req).catch(()=>caches.match('./index.html')));
 else e.respondWith(caches.match(req).then(hit=>hit||fetch(req)));
});