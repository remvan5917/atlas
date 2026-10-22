// Garde Atlas disponible même sans réseau (les outils sans Internet marchent toujours).
// Les fichiers sont toujours vérifiés auprès du serveur (sinon le navigateur ressert une ancienne version).
const CACHE = 'atlas-app-v61';
const FILES = ['./', 'index.html', 'style.css', 'orthographe.js', 'cerveau.js', 'oreilles.js', 'voix.js', 'empreintes.js', 'yeux.js', 'atlas.js', 'outils.js', 'memoire.js', 'marche.js', 'proactif.js', 'maison.js', 'securite.js', 'pc.js', 'visio.js', 'scifi.js', 'noyau.js',
  'manifest.webmanifest', 'icons/icon-192.png', 'icons/icon-512.png'];
self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(FILES.map(f => new Request(f, { cache: 'reload' })))).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k.startsWith('atlas-app') && k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
const withTimeout = (p, ms) => new Promise((res, rej) => {
  const t = setTimeout(() => rej(new Error('lent')), ms);
  p.then(r => { clearTimeout(t); res(r); }, err => { clearTimeout(t); rej(err); });
});
self.addEventListener('fetch', e => {
  const req = e.request, url = new URL(req.url);
  // seulement les fichiers d'Atlas (pas Shadow, qui vit sur le même site, ni les appels au cerveau ou à l'ordinateur)
  if (req.method !== 'GET' || url.origin !== location.origin || !url.pathname.startsWith(new URL(self.registration.scope).pathname)) return;
  e.respondWith(
    withTimeout(fetch(req.url, { cache: 'no-cache', credentials: 'same-origin' }), 3500).then(res => {
      if (res.ok) { const copy = res.clone(); caches.open(CACHE).then(c => c.put(req, copy)); }
      return res;
    }).catch(() => caches.match(req, { ignoreSearch: true }).then(r => r || (req.mode === 'navigate' ? caches.match('index.html') : Promise.reject(new Error('hors-ligne')))))
  );
});

// ---------- les notifications de la maison (Web Push) : elles arrivent même quand Atlas est fermé, ou la nuit ----------
self.addEventListener('push', e => {
  let d = {};
  try { d = e.data ? e.data.json() : {}; } catch (er) { d = { titre: 'Atlas', texte: e.data ? e.data.text() : '' }; }
  const options = {
    body: d.texte || '', tag: d.tag || 'atlas', renotify: true, icon: 'icons/icon-192.png', badge: 'icons/icon-192.png',
    data: { id: d.id || null }, requireInteraction: !!d.urgent, // une alerte urgente reste à l'écran jusqu'à ce qu'on la touche
    vibrate: d.urgent ? [400, 150, 400, 150, 400, 150, 800] : [200, 100, 200],
  };
  if (d.image) options.image = d.image; // la photo de l'alerte (par l'ordinateur de la maison, avec un jeton)
  e.waitUntil(self.registration.showNotification(d.titre || 'Atlas', options));
});
self.addEventListener('notificationclick', e => {
  e.notification.close();
  const cible = new URL('./?alerte=' + (e.notification.data && e.notification.data.id || ''), self.registration.scope).href;
  e.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(l => {
    const c = l.find(x => x.url.startsWith(self.registration.scope));
    return c ? c.focus() : self.clients.openWindow(cible);
  }));
});
