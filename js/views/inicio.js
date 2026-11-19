import * as store from '../store.js';
import { h, icon, toast } from '../ui.js';
import { estimateDays } from '../logic/progress.js';
import { streak, finishedReads, goalFor } from '../logic/stats.js';
import { cover } from '../components/cover.js';
import { bookCard, progressRow } from '../components/book-card.js';
import { openProgress, unit } from '../components/progress-control.js';
import { openSheet } from '../components/sheet.js';
import { ring } from '../components/charts.js';
import { noteCard } from '../components/note-card.js';

export const live = true;

export async function askGoal(year) {
  const inp = h('input', { class: 'input', type: 'number', inputmode: 'numeric', min: 1, max: 999, id: 'goal-in', value: goalFor(store.all('Config'), year) || '' });
  const err = h('p', { class: 'field__error', role: 'alert' });
  const v = await openSheet({
    title: `Meta de lectura ${year}`,
    content: h('div', { class: 'field' }, h('label', { for: 'goal-in' }, '¿Cuántos libros quieres leer este año?'), inp, err),
    actions: [{ label: 'Cancelar', kind: 'ghost', value: null }, { label: 'Guardar meta', kind: 'primary', run: () => {
      const n = Math.round(Number(inp.value));
      if (!(n >= 1)) { err.textContent = 'Escribe un número mayor que 0.'; return false; }
      return n;
    } }],
  });
  if (v) { store.setConfig(`meta_${year}`, String(v)); toast('Meta guardada'); }
}

function greeting() {
  const hr = new Date().getHours();
  return hr < 12 ? 'Buenos días' : hr < 19 ? 'Buenas tardes' : 'Buenas noches';
}

export default function inicio(_, root) {
  const books = store.all('Libros');
  const sessions = store.all('Sesiones');
  const year = new Date().getFullYear();
  const reading = books.filter(b => b.estado === 'leyendo').sort((a, b) => String(b.actualizado).localeCompare(String(a.actualizado)));

  if (!books.length) {
    root.append(h('div', { class: 'view' },
      h('div', { class: 'view-head' }, h('h1', {}, greeting())),
      h('div', { class: 'empty' }, h('h2', {}, 'Empieza tu registro de lecturas'),
        h('p', { class: 'muted' }, 'Agrega el libro que estás leyendo y lleva tu progreso, notas y reseñas en un solo lugar.'),
        h('a', { class: 'btn btn--primary', href: '#/libro/nuevo', html: icon('agregar') }, 'Agrega tu primer libro'))));
    return;
  }

  // Lo que estoy leyendo ahora: el más reciente destacado.
  const featured = reading[0];
  const est = featured && estimateDays(featured, sessions, new Date());
  const nowCard = featured ? h('section', { class: 'now', 'aria-labelledby': 'h-now' },
    h('h2', { id: 'h-now', class: 'eyebrow' }, 'Leyendo ahora'),
    h('a', { href: `#/libro/${encodeURIComponent(featured.id)}`, class: 'book-card', style: { gridTemplateColumns: '72px 1fr', textDecoration: 'none' } },
      cover(featured),
      h('span', { class: 'book-card__body' }, h('span', { class: 'book-card__title' }, featured.titulo), h('span', { class: 'muted' }, featured.autor))),
    h('p', { class: 'now__pages' }, String(Number(featured.pagina_actual) || 0), ' ', h('small', {}, Number(featured.paginas_total) ? `de ${featured.paginas_total} ${unit(featured) === 'min' ? 'minutos' : 'páginas'}` : unit(featured))),
    Number(featured.paginas_total) ? progressRow(featured) : null,
    est != null ? h('p', {}, `A tu ritmo, lo terminas en ${est} ${est === 1 ? 'día' : 'días'}.`) : null,
    h('div', { class: 'btn-row' }, h('button', { type: 'button', class: 'btn btn--primary', onclick: () => openProgress(featured) }, 'Actualizar progreso'))) : null;

  const goal = goalFor(store.all('Config'), year);
  const done = finishedReads(store.all('Resenas'), year).length;
  const goalCard = h('section', { class: 'card', 'aria-labelledby': 'h-goal', style: { display: 'grid', gap: '14px' } },
    h('div', { class: 'section__head' }, h('h2', { id: 'h-goal', style: { fontSize: 'var(--fs-h3)' } }, `Meta ${year}`),
      h('button', { type: 'button', class: 'icon-btn', 'aria-label': goal ? 'Cambiar meta' : 'Definir meta', html: icon('editar', 'icon--sm'), onclick: () => askGoal(year) })),
    goal
      ? h('div', { style: { display: 'flex', alignItems: 'center', gap: '18px' } }, ring(done, goal, `${done} de ${goal} libros leídos en ${year}`),
        h('p', {}, done >= goal ? '¡Cumpliste tu meta del año!' : `Te ${goal - done === 1 ? 'falta 1 libro' : `faltan ${goal - done} libros`}.`))
      : h('div', { style: { display: 'grid', gap: '11px', justifyItems: 'start' } }, h('p', { class: 'muted' }, `Llevas ${done} ${done === 1 ? 'libro terminado' : 'libros terminados'} este año.`),
        h('button', { type: 'button', class: 'btn btn--primary', html: icon('meta', 'icon--sm'), onclick: () => askGoal(year) }, 'Definir meta')));

  const days = streak(sessions, new Date());
  const streakCard = h('section', { class: 'card card--2 stat', 'aria-label': 'Racha de lectura' },
    h('span', { html: icon('racha') }),
    h('span', { class: 'stat__value' }, String(days)),
    h('span', { class: 'stat__label' }, days === 1 ? 'día seguido leyendo' : 'días seguidos leyendo'),
    days === 0 ? h('span', { class: 'stat__label' }, 'Registra una sesión hoy para empezar.') : null);

  const lastNote = [...store.all('Notas')].sort((a, b) => String(b.creado).localeCompare(String(a.creado)))[0];

  root.append(h('div', { class: 'view' },
    h('div', { class: 'view-head' }, h('h1', {}, greeting())),
    nowCard || h('div', { class: 'empty' }, h('h2', {}, 'No estás leyendo nada ahora'), h('p', { class: 'muted' }, 'Elige un libro de tu lista Por leer y márcalo como Leyendo.'), h('a', { class: 'btn', href: '#/biblioteca' }, 'Ver biblioteca')),
    reading.length > 1 ? h('section', { class: 'section' }, h('h2', { style: { fontSize: 'var(--fs-h3)' } }, 'También leyendo'), h('ul', { class: 'list' }, reading.slice(1).map(bookCard))) : null,
    h('div', { class: 'stat-grid', style: { gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))' } }, goalCard, streakCard),
    lastNote ? h('section', { class: 'section' }, h('h2', { style: { fontSize: 'var(--fs-h3)' } }, 'Última nota'), h('ul', { class: 'list' }, noteCard(lastNote, store.get('Libros', lastNote.libro_id), { showBook: true }))) : null));
}
