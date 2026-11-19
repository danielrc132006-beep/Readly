// Estado local (localStorage) + cola de cambios pendientes. La UI siempre lee y escribe aquí.
// shortcut: localStorage (~5 MB) basta para uso personal; migrar a IndexedDB si se acerca al límite.
import { TABLES, HEADERS, CATEGORIAS_INICIALES, newId, now } from './schema.js';
import { keyOf, enqueue } from './logic/sync.js';

const K = { db: 'readly:db', queue: 'readly:queue', settings: 'readly:settings', lastSync: 'readly:lastSync' };
const SEED_TS = '2026-01-01T00:00:00.000Z'; // fijo: nunca gana a una edición real
let db, q, cfg;
const listeners = new Set();

const read = (k, fallback) => { try { return JSON.parse(localStorage.getItem(k)) ?? fallback; } catch { return fallback; } };
const write = (k, v) => localStorage.setItem(k, JSON.stringify(v));

export function load() {
  const saved = read(K.db, null);
  db = Object.fromEntries(TABLES.map(t => [t, saved?.[t] ?? []]));
  if (!saved) {
    // Mismos ids que crea setup() en Apps Script, así no se duplican al sincronizar.
    db.Categorias = CATEGORIAS_INICIALES.map((nombre, i) => ({ id: 'cat-' + String(i + 1).padStart(2, '0'), nombre, orden: i + 1, actualizado: SEED_TS }));
    write(K.db, db);
  }
  q = read(K.queue, []);
  cfg = read(K.settings, {});
}
load();

function persist() {
  write(K.db, db);
  write(K.queue, q);
  listeners.forEach(fn => fn());
}

export const all = table => db[table];
export const get = (table, id) => db[table].find(r => r[keyOf(table)] === id);
export const queue = () => q;
export const subscribe = fn => (listeners.add(fn), () => listeners.delete(fn));

export function save(table, row) {
  const key = keyOf(table);
  const ts = now();
  const existing = row[key] != null ? get(table, row[key]) : null;
  let saved;
  if (existing) {
    saved = Object.assign(existing, row, { actualizado: ts });
    q = enqueue(q, { op: 'update', sheet: table, id: saved[key], data: { ...saved } });
  } else {
    saved = { ...row, actualizado: ts };
    if (key === 'id') saved.id ||= newId();
    if (HEADERS[table].includes('creado')) saved.creado ||= ts;
    db[table].push(saved);
    q = enqueue(q, { op: 'create', sheet: table, id: saved[key], data: { ...saved } });
  }
  persist();
  return saved;
}

export function remove(table, id) {
  const key = keyOf(table);
  const drop = (t, pred) => {
    for (const r of db[t].filter(pred)) q = enqueue(q, { op: 'delete', sheet: t, id: r[keyOf(t)] });
    db[t] = db[t].filter(r => !pred(r));
  };
  if (table === 'Libros') for (const t of ['Sesiones', 'Notas', 'Resenas']) drop(t, r => r.libro_id === id);
  drop(table, r => r[key] === id);
  persist();
}

export const setConfig = (clave, valor) => save('Config', { clave, valor });
export const config = clave => get('Config', clave)?.valor;

/** Usados por api.js tras sincronizar. */
export function replaceTables(next) { db = { ...db, ...next }; persist(); }
export function setQueue(next) { q = next; persist(); }
/** Fusiona un respaldo importado (ya resuelto por backup.importJSON). */
export function applyImport({ db: next, ops }) {
  db = Object.fromEntries(TABLES.map(t => [t, next[t] ?? db[t]]));
  for (const op of ops) q = enqueue(q, op);
  persist();
}
export const snapshot = () => db;

export const settings = () => cfg;
export function setSettings(patch) { cfg = { ...cfg, ...patch }; write(K.settings, cfg); listeners.forEach(fn => fn()); }
export const lastSync = () => read(K.lastSync, null);
export const setLastSync = ts => write(K.lastSync, ts);
