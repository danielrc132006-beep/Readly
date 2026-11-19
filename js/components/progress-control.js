// Actualizar progreso (crea la sesión) y terminar un libro (crea su fila de reseña).
import * as store from '../store.js';
import { h, toast } from '../ui.js';
import { openSheet, confirmDialog } from './sheet.js';
import { sessionFromProgress } from '../logic/progress.js';
import { applyStatusChange } from '../logic/status.js';

export const unit = book => (book.formato === 'audiolibro' ? 'min' : 'pág.');
const num = x => Number(x) || 0;

/** Marca como Leído, crea la lectura (fila de Reseñas) y abre el formulario de reseña. */
export function finishBook(book) {
  const saved = store.save('Libros', applyStatusChange(book, 'leido', new Date()));
  const r = store.save('Resenas', { libro_id: saved.id, fecha: saved.fecha_fin, calificacion: '', resena: '', recomendaria: '', releeria: '', animo: '', ritmo: '', frase_clave: '' });
  location.hash = `#/libro/${encodeURIComponent(saved.id)}/resena?r=${encodeURIComponent(r.id)}`;
}

/** Guarda una nueva página; devuelve la sesión creada (o null). */
export function saveProgress(book, page, minutos = '') {
  const total = num(book.paginas_total);
  const p = Math.max(0, total > 0 ? Math.min(num(page), total) : num(page));
  const session = sessionFromProgress(book, p, { minutos });
  if (session) store.save('Sesiones', session);
  let next = { ...book, pagina_actual: p };
  if (book.estado === 'por_leer' && p > 0) next = applyStatusChange(next, 'leyendo', new Date());
  store.save('Libros', next);
  return { session, reachedEnd: total > 0 && p >= total && book.estado !== 'leido' };
}

export async function openProgress(book, { minutos = '' } = {}) {
  const total = num(book.paginas_total);
  const u = unit(book);
  const page = h('input', { class: 'input', type: 'number', inputmode: 'numeric', min: 0, max: total || null, value: num(book.pagina_actual), id: 'pg-input' });
  const range = total ? h('input', { type: 'range', min: 0, max: total, value: num(book.pagina_actual), 'aria-label': `Deslizar ${u === 'min' ? 'minuto' : 'página'} actual` }) : null;
  const mins = h('input', { class: 'input', type: 'number', inputmode: 'numeric', min: 0, value: minutos, id: 'pg-min', placeholder: 'Opcional' });
  const err = h('p', { class: 'field__error', role: 'alert' });
  const set = v => { const c = Math.max(0, total ? Math.min(v, total) : v); page.value = c; if (range) range.value = c; };
  range?.addEventListener('input', () => { page.value = range.value; });
  page.addEventListener('input', () => { if (range) range.value = page.value; });
  const step = d => h('button', { type: 'button', class: 'chip', onclick: () => set(num(page.value) + d) }, (d > 0 ? '+' : '−') + Math.abs(d));

  const res = await openSheet({
    title: 'Actualizar progreso',
    content: h('div', { class: 'form' },
      h('p', { class: 'muted' }, book.titulo),
      h('div', { class: 'field' }, h('label', { for: 'pg-input' }, u === 'min' ? 'Minuto actual' : 'Página actual', total ? ` (de ${total})` : ''), page, err),
      range,
      h('div', { class: 'chips' }, step(-1), step(10), step(25)),
      h('div', { class: 'field' }, h('label', { for: 'pg-min' }, 'Minutos leídos'), mins)),
    actions: [
      { label: 'Cancelar', kind: 'ghost', value: null },
      { label: 'Guardar', kind: 'primary', run: () => {
        const v = num(page.value);
        if (page.value === '' || v < 0) { err.textContent = 'Escribe un número válido.'; page.setAttribute('aria-invalid', 'true'); return false; }
        if (total && v > total) { err.textContent = `No puede ser mayor que ${total}.`; page.setAttribute('aria-invalid', 'true'); return false; }
        return { page: v, minutos: mins.value === '' ? '' : num(mins.value) };
      } },
    ],
  });
  if (!res) return;
  const { session, reachedEnd } = saveProgress(store.get('Libros', book.id) || book, res.page, res.minutos);
  toast(session ? `Guardado: ${session.paginas} ${u} leídas` : 'Progreso guardado');
  if (reachedEnd && await confirmDialog('¿Terminaste el libro?', { ok: 'Marcar como leído', danger: false })) finishBook(store.get('Libros', book.id));
}
