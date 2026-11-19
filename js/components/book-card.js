import { h, icon } from '../ui.js';
import { ESTADOS, label } from '../schema.js';
import { percent } from '../logic/progress.js';
import { cover } from './cover.js';
import { openProgress, unit } from './progress-control.js';

export const yes = v => v === true || v === 'true' || v === 'TRUE';

export const statusPill = estado =>
  h('span', { class: `pill pill--${estado}`, html: icon(estado) }, label(ESTADOS, estado));

export function progressRow(book) {
  const p = percent(book);
  return h('div', { class: 'book-card__progress' },
    h('div', { class: 'progress', role: 'progressbar', 'aria-valuemin': 0, 'aria-valuemax': 100, 'aria-valuenow': p, 'aria-label': `Progreso de ${book.titulo}` },
      h('div', { class: 'progress__fill', style: { '--p': p + '%' } })),
    h('span', {}, `${p}%`));
}

export function bookCard(book) {
  const showProgress = book.estado === 'leyendo' || book.estado === 'abandonado';
  return h('li', { class: 'card book-card' },
    cover(book),
    h('div', { class: 'book-card__body' },
      h('a', { class: 'book-card__title', href: `#/libro/${encodeURIComponent(book.id)}` }, book.titulo),
      h('span', { class: 'muted' }, book.autor),
      h('div', { class: 'book-card__meta' },
        statusPill(book.estado),
        yes(book.favorito) ? h('span', { html: icon('favorito-lleno', 'icon--sm'), title: 'Favorito' }, h('span', { class: 'sr-only' }, 'Favorito')) : null,
        Number(book.calificacion) > 0 ? h('span', { html: icon('estrella', 'icon--sm'), style: { display: 'inline-flex', gap: '4px', alignItems: 'center' } }, String(book.calificacion).replace('.', ',')) : null,
        book.estado === 'leyendo' && Number(book.paginas_total) ? h('span', {}, `${Number(book.pagina_actual) || 0} / ${book.paginas_total} ${unit(book)}`) : null),
      showProgress ? progressRow(book) : null,
      book.estado === 'leyendo' ? h('div', {}, h('button', { class: 'btn btn--ghost', type: 'button', onclick: () => openProgress(book) }, 'Actualizar progreso')) : null));
}
