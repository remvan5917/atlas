// Garde Atlas disponible même sans réseau (les outils sans Internet marchent toujours).
// Les fichiers sont toujours vérifiés auprès du serveur (sinon le navigateur ressert une ancienne version).
const CACHE = 'atlas-app-v11';
const FILES = ['./', 'index.html', 'style.css', 'orthographe.js', 'cerveau.js', 'oreilles.js', 'voix.js', 'empreintes.js', 'yeux.js', 'atlas.js', 'outils.js', 'noyau.js',
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
