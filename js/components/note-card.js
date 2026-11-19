import { h, icon, toast, tags, fmtDate } from '../ui.js';
import { TIPOS_NOTA, label } from '../schema.js';

async function share(nota, libro) {
  const text = `“${nota.texto}” — ${libro ? `${libro.titulo}, ${libro.autor}` : ''}`.trim();
  try {
    if (navigator.share) { await navigator.share({ text }); return; }
    await navigator.clipboard.writeText(text);
    toast('Cita copiada al portapapeles');
  } catch (e) {
    if (e?.name !== 'AbortError') toast('No se pudo compartir');
  }
}

export function noteCard(nota, libro, { showBook = false } = {}) {
  const where = [nota.pagina && `pág. ${nota.pagina}`, nota.capitulo && `cap. ${nota.capitulo}`].filter(Boolean).join(', ');
  const edit = h('a', { class: 'icon-btn', href: `#/nota/${encodeURIComponent(nota.id)}/editar`, 'aria-label': 'Editar nota', html: icon('editar', 'icon--sm') });
  const meta = h('p', { class: 'quote__src' }, [showBook && libro ? libro.titulo : null, where, fmtDate(nota.creado)].filter(Boolean).join(' · '));
  const tagList = tags(nota.etiquetas).length ? h('div', { class: 'chips' }, tags(nota.etiquetas).map(t => h('span', { class: 'pill', style: { minHeight: '24px', fontSize: '12px' } }, t))) : null;

  if (nota.tipo === 'frase') {
    return h('li', { class: 'quote note' },
      h('p', { class: 'quote__text' }, nota.texto),
      meta, tagList,
      h('div', { class: 'btn-row' },
        h('button', { type: 'button', class: 'btn btn--ghost', html: icon('compartir', 'icon--sm'), onclick: () => share(nota, libro) }, 'Compartir'),
        edit));
  }
  return h('li', { class: 'card card--paper note' },
    h('div', { class: 'note__head', html: icon(nota.tipo, 'icon--sm') }, label(TIPOS_NOTA, nota.tipo), h('span', { style: { marginLeft: 'auto' } }, edit)),
    h('p', { class: 'note__text' }, nota.texto),
    meta, tagList);
}
