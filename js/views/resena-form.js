import * as store from '../store.js';
import { h, icon, toast, tags } from '../ui.js';
import { ANIMOS, RITMOS } from '../schema.js';
import { starsInput } from '../components/stars.js';
import { yes } from '../components/book-card.js';
import { field } from './libro-form.js';

// Grupo de opciones única (Sí/No, ritmo) con botones aria-pressed; permite desmarcar.
function choice(options, value, aria) {
  let v = value;
  const el = h('div', { class: 'segmented', role: 'group', 'aria-label': aria });
  const paint = () => el.querySelectorAll('button').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.v === v)));
  options.forEach(o => el.append(h('button', { type: 'button', class: 'chip', 'data-v': o.id, onclick: () => { v = v === o.id ? '' : o.id; paint(); } }, o.label)));
  paint();
  return { el, get: () => v };
}

export default function resenaForm(params, root) {
  const book = store.get('Libros', params.id);
  if (!book) { root.append(h('div', { class: 'empty' }, h('h2', {}, 'Este libro ya no existe'), h('a', { class: 'btn', href: '#/biblioteca' }, 'Ir a la biblioteca'))); return; }
  const rid = params.query.get('r');
  const r = (rid && store.get('Resenas', rid)) || { libro_id: book.id, fecha: book.fecha_fin || '', calificacion: '' };
  const back = `#/libro/${encodeURIComponent(book.id)}`;

  let rating = Number(r.calificacion) || 0;
  const stars = starsInput(rating, v => { rating = v; });
  const texto = h('textarea', { class: 'textarea', id: 'rv-txt', maxlength: 10000, placeholder: '¿Qué te dejó este libro?' });
  texto.value = r.resena || '';
  const frase = h('textarea', { class: 'textarea', id: 'rv-frase', maxlength: 10000, style: { minHeight: '80px' }, placeholder: 'La frase o idea con la que te quedas' });
  frase.value = r.frase_clave || '';
  const fecha = h('input', { class: 'input', type: 'date', id: 'rv-fecha', value: r.fecha || '' });
  const SN = [{ id: 'true', label: 'Sí' }, { id: 'false', label: 'No' }];
  const asYN = v => (v === '' || v == null ? '' : yes(v) ? 'true' : 'false');
  const rec = choice(SN, asYN(r.recomendaria), '¿Lo recomendarías?');
  const rel = choice(SN, asYN(r.releeria), '¿Lo releerías?');
  const ritmo = choice(RITMOS, r.ritmo || '', 'Ritmo');
  const moods = new Set(tags(r.animo));
  const moodEl = h('div', { class: 'chips', role: 'group', 'aria-label': 'Ánimo y estilo' },
    ANIMOS.map(a => h('button', { type: 'button', class: 'chip', 'aria-pressed': String(moods.has(a.id)), onclick: e => {
      moods.has(a.id) ? moods.delete(a.id) : moods.add(a.id);
      e.currentTarget.setAttribute('aria-pressed', String(moods.has(a.id)));
    } }, a.label)));

  function onSubmit(e) {
    e.preventDefault();
    const saved = store.save('Resenas', {
      ...r, calificacion: rating || '', resena: texto.value.trim(), frase_clave: frase.value.trim(), fecha: fecha.value || r.fecha,
      recomendaria: rec.get(), releeria: rel.get(), ritmo: ritmo.get(), animo: [...moods].join(','),
    });
    // La calificación del libro es la de su lectura más reciente.
    const latest = store.all('Resenas').filter(x => x.libro_id === book.id).sort((a, b) => String(b.fecha).localeCompare(String(a.fecha)))[0];
    if (latest?.id === saved.id) store.save('Libros', { ...store.get('Libros', book.id), calificacion: saved.calificacion });
    toast('Reseña guardada');
    location.hash = back;
  }

  const label = (text, el) => h('div', { class: 'field' }, h('span', { class: 'field__label' }, text), el);
  root.append(h('div', { class: 'view' },
    h('div', { class: 'view-head' },
      h('p', { class: 'eyebrow' }, rid && r.resena ? 'Editar reseña' : 'Terminaste'),
      h('h1', {}, book.titulo),
      h('p', { class: 'muted' }, book.autor)),
    h('form', { class: 'form', novalidate: true, onsubmit: onSubmit },
      h('div', { class: 'card form' },
        label('Calificación', stars),
        field('Reseña', texto),
        h('div', { class: 'grid-2' }, label('¿Lo recomendarías?', rec.el), label('¿Lo releerías?', rel.el))),
      h('div', { class: 'card card--2 form' },
        label('Ánimo y estilo', moodEl),
        label('Ritmo', ritmo.el),
        field('Frase o idea con la que te quedas', frase),
        field('Fecha de término', fecha)),
      h('div', { class: 'btn-row', style: { justifyContent: 'flex-end' } },
        h('a', { class: 'btn btn--ghost', href: back }, 'Omitir'),
        h('button', { type: 'submit', class: 'btn btn--primary', html: icon('check', 'icon--sm') }, 'Guardar reseña')))));
}
