/* AfrikSol Santé — mise en cache pour un usage hors ligne (les appels d'urgence passent par le téléphone, sans internet) */
const CACHE = 'afriksolsante-bf-v13';
/* Fichiers critiques : le shell et les scripts. Si l'un d'eux échoue,
   l'installation échoue comme avant — pas d'application hors-ligne
   bancale. */
const CRITICAL = ['./','index.html','styles.css?v=19','i18n.js?v=19','data.js?v=19','backend.js?v=19','qrcode.min.js?v=19','app.js?v=19','manifest.webmanifest'];
/* Assets lourds ou décoratifs : précachés « au mieux ». Un échec
   (coupure réseau pendant l'installation) est journalisé mais ne bloque
   pas l'installation ; le handler fetch ci-dessous les mettra en cache
   à la demande lors de leur premier affichage. Les images de pure
   démonstration (photo du profil fictif, enfant fictif) et l'icône
   512 ne sont plus précachées du tout : elles restent servies à la
   demande par le même handler. */
const OPTIONAL = ['assets/logo-mark.png','assets/icon-192.png','assets/apple-touch-icon.png'];
self.addEventListener('install', e => { e.waitUntil(
  caches.open(CACHE).then(c => c.addAll(CRITICAL).then(() =>
    Promise.all(OPTIONAL.map(f => c.add(f).catch(err => { if (self.console) console.warn('[SW] asset non précaché (il le sera à la demande) :', f, err); })))
  )).then(() => self.skipWaiting())
); });
self.addEventListener('activate', e => { e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== location.origin) return;
  if (req.mode === 'navigate') {
    e.respondWith(fetch(req).then(r => { const copy = r.clone(); caches.open(CACHE).then(c => c.put('index.html', copy)); return r; }).catch(() => caches.match('index.html')));
    return;
  }
  /* JS/CSS : stale-while-revalidate — la version en cache est servie tout de
     suite et le réseau la rafraîchit en arrière-plan pour la visite suivante
     (évite les utilisateurs bloqués durablement sur une vieille version). */
  if (/\.(?:js|css)$/.test(new URL(req.url).pathname)) {
    e.respondWith(caches.match(req).then(hit => {
      const net = fetch(req).then(r => { if (r.ok) { const copy = r.clone(); caches.open(CACHE).then(c => c.put(req, copy)); } return r; }).catch(() => hit);
      return hit || net;
    }));
    return;
  }
  e.respondWith(caches.match(req).then(hit => hit || fetch(req).then(r => { if (r.ok) { const copy = r.clone(); caches.open(CACHE).then(c => c.put(req, copy)); } return r; })));
});
