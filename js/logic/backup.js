// Respaldo: CSV (solo lectura en hojas de cálculo) y JSON (restaurable, se fusiona sin borrar).
import { TABLES } from '../schema.js';
import { keyOf } from './sync.js';

const cell = v => {
  let s = v == null ? '' : String(v);
  if (/^[=+\-@\t\r]/.test(s)) s = "'" + s; // Excel/Sheets ejecutarían la celda como fórmula
  return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};
export const toCSV = (rows, headers) =>
  '﻿' + [headers, ...rows.map(r => headers.map(h => r[h]))].map(line => line.map(cell).join(',')).join('\r\n') + '\r\n';

export const exportJSON = db => JSON.stringify({ app: 'readly', version: 1, exportado: new Date().toISOString(), tablas: db }, null, 2);

export function importJSON(text, db, nowIso) {
  let file;
  try { file = JSON.parse(text); } catch { file = null; }
  if (!file || file.app !== 'readly' || typeof file.tablas !== 'object') throw new Error('Archivo no válido: no es un respaldo de Readly');
  const out = { ...db };
  const ops = [];
  for (const sheet of TABLES) {
    const rows = file.tablas[sheet];
    if (!Array.isArray(rows)) continue;
    const key = keyOf(sheet);
    const table = [...(out[sheet] || [])];
    for (const row of rows) {
      if (!row || row[key] == null || row[key] === '') continue;
      const i = table.findIndex(r => r[key] === row[key]);
      const data = { ...(i >= 0 ? table[i] : {}), ...row, actualizado: nowIso };
      if (i >= 0) table[i] = data; else table.push(data);
      ops.push({ op: i >= 0 ? 'update' : 'create', sheet, id: row[key], data });
    }
    out[sheet] = table;
  }
  return { db: out, ops };
}
