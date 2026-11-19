import * as store from '../store.js';
import { h, icon, toast } from '../ui.js';
import { TIPOS_NOTA } from '../schema.js';
import { confirmDialog } from '../components/sheet.js';
import { field, setError } from './libro-form.js';

export default function notaForm(params, root) {
  const editing = params.path.startsWith('/nota/') ? store.get('Notas', params.id) : null;
  const libroId = editing ? editing.libro_id : params.id;
  const book = store.get('Libros', libroId);
  if (!book || (params.path.startsWith('/nota/') && !editing)) {
    root.append(h('div', { class: 'empty' }, h('h2', {}, 'No encontramos esta nota'), h('a', { class: 'btn', href: '#/notas' }, 'Ir a Mis notas')));
    return;
  }
  const n = editing || { libro_id: libroId, tipo: '' };
  const back = `#/libro/${encodeURIComponent(libroId)}`;

  let tipo = n.tipo;
  const tipoErr = h('p', { class: 'field__error', role: 'alert', id: 'nt-tipo-err' });
  const tipoGroup = h('div', { class: 'chips', role: 'radiogroup', 'aria-labelledby': 'nt-tipo-l', 'aria-describedby': 'nt-tipo-err' });
  TIPOS_NOTA.forEach(t => tipoGroup.append(h('button', { type: 'button', role: 'radio', class: 'chip', 'aria-checked': String(tipo === t.id), html: icon(t.id, 'icon--sm'), onclick: e => {
    tipo = t.id; tipoErr.textContent = '';
    tipoGroup.querySelectorAll('.chip').forEach(c => c.setAttribute('aria-checked', String(c === e.currentTarget)));
  } }, t.label)));

  const texto = h('textarea', { class: 'textarea', id: 'nt-txt', maxlength: 10000, style: { minHeight: '160px' } });
  texto.value = n.texto || '';
  const pagina = h('input', { class: 'input', id: 'nt-pg', type: 'number', inputmode: 'numeric', min: 0, value: n.pagina || '' });
  const capitulo = h('input', { class: 'input', id: 'nt-cap', value: n.capitulo || '' });
  const etiquetas = h('input', { class: 'input', id: 'nt-tags', value: n.etiquetas || '' });

  function onSubmit(e) {
    e.preventDefault();
    if (!tipo) { tipoErr.textContent = 'Elige un tipo de nota.'; tipoGroup.querySelector('.chip').focus(); return; }
    if (!texto.value.trim()) { setError(texto, 'Escribe el texto de la nota.'); texto.focus(); return; }
    store.save('Notas', { ...n, tipo, texto: texto.value.trim(), pagina: pagina.value, capitulo: capitulo.value.trim(), etiquetas: etiquetas.value.trim() });
    toast(editing ? 'Nota guardada' : 'Nota agregada');
    location.hash = back;
  }
  async function onDelete() {
    if (!await confirmDialog('¿Borrar esta nota?', { detail: 'No se puede deshacer.' })) return;
    store.remove('Notas', n.id);
    toast('Nota borrada');
    location.hash = back;
  }

  root.append(h('div', { class: 'view' },
    h('div', { class: 'toolbar' },
      h('a', { class: 'icon-btn', href: back, 'aria-label': 'Volver al libro', html: icon('atras') }),
      h('div', {}, h('h1', {}, editing ? 'Editar nota' : 'Nueva nota'), h('p', { class: 'muted' }, book.titulo))),
    h('form', { class: 'form', novalidate: true, onsubmit: onSubmit },
      h('div', { class: 'card form' },
        h('div', { class: 'field' }, h('span', { class: 'field__label', id: 'nt-tipo-l' }, 'Tipo'), tipoGroup, tipoErr),
        field('Texto', texto)),
      h('div', { class: 'card card--paper form' },
        h('div', { class: 'grid-2' }, field('Página', pagina), field('Capítulo', capitulo)),
        field('Etiquetas', etiquetas, { hint: 'Separadas por coma.' })),
      h('div', { class: 'btn-row', style: { justifyContent: 'space-between' } },
        editing ? h('button', { type: 'button', class: 'btn btn--danger', html: icon('borrar', 'icon--sm'), onclick: onDelete }, 'Borrar') : h('span'),
        h('div', { class: 'btn-row' },
          h('a', { class: 'btn btn--ghost', href: back }, 'Cancelar'),
          h('button', { type: 'submit', class: 'btn btn--primary' }, 'Guardar nota'))))));
  if (!editing) tipoGroup.querySelector('.chip').focus();
}
