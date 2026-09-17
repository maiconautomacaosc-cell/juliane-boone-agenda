const CACHE = 'juliane-boone-v0.1.14';
const ASSETS = [
  './',
  './index.html',
  './styles.css',
  './manifest.webmanifest',
  './assets/logo-juliane-boone.png',
  './assets/informacoes-agendamento.jpg',
  './assets/cuidados-pos-atendimento.pdf',
  './assets/catalog/alongamento.jpg',
  './assets/catalog/banho-gel.jpg',
  './assets/catalog/esmaltacao-gel.jpg',
  './assets/catalog/manicure.png',
  './assets/catalog/pedicure.png',
  './assets/catalog/vip-pe-mao.png',
  './js/app.js',
  './js/store.js',
  './js/data.js',
  './js/utils.js'
];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(ASSETS)));
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  event.respondWith(
    caches.match(event.request).then((cached) => cached || fetch(event.request).then((response) => {
      const copy = response.clone();
      caches.open(CACHE).then((cache) => cache.put(event.request, copy));
      return response;
    }).catch(() => caches.match('./index.html')))
  );
});
