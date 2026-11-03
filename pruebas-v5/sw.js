/* Cache aislada de Control de Gastos: /pruebas-v5/ */
const PREFIX='control-gastos-test-v5-',CACHE=PREFIX+'20261103-a';
const FILES=['./','./index.html','./recurring.js','./stats.js','./reconcile.js','./smart-import.js','./manifest.webmanifest','../icon.svg'];
self.addEventListener('install',e=>e.waitUntil(caches.open(CACHE).then(c=>c.addAll(FILES)).then(()=>self.skipWaiting())));
self.addEventListener('activate',e=>e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k.startsWith(PREFIX)&&k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',e=>{const r=e.request;if(r.method!=='GET'||new URL(r.url).origin!==self.location.origin)return;
if(r.mode==='navigate')e.respondWith(fetch(r).catch(()=>caches.match('./index.html')));
else e.respondWith(caches.match(r).then(hit=>hit||fetch(r)));});