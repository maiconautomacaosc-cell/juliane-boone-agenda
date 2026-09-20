const CACHE = 'juliane-boone-v0.1.41';
const CORE = ['./index.html','./styles.css','./manifest.webmanifest','./js/app.js','./js/store.js','./js/data.js','./js/utils.js'];

self.addEventListener('install', event => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE);
    await Promise.allSettled(CORE.map(url => cache.add(url)));
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)));
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;
  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) return;
  const isAppCode = event.request.mode === 'navigate' || /\.(?:js|css|html|webmanifest)$/.test(url.pathname);
  if (isAppCode) {
    event.respondWith((async () => {
      try {
        const response = await fetch(event.request, { cache: 'no-store' });
        if (response && response.ok) {
          const cache = await caches.open(CACHE);
          cache.put(event.request, response.clone());
        }
        return response;
      } catch (_) {
        return (await caches.match(event.request)) || (await caches.match('./index.html'));
      }
    })());
    return;
  }
  event.respondWith((async () => {
    const cached = await caches.match(event.request);
    if (cached) return cached;
    try {
      const response = await fetch(event.request);
      if (response && response.ok) {
        const cache = await caches.open(CACHE);
        cache.put(event.request, response.clone());
      }
      return response;
    } catch (_) {
      return Response.error();
    }
  })());
});
