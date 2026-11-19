import * as store from '../store.js';
import { h, icon } from '../ui.js';
import { streak, finishedReads, booksByMonth, pagesByMonth, topGenres, avgRating, totalMinutes, goalFor, dayKey } from '../logic/stats.js';
import { bars, hbars, ring } from '../components/charts.js';
import { askGoal } from './inicio.js';

export const live = true;
const MONTHS = ['E', 'F', 'M', 'A', 'M', 'J', 'J', 'A', 'S', 'O', 'N', 'D'];
let year = new Date().getFullYear();

export default function estadisticas(_, root) {
  const libros = store.all('Libros'), sesiones = store.all('Sesiones'), resenas = store.all('Resenas');
  const now = new Date();
  const years = new Set([now.getFullYear()]);
  for (const x of [...sesiones, ...resenas]) if (x.fecha) years.add(Number(dayKey(x.fecha).slice(0, 4)));
  const yearSel = h('select', { class: 'select', 'aria-label': 'Año', style: { width: 'auto' }, onchange: () => { year = Number(yearSel.value); root.replaceChildren(); estadisticas(_, root); } },
    [...years].sort((a, b) => b - a).map(y => h('option', { value: y, selected: y === year }, String(y))));

  const reads = finishedReads(resenas, year);
  const byMonth = booksByMonth(resenas, year);
  const pages = pagesByMonth(sesiones, libros, year);
  const totalPages = pages.reduce((a, b) => a + b, 0);
  // Días transcurridos del año elegido (año completo si ya pasó).
  const dayCount = year < now.getFullYear() ? 365 : Math.max(1, Math.ceil((now - new Date(year, 0, 1)) / 864e5));
  const perDay = Math.round((totalPages / dayCount) * 10) / 10;
  const mins = totalMinutes(sesiones, year);
  const avg = avgRating(resenas, year);
  const genres = topGenres(resenas, libros, year);
  const goal = goalFor(store.all('Config'), year);
  const fmt = n => String(n).replace('.', ',');

  const stat = (value, labelText, cls = '') => h('div', { class: `card stat ${cls}` }, h('span', { class: 'stat__value' }, value), h('span', { class: 'stat__label' }, labelText));
  const empty = !reads.length && !totalPages && !mins;

  root.append(h('div', { class: 'view' },
    h('div', { class: 'section__head' }, h('h1', {}, 'Estadísticas'), yearSel),
    empty ? h('div', { class: 'empty' }, h('h2', {}, `Sin datos en ${year}`), h('p', { class: 'muted' }, 'Las estadísticas aparecen cuando registras progreso o terminas un libro.')) : null,
    h('div', { class: 'stat-grid' },
      stat(String(reads.length), reads.length === 1 ? 'libro terminado' : 'libros terminados'),
      stat(totalPages.toLocaleString('es'), 'páginas leídas', 'card--2'),
      stat(avg != null ? fmt(avg) : '–', 'calificación promedio', 'card--3'),
      stat(fmt(perDay), 'páginas por día', 'card--2'),
      stat(String(streak(sesiones, now)), 'días de racha actual'),
      stat(mins >= 60 ? `${Math.floor(mins / 60)} h${mins % 60 ? ` ${mins % 60} min` : ''}` : `${mins} min`, 'tiempo leído', 'card--4')),
    h('section', { class: 'card', style: { display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '18px' }, 'aria-labelledby': 'h-meta' },
      goal ? ring(reads.length, goal, `${reads.length} de ${goal} libros en ${year}`) : null,
      h('div', { style: { display: 'grid', gap: '9px', justifyItems: 'start' } },
        h('h2', { id: 'h-meta', style: { fontSize: 'var(--fs-h3)' } }, `Meta ${year}`),
        h('p', { class: 'muted' }, goal ? `${reads.length} de ${goal} libros.` : 'Sin meta definida.'),
        h('button', { type: 'button', class: 'btn btn--ghost', html: icon('meta', 'icon--sm'), onclick: () => askGoal(year) }, goal ? 'Cambiar meta' : 'Definir meta'))),
    h('section', { class: 'card card--paper section' }, h('h2', { style: { fontSize: 'var(--fs-h3)' } }, 'Libros por mes'), bars(byMonth, MONTHS, { label: 'Libros terminados por mes', unit: 'libros' })),
    h('section', { class: 'card card--paper section' }, h('h2', { style: { fontSize: 'var(--fs-h3)' } }, 'Páginas por mes'), bars(pages, MONTHS, { label: 'Páginas leídas por mes', unit: 'páginas' })),
    genres.length ? h('section', { class: 'card card--paper section' }, h('h2', { style: { fontSize: 'var(--fs-h3)' } }, 'Géneros más leídos'), hbars(genres.map(g => ({ label: g.genero, value: g.count })), { label: 'Libros terminados por género' })) : null));
}
