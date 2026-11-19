// Conexión con Apps Script. POST text/plain (sin preflight CORS); el token va solo en el cuerpo.
import { TABLES } from './schema.js';
import { mergeTable } from './logic/sync.js';
import * as store from './store.js';

let current = 'ok';
let lastErr = '';
const listeners = new Set();
export const status = () => current;
export const lastError = () => lastErr;
export const onStatus = fn => (listeners.add(fn), () => listeners.delete(fn));
const setStatus = s => { current = s; listeners.forEach(fn => fn(s)); };

export async function call(action, extra = {}, { url, token } = store.settings(), ms = 30000) {
  let res;
  try {
    res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify({ token, action, ...extra }), redirect: 'follow', signal: AbortSignal.timeout(ms) }); // sin tope, una red colgada bloquea sync() para siempre
  } catch {
    throw new Error('Sin conexión con Google Sheets');
  }
  let body;
  try { body = JSON.parse(await res.text()); } catch { body = null; }
  if (!body || typeof body.ok !== 'boolean') throw new Error('La URL no responde como Readly (¿es la URL /exec de la implementación?)');
  if (!body.ok) throw new Error(body.error || 'Error desconocido en Apps Script');
  return body.data;
}

const offline = () => globalThis.navigator?.onLine === false;
const configured = () => { const { url, token } = store.settings(); return Boolean(url && token); };
let inflight = null;

export function sync() {
  return (inflight ??= run().finally(() => { inflight = null; }));
}

async function run() {
  // Sin URL nada se sube: no mostrar "pendiente" aunque haya cola.
  if (!configured()) { setStatus('sin-configurar'); return { ok: false, error: 'Configura la URL y el token en Ajustes' }; }
  if (offline()) { setStatus('sin-conexion'); return { ok: false, error: 'Sin conexión' }; }
  setStatus('sincronizando');
  try {
    const sent = store.queue();
    sent.forEach(o => { o.sent = true; }); // ver enqueue: un delete posterior ya no puede cancelar este create
    if (sent.length) {
      await call('batch', { ops: sent });
      store.setQueue(store.queue().filter(o => !sent.includes(o))); // lo encolado durante el envío se queda
    }
    const remote = await call('getAll');
    const q = store.queue();
    store.replaceTables(Object.fromEntries(TABLES.map(t => [t, mergeTable(t, store.all(t), remote?.[t] ?? [], q)])));
    store.setLastSync(new Date().toISOString());
    setStatus(store.queue().length ? 'pendiente' : 'ok');
    return { ok: true };
  } catch (e) {
    lastErr = e.message;
    setStatus(offline() ? 'sin-conexion' : 'error');
    return { ok: false, error: e.message };
  }
}

let timer;
export function scheduleSync(ms = 2000) {
  clearTimeout(timer);
  if (configured() && store.queue().length) setStatus('pendiente');
  timer = setTimeout(sync, ms);
}

/** Prueba URL + token sin guardarlos. Devuelve cuántos libros hay en la hoja. */
export async function testConnection(url, token) {
  const data = await call('getAll', {}, { url, token });
  return (data?.Libros ?? []).length;
}
