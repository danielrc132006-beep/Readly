import * as store from '../store.js';
import { h, icon, toast } from '../ui.js';
import { ESTADOS, FORMATOS, PRIORIDADES } from '../schema.js';
import { applyStatusChange } from '../logic/status.js';
import { searchBooks } from '../covers.js';
import { cover } from '../components/cover.js';
import { openSheet, confirmDialog } from '../components/sheet.js';
import { finishBook } from '../components/progress-control.js';
import { yes } from '../components/book-card.js';

let uid = 0;
export function field(labelText, control, { hint, error } = {}) {
  const id = control.id || (control.id = 'f' + ++uid);
  const err = h('p', { class: 'field__error', id: id + '-err', role: 'alert' }, error || '');
  control.setAttribute('aria-describedby', id + '-err');
  return h('div', { class: 'field' }, h('label', { for: id }, labelText), control, hint ? h('p', { class: 'field__hint' }, hint) : null, err);
}
export const setError = (control, msg) => {
  control.setAttribute('aria-invalid', msg ? 'true' : 'false');
  document.getElementById(control.id + '-err').textContent = msg || '';
};
const input = (name, value, attrs = {}) => h('input', { class: 'input', name, value: value ?? '', ...attrs });
const select = (name, value, options) => h('select', { class: 'select', name }, options.map(o => h('option', { value: o.id, selected: String(value ?? '') === o.id }, o.label)));

export default function libroForm(params, root) {
  const editing = params.id ? store.get('Libros', params.id) : null;
  if (params.id && !editing) { root.append(h('div', { class: 'empty' }, h('h2', {}, 'Este libro ya no existe'), h('a', { class: 'btn', href: '#/biblioteca' }, 'Ir a la biblioteca'))); return; }
  const b = editing ? { ...editing } : { estado: 'por_leer', formato: 'fisico', prioridad: 'media', pagina_actual: 0 };
  const cats = [...store.all('Categorias')].sort((x, y) => (Number(x.orden) || 0) - (Number(y.orden) || 0));

  const f = {
    titulo: input('titulo', b.titulo, { required: true, autocomplete: 'off' }),
    autor: input('autor', b.autor, { required: true, autocomplete: 'off' }),
    isbn: input('isbn', b.isbn, { inputmode: 'numeric', autocomplete: 'off' }),
    genero: select('genero', b.genero, [{ id: '', label: 'Sin categoría' }, ...cats.map(c => ({ id: c.nombre, label: c.nombre }))]),
    estado: select('estado', b.estado, ESTADOS),
    formato: select('formato', b.formato, FORMATOS),
    paginas_total: input('paginas_total', b.paginas_total, { type: 'number', inputmode: 'numeric', min: 0 }),
    pagina_actual: input('pagina_actual', b.pagina_actual, { type: 'number', inputmode: 'numeric', min: 0 }),
    editorial: input('editorial', b.editorial),
    anio: input('anio', b.anio, { type: 'number', inputmode: 'numeric', min: 0, max: 2100 }),
    fecha_inicio: input('fecha_inicio', b.fecha_inicio, { type: 'date' }),
    fecha_fin: input('fecha_fin', b.fecha_fin, { type: 'date' }),
    etiquetas: input('etiquetas', b.etiquetas, { placeholder: 'club de lectura, recomendado por Ana' }),
    prioridad: select('prioridad', b.prioridad, [{ id: '', label: 'Sin prioridad' }, ...PRIORIDADES]),
    portada_url: input('portada_url', b.portada_url, { type: 'url', placeholder: 'https://…', inputmode: 'url' }),
  };
  const fav = h('input', { type: 'checkbox', id: 'f-fav', checked: yes(b.favorito), style: { width: '22px', height: '22px', accentColor: 'var(--accent)' } });
  const isAudio = () => f.formato.value === 'audiolibro';
  const totalLabel = h('span', {}), actualLabel = h('span', {});
  const paintUnits = () => { totalLabel.textContent = isAudio() ? 'Duración total (minutos)' : 'Total de páginas'; actualLabel.textContent = isAudio() ? 'Minuto actual' : 'Página actual'; };
  f.formato.addEventListener('change', paintUnits);

  const preview = h('div', { style: { width: '96px' } });
  const paintCover = () => preview.replaceChildren(cover({ id: b.id || f.titulo.value, titulo: f.titulo.value || '?', portada_url: f.portada_url.value.trim() }));
  f.portada_url.addEventListener('change', paintCover);
  f.titulo.addEventListener('change', paintCover);

  const searchStatus = h('p', { class: 'field__hint', role: 'status' });
  async function lookup() {
    const q = f.isbn.value.trim() || [f.titulo.value, f.autor.value].join(' ').trim();
    if (!q) { searchStatus.textContent = 'Escribe un título, autor o ISBN para buscar.'; return; }
    searchStatus.textContent = 'Buscando…';
    let results;
    try { results = await searchBooks(q); } catch (e) { searchStatus.textContent = e.message === 'Sin conexión' ? 'Sin conexión: la búsqueda necesita internet. Puedes llenar los datos a mano.' : 'No se pudo buscar ahora. Intenta de nuevo.'; return; }
    if (!results.length) { searchStatus.textContent = 'Sin resultados. Revisa el título o llena los datos a mano.'; return; }
    searchStatus.textContent = '';
    const pick = await openSheet({
      title: 'Elige el libro',
      content: close => h('ul', { class: 'list' }, results.map((r, i) => h('li', {},
        h('button', { type: 'button', class: 'card card--paper book-card', style: { width: '100%', textAlign: 'left', cursor: 'pointer', gridTemplateColumns: '48px 1fr' }, onclick: () => close(i) },
          cover({ id: 'r' + i, titulo: r.titulo, portada_url: r.portada_url }),
          h('span', { class: 'book-card__body' }, h('strong', { style: { fontWeight: 500 } }, r.titulo), h('span', { class: 'muted' }, [r.autor, r.anio].filter(Boolean).join(', '))))))),
      actions: [{ label: 'Cancelar', kind: 'ghost', value: null }],
    });
    if (pick == null) return;
    const r = results[pick];
    const fill = (k, v) => { if (v && !String(f[k].value).trim()) f[k].value = v; };
    fill('titulo', r.titulo); fill('autor', r.autor); fill('isbn', r.isbn); fill('editorial', r.editorial); fill('anio', r.anio); fill('paginas_total', r.paginas);
    if (r.portada_url) f.portada_url.value = r.portada_url;
    paintCover();
    toast('Datos completados');
  }

  async function onSubmit(e) {
    e.preventDefault();
    const v = Object.fromEntries(Object.entries(f).map(([k, el]) => [k, el.value.trim()]));
    let bad = null;
    for (const k of ['titulo', 'autor']) { setError(f[k], v[k] ? '' : 'Este campo es obligatorio.'); if (!v[k]) bad ||= f[k]; }
    const total = Number(v.paginas_total) || 0, actual = Number(v.pagina_actual) || 0;
    setError(f.pagina_actual, total && actual > total ? `No puede ser mayor que ${total}.` : '');
    if (total && actual > total) bad ||= f.pagina_actual;
    if (bad) { bad.focus(); return; }

    const prevEstado = editing?.estado;
    let row = { ...b, ...v, paginas_total: total || '', pagina_actual: actual, favorito: fav.checked, anio: v.anio };
    if (v.estado !== prevEstado && v.estado !== 'leido') row = applyStatusChange(row, v.estado, new Date());
    if (v.estado === 'leido' && prevEstado !== 'leido') {
      const saved = store.save('Libros', { ...row, estado: prevEstado || 'leyendo' });
      finishBook(saved); // crea la lectura y abre la reseña
      return;
    }
    const saved = store.save('Libros', row);
    toast(editing ? 'Cambios guardados' : 'Libro agregado');
    location.hash = `#/libro/${encodeURIComponent(saved.id)}`;
  }

  async function onDelete() {
    const n = store.all('Notas').filter(x => x.libro_id === b.id).length;
    const s = store.all('Sesiones').filter(x => x.libro_id === b.id).length;
    if (!await confirmDialog(`¿Borrar «${b.titulo}»?`, { detail: `También se borran sus ${n} notas, ${s} sesiones y sus reseñas. No se puede deshacer.` })) return;
    store.remove('Libros', b.id);
    toast('Libro borrado');
    location.hash = '#/biblioteca';
  }

  paintUnits();
  paintCover();
  root.append(h('div', { class: 'view' },
    h('div', { class: 'toolbar' },
      h('a', { class: 'icon-btn', href: editing ? `#/libro/${encodeURIComponent(b.id)}` : '#/biblioteca', 'aria-label': 'Volver', html: icon('atras') }),
      h('h1', {}, editing ? 'Editar libro' : 'Nuevo libro')),
    h('form', { class: 'form', novalidate: true, onsubmit: onSubmit },
      h('div', { class: 'card form' },
        field('Título', f.titulo), field('Autor', f.autor),
        field('ISBN (opcional)', f.isbn, { hint: 'Sirve para completar los datos automáticamente.' }),
        h('div', {}, h('button', { type: 'button', class: 'btn', html: icon('buscar'), onclick: lookup }, 'Buscar datos y portada'), searchStatus)),
      h('div', { class: 'card form' },
        h('div', { class: 'grid-2' }, field('Estado', f.estado), field('Formato', f.formato)),
        field('Género', f.genero),
        h('div', { class: 'grid-2' }, field(totalLabel, f.paginas_total), field(actualLabel, f.pagina_actual)),
        h('div', { class: 'grid-2' }, field('Fecha de inicio', f.fecha_inicio), field('Fecha de término', f.fecha_fin)),
        h('div', { class: 'grid-2' }, field('Prioridad', f.prioridad, { hint: 'Para la lista Por leer.' }),
          h('div', { class: 'field' }, h('span', { class: 'field__label' }, 'Favorito'), h('label', { for: 'f-fav', style: { display: 'flex', alignItems: 'center', gap: '10px', minHeight: '44px' } }, fav, 'Marcar como favorito')))),
      h('div', { class: 'card form' },
        h('div', { style: { display: 'flex', gap: '18px', alignItems: 'flex-start' } }, preview,
          h('div', { style: { flex: 1, display: 'grid', gap: '9px' } }, field('URL de la portada', f.portada_url, { hint: 'Vacío = portada generada con las iniciales.' }),
            h('button', { type: 'button', class: 'btn btn--ghost', onclick: () => { f.portada_url.value = ''; paintCover(); } }, 'Usar portada generada'))),
        h('div', { class: 'grid-2' }, field('Editorial', f.editorial), field('Año', f.anio)),
        field('Etiquetas', f.etiquetas, { hint: 'Separadas por coma.' })),
      h('div', { class: 'btn-row', style: { justifyContent: 'space-between' } },
        editing ? h('button', { type: 'button', class: 'btn btn--danger', html: icon('borrar'), onclick: onDelete }, 'Borrar libro') : h('span'),
        h('div', { class: 'btn-row' },
          h('button', { type: 'button', class: 'btn btn--ghost', onclick: () => history.back() }, 'Cancelar'),
          h('button', { type: 'submit', class: 'btn btn--primary' }, editing ? 'Guardar cambios' : 'Agregar libro'))))));
}
