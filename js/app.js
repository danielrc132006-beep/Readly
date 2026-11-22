// Arranque: router por hash, estado de sincronización, botón flotante y service worker.
import * as store from './store.js';
import * as api from './api.js';
import { icon } from './ui.js';

const ROUTES = [
  [/^\/inicio$/, 'inicio', 'inicio'],
  [/^\/biblioteca$/, 'biblioteca', 'biblioteca'],
  [/^\/libro\/nuevo$/, 'libro-form', 'biblioteca'],
  [/^\/libro\/([^/]+)\/editar$/, 'libro-form', 'biblioteca'],
  [/^\/libro\/([^/]+)\/nota\/nueva$/, 'nota-form', 'biblioteca'],
  [/^\/libro\/([^/]+)\/resena$/, 'resena-form', 'biblioteca'],
  [/^\/libro\/([^/]+)$/, 'libro', 'biblioteca'],
  [/^\/nota\/([^/]+)\/editar$/, 'nota-form', 'notas'],
  [/^\/notas$/, 'notas', 'notas'],
  [/^\/estadisticas$/, 'estadisticas', 'estadisticas'],
  [/^\/ajustes$/, 'ajustes', null],
];
const FORMS = new Set(['libro-form', 'nota-form', 'resena-form', 'ajustes']);

const root = document.getElementById('view');
const fab = document.getElementById('fab');
let current = null;

export const navigate = hash => { location.hash = hash; };

function parse() {
  const [path, qs = ''] = (location.hash.slice(1) || '/inicio').split('?');
  for (const [re, view, tab] of ROUTES) {
    const m = path.match(re);
    if (m) return { view, tab, params: { id: m[1] ? decodeURIComponent(m[1]) : null, path, query: new URLSearchParams(qs) } };
  }
  return { view: 'inicio', tab: 'inicio', params: { path: '/inicio', query: new URLSearchParams() } };
}

let seq = 0;
async function render({ keepScroll = false } = {}) {
  const route = parse();
  const token = ++seq;
  const mod = await import(`./views/${route.view}.js`);
  if (token !== seq) return; // llegó un render más nuevo mientras cargaba la vista
  const y = scrollY;
  current?.cleanup?.();
  root.replaceChildren();
  current = { ...route, mod, cleanup: mod.default(route.params, root) };

  document.querySelectorAll('.tabbar a').forEach(a => (a.dataset.tab === route.tab ? a.setAttribute('aria-current', 'page') : a.removeAttribute('aria-current')));

  fab.hidden = FORMS.has(route.view);
  const inBook = route.view === 'libro';
  fab.href = inBook ? `#/libro/${encodeURIComponent(route.params.id)}/nota/nueva` : '#/libro/nuevo';
  fab.setAttribute('aria-label', inBook ? 'Agregar nota' : 'Agregar libro');

  if (keepScroll) scrollTo(0, y);
  else { scrollTo(0, 0); root.focus({ preventScroll: true }); }
}

// Vistas "vivas" se repintan cuando cambian los datos (por ejemplo, al terminar una sincronización).
let pending = false;
store.subscribe(() => {
  if (store.queue().length) api.scheduleSync();
  if (!current?.mod.live || pending) return;
  pending = true;
  requestAnimationFrame(() => { pending = false; render({ keepScroll: true }); });
});

const LABELS = {
  ok: ['nube-ok', 'Sincronizado'],
  pendiente: ['sincronizar', 'Cambios pendientes'],
  sincronizando: ['sincronizar', 'Sincronizando'],
  'sin-conexion': ['sin-conexion', 'Sin conexión'],
  error: ['sin-conexion', 'Error al sincronizar'],
  'sin-configurar': ['sincronizar', 'Solo en este dispositivo'],
};
const syncEl = document.getElementById('sync-state');
api.onStatus(s => {
  const [ic, text] = LABELS[s] || LABELS.ok;
  syncEl.innerHTML = `${icon(ic, 'icon--sm')}<span>${text}</span>`;
  syncEl.title = s === 'error' ? api.lastError() : '';
});

addEventListener('hashchange', () => render());
addEventListener('online', () => api.sync());
addEventListener('offline', () => api.sync());
document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') api.sync(); });

// La barra del sistema (hora, batería) toma el color de la cabecera, así se ven como un solo bloque.
const themeMeta = document.querySelector('meta[name="theme-color"]');
const syncThemeColor = () => { themeMeta.content = getComputedStyle(document.documentElement).getPropertyValue('--chrome').trim() || '#ffffff'; };
new MutationObserver(syncThemeColor).observe(document.documentElement, { attributeFilter: ['data-theme'] });
matchMedia('(prefers-color-scheme: dark)').addEventListener('change', syncThemeColor);
syncThemeColor();

// En desarrollo (localhost) el SW se activa solo con localStorage 'readly:sw' = '1', para no servir archivos viejos.
const devHost = ['localhost', '127.0.0.1'].includes(location.hostname);
let swOn = !devHost;
try { swOn ||= localStorage.getItem('readly:sw') === '1'; } catch { /* sin almacenamiento */ }
if ('serviceWorker' in navigator && swOn) navigator.serviceWorker.register('service-worker.js').catch(() => {});

render();
api.sync();
