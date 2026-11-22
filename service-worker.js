// Sube CACHE_VERSION en cada despliegue para que los teléfonos reciban la versión nueva.
const CACHE_VERSION = 'readly-v3';
const COVERS = 'readly-covers';
const MAX_COVERS = 150;

const SHELL = [
  './', 'index.html', 'manifest.webmanifest', 'favicon.svg',
  'css/tokens.css', 'css/app.css',
  'icons/sprite.svg', 'icons/icon-192.png', 'icons/icon-512.png', 'icons/apple-touch-icon.png',
  'js/app.js', 'js/schema.js', 'js/store.js', 'js/api.js', 'js/ui.js', 'js/covers.js',
  'js/logic/progress.js', 'js/logic/stats.js', 'js/logic/sync.js', 'js/logic/backup.js', 'js/logic/status.js',
  'js/components/sheet.js', 'js/components/cover.js', 'js/components/book-card.js', 'js/components/progress-control.js',
  'js/components/stars.js', 'js/components/note-card.js', 'js/components/charts.js',
  'js/views/inicio.js', 'js/views/biblioteca.js', 'js/views/libro.js', 'js/views/libro-form.js',
  'js/views/resena-form.js', 'js/views/nota-form.js', 'js/views/notas.js', 'js/views/estadisticas.js', 'js/views/ajustes.js',
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE_VERSION).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys()
    .then(keys => Promise.all(keys.filter(k => k !== CACHE_VERSION && k !== COVERS).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});

async function trimCovers() {
  const c = await caches.open(COVERS);
  const keys = await c.keys();
  for (const k of keys.slice(0, Math.max(0, keys.length - MAX_COVERS))) await c.delete(k);
}

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return; // Apps Script (POST) nunca pasa por la caché
  const url = new URL(req.url);

  // Navegación: red primero, caché si no hay conexión.
  if (req.mode === 'navigate') {
    e.respondWith(fetch(req).then(res => {
      if (res.ok) { const copy = res.clone(); caches.open(CACHE_VERSION).then(c => c.put('index.html', copy)); } // nunca guardar un 404/503 como app
      return res;
    }).catch(() => caches.match('index.html')));
    return;
  }

  // Archivos propios: caché primero.
  if (url.origin === location.origin) {
    e.respondWith(caches.match(req).then(hit => hit || fetch(req)));
    return;
  }

  // Portadas de otros orígenes: caché runtime limitada.
  if (req.destination === 'image') {
    e.respondWith(caches.open(COVERS).then(async c => {
      const hit = await c.match(req);
      if (hit) return hit;
      const res = await fetch(req);
      if (res.ok || res.type === 'opaque') { c.put(req, res.clone()); trimCovers(); }
      return res;
    }).catch(() => Response.error()));
    return;
  }

  // Fuentes de Google: caché primero con relleno.
  if (url.hostname.endsWith('fonts.googleapis.com') || url.hostname.endsWith('fonts.gstatic.com')) {
    e.respondWith(caches.open(CACHE_VERSION).then(async c => (await c.match(req)) || fetch(req).then(res => { c.put(req, res.clone()); return res; })));
  }
});
