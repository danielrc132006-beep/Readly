import * as store from '../store.js';
import { h, icon, norm, tags } from '../ui.js';
import { ESTADOS } from '../schema.js';
import { percent } from '../logic/progress.js';
import { bookCard } from '../components/book-card.js';

export const live = true;
const KEY = 'readly:lib';
const ORDENES = [['recientes', 'Recientes'], ['titulo', 'Título'], ['autor', 'Autor'], ['progreso', 'Progreso'], ['calificacion', 'Calificación'], ['fecha_fin', 'Fecha de término'], ['prioridad', 'Prioridad']];
const PRIO = { alta: 0, media: 1, baja: 2 };
const cmp = (a, b) => String(a || '').localeCompare(String(b || ''), 'es', { sensitivity: 'base' });
const SORT = {
  recientes: (a, b) => cmp(b.actualizado, a.actualizado),
  titulo: (a, b) => cmp(a.titulo, b.titulo),
  autor: (a, b) => cmp(a.autor, b.autor),
  progreso: (a, b) => percent(b) - percent(a),
  calificacion: (a, b) => (Number(b.calificacion) || 0) - (Number(a.calificacion) || 0),
  fecha_fin: (a, b) => cmp(b.fecha_fin, a.fecha_fin),
  prioridad: (a, b) => (PRIO[a.prioridad] ?? 3) - (PRIO[b.prioridad] ?? 3) || cmp(b.actualizado, a.actualizado),
};

const loadState = () => { try { return { estado: 'todos', vista: 'lista', q: '', orden: 'recientes', ...JSON.parse(sessionStorage.getItem(KEY)) }; } catch { return { estado: 'todos', vista: 'lista', q: '', orden: 'recientes' }; } };

export default function biblioteca(_, root) {
  const st = loadState();
  const save = () => { try { sessionStorage.setItem(KEY, JSON.stringify(st)); } catch { /* sin almacenamiento */ } };
  const books = store.all('Libros');

  if (!books.length) {
    root.append(h('div', { class: 'view' },
      h('h1', {}, 'Biblioteca'),
      h('div', { class: 'empty' }, h('h2', {}, 'Tu biblioteca está vacía'), h('p', { class: 'muted' }, 'Agrega el libro que estás leyendo o los que quieres leer.'),
        h('a', { class: 'btn btn--primary', href: '#/libro/nuevo', html: icon('agregar') }, 'Agregar libro'))));
    return;
  }

  const list = h('div', { class: 'section' });
  const count = id => (id === 'todos' ? books.length : books.filter(b => b.estado === id).length);
  const tabs = h('div', { class: 'chips chips--scroll', role: 'group', 'aria-label': 'Filtrar por estado' });
  const paintTabs = () => tabs.replaceChildren(...[{ id: 'todos', label: 'Todos' }, ...ESTADOS].map(e =>
    h('button', { type: 'button', class: 'chip', 'aria-pressed': String(st.estado === e.id), onclick: () => {
      st.estado = e.id;
      if (e.id === 'por_leer') st.orden = 'prioridad';
      else if (st.orden === 'prioridad') st.orden = 'recientes';
      sel.value = st.orden; save(); paintTabs(); paintList();
    } }, e.label, ' ', h('span', { class: 'chip__count' }, count(e.id)))));

  const search = h('input', { class: 'input', type: 'search', value: st.q, placeholder: 'Título, autor o etiqueta', 'aria-label': 'Buscar libros', oninput: () => { st.q = search.value; save(); paintList(); } });
  const sel = h('select', { class: 'select', 'aria-label': 'Ordenar por', style: { width: 'auto' }, onchange: () => { st.orden = sel.value; save(); paintList(); } },
    ORDENES.map(([v, l]) => h('option', { value: v, selected: st.orden === v }, l)));
  const viewBtn = (v, label) => h('button', { type: 'button', class: 'chip', 'aria-pressed': String(st.vista === v), onclick: () => { st.vista = v; save(); toggle.querySelectorAll('button').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.v === v))); paintList(); }, 'data-v': v }, label);
  const toggle = h('div', { class: 'segmented', role: 'group', 'aria-label': 'Vista' }, viewBtn('lista', 'Lista'), viewBtn('categoria', 'Por categoría'));

  function paintList() {
    const q = norm(st.q.trim());
    const rows = books
      .filter(b => st.estado === 'todos' || b.estado === st.estado)
      .filter(b => !q || [b.titulo, b.autor, ...tags(b.etiquetas)].some(f => norm(f).includes(q)))
      .sort(SORT[st.orden] || SORT.recientes);
    if (!rows.length) {
      list.replaceChildren(h('div', { class: 'empty' }, h('h2', {}, 'Ningún libro coincide'), h('p', { class: 'muted' }, 'Prueba con otra búsqueda u otro estado.')));
      return;
    }
    if (st.vista === 'lista') { list.replaceChildren(h('ul', { class: 'list' }, rows.map(bookCard))); return; }
    const groups = new Map();
    for (const b of rows) { const g = b.genero || 'Sin categoría'; groups.set(g, [...(groups.get(g) || []), b]); }
    list.replaceChildren(...[...groups].sort((a, b) => cmp(a[0], b[0])).map(([g, bs]) =>
      h('details', { class: 'group', open: true }, h('summary', {}, g, h('span', { class: 'chip__count', style: { font: '500 14px var(--font-sans)' } }, `${bs.length} ${bs.length === 1 ? 'libro' : 'libros'}`)), h('ul', { class: 'list' }, bs.map(bookCard)))));
  }

  root.append(h('div', { class: 'view' },
    h('h1', {}, 'Biblioteca'),
    h('div', { class: 'section' },
      h('div', { class: 'search', html: icon('buscar') }, search),
      tabs,
      h('div', { class: 'toolbar', style: { flexWrap: 'wrap', justifyContent: 'space-between' } }, toggle, h('label', { style: { display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px' } }, 'Ordenar', sel))),
    list));
  paintTabs();
  paintList();
}
