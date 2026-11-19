import * as store from '../store.js';
import { h, icon, norm, tags } from '../ui.js';
import { TIPOS_NOTA } from '../schema.js';
import { noteCard } from '../components/note-card.js';

export const live = true;
const st = { tipo: 'todas', libro: '', q: '' }; // se conserva mientras la app esté abierta

export default function notas(_, root) {
  const all = [...store.all('Notas')].sort((a, b) => String(b.creado).localeCompare(String(a.creado)));
  const books = new Map(store.all('Libros').map(b => [b.id, b]));

  if (!all.length) {
    root.append(h('div', { class: 'view' }, h('h1', {}, 'Mis notas'),
      h('div', { class: 'empty' }, h('h2', {}, 'Todavía no hay notas'),
        h('p', { class: 'muted' }, 'Abre un libro y toca el botón + para guardar un concepto, una cita o una idea.'),
        h('a', { class: 'btn', href: '#/biblioteca' }, 'Ir a la biblioteca'))));
    return;
  }

  const list = h('ul', { class: 'list' });
  const paint = () => {
    const q = norm(st.q.trim());
    const rows = all.filter(n => (st.tipo === 'todas' || n.tipo === st.tipo) && (!st.libro || n.libro_id === st.libro)
      && (!q || [n.texto, n.capitulo, ...tags(n.etiquetas), books.get(n.libro_id)?.titulo].some(f => norm(f).includes(q))));
    list.replaceChildren(...(rows.length ? rows.map(n => noteCard(n, books.get(n.libro_id), { showBook: true })) : [h('li', { class: 'empty' }, h('h2', {}, 'Ninguna nota coincide'), h('p', { class: 'muted' }, 'Prueba con otro filtro.'))]));
  };
  const chips = h('div', { class: 'chips chips--scroll', role: 'group', 'aria-label': 'Filtrar por tipo' },
    [{ id: 'todas', label: 'Todas' }, ...TIPOS_NOTA].map(t => {
      const c = t.id === 'todas' ? all.length : all.filter(n => n.tipo === t.id).length;
      if (!c && t.id !== 'todas') return null;
      return h('button', { type: 'button', class: 'chip', 'aria-pressed': String(st.tipo === t.id), html: t.id === 'todas' ? '' : icon(t.id, 'icon--sm'), onclick: e => {
        st.tipo = t.id; chips.querySelectorAll('.chip').forEach(x => x.setAttribute('aria-pressed', String(x === e.currentTarget))); paint();
      } }, t.label, ' ', h('span', { class: 'chip__count' }, c));
    }));
  const withNotes = [...new Set(all.map(n => n.libro_id))].map(id => books.get(id)).filter(Boolean).sort((a, b) => a.titulo.localeCompare(b.titulo, 'es'));
  const sel = h('select', { class: 'select', 'aria-label': 'Filtrar por libro', onchange: () => { st.libro = sel.value; paint(); } },
    h('option', { value: '' }, 'Todos los libros'), withNotes.map(b => h('option', { value: b.id, selected: st.libro === b.id }, b.titulo)));
  const search = h('input', { class: 'input', type: 'search', value: st.q, placeholder: 'Buscar en tus notas', 'aria-label': 'Buscar en tus notas', oninput: () => { st.q = search.value; paint(); } });

  root.append(h('div', { class: 'view' },
    h('h1', {}, 'Mis notas'),
    h('div', { class: 'section' }, h('div', { class: 'search', html: icon('buscar') }, search), chips, sel),
    list));
  paint();
}
