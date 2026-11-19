// Estadísticas. Los "días" son locales del dispositivo; una lectura terminada = una fila de Reseñas.
import { isoDay } from './status.js';

const num = x => Number(x) || 0;
/** 'YYYY-MM-DD' local. Una fecha sin hora ya es un día local y se respeta tal cual. */
export const dayKey = v => (/^\d{4}-\d{2}-\d{2}$/.test(v) ? v : isoDay(new Date(v)));
const inYear = (v, year) => !!v && dayKey(v).startsWith(year + '-');
const monthOf = v => Number(dayKey(v).slice(5, 7)) - 1;

export function streak(sessions, today = new Date()) {
  const days = new Set(sessions.map(s => dayKey(s.fecha ?? s)));
  const d = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  if (!days.has(isoDay(d))) d.setDate(d.getDate() - 1);
  let n = 0;
  while (days.has(isoDay(d))) { n++; d.setDate(d.getDate() - 1); }
  return n;
}

export const finishedReads = (resenas, year) => resenas.filter(r => inYear(r.fecha, year));

export function booksByMonth(resenas, year) {
  const out = Array(12).fill(0);
  for (const r of finishedReads(resenas, year)) out[monthOf(r.fecha)]++;
  return out;
}

export function pagesByMonth(sessions, libros, year) {
  const audio = new Set(libros.filter(l => l.formato === 'audiolibro').map(l => l.id));
  const out = Array(12).fill(0);
  for (const s of sessions) if (inYear(s.fecha, year) && !audio.has(s.libro_id)) out[monthOf(s.fecha)] += num(s.paginas);
  return out;
}

export function topGenres(resenas, libros, year, n = 5) {
  const genre = new Map(libros.map(l => [l.id, l.genero || 'Otro']));
  const counts = new Map();
  for (const r of finishedReads(resenas, year)) {
    const g = genre.get(r.libro_id) || 'Otro';
    counts.set(g, (counts.get(g) || 0) + 1);
  }
  return [...counts].map(([genero, count]) => ({ genero, count })).sort((a, b) => b.count - a.count).slice(0, n);
}

export function avgRating(resenas, year) {
  const vals = finishedReads(resenas, year).map(r => num(r.calificacion)).filter(v => v > 0);
  return vals.length ? Math.round(vals.reduce((a, b) => a + b, 0) / vals.length * 10) / 10 : null;
}

export const totalMinutes = (sessions, year) => sessions.filter(s => inYear(s.fecha, year)).reduce((a, s) => a + num(s.minutos), 0);

export function goalFor(config, year) {
  return num(config.find(c => c.clave === `meta_${year}`)?.valor) || null;
}
