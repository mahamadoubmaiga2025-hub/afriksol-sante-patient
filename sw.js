/* AfrikSol Santé — mise en cache pour un usage hors ligne (les appels d'urgence passent par le téléphone, sans internet) */
const CACHE = 'afriksolsante-bf-v3';
const FILES = ['./','index.html','styles.css?v=9','i18n.js?v=9','data.js?v=9','backend.js?v=9','app.js?v=9','manifest.webmanifest',
  'assets/logo-mark.png','assets/icon-192.png','assets/icon-512.png','assets/apple-touch-icon.png','assets/child-kevin.jpg','assets/specimen-adult.png'];
self.addEventListener('install', e => { e.waitUntil(caches.open(CACHE).then(c => c.addAll(FILES)).then(() => self.skipWaiting())); });
self.addEventListener('activate', e => { e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== location.origin) return;
  if (req.mode === 'navigate') {
    e.respondWith(fetch(req).then(r => { const copy = r.clone(); caches.open(CACHE).then(c => c.put('index.html', copy)); return r; }).catch(() => caches.match('index.html')));
    return;
  }
  e.respondWith(caches.match(req).then(hit => hit || fetch(req).then(r => { if (r.ok) { const copy = r.clone(); caches.open(CACHE).then(c => c.put(req, copy)); } return r; })));
});
