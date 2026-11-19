// Hoja inferior modal sobre <dialog> (foco atrapado y Escape nativos).
import { h, icon } from '../ui.js';

let n = 0;
/**
 * openSheet({ title, content, actions: [{ label, kind: 'primary'|'ghost'|'danger', value, run }] })
 * `content` puede ser un elemento o una función (close) => elemento, para listas donde tocar un ítem cierra la hoja.
 * `run()` puede devolver false para mantener la hoja abierta (validación). Resuelve con el valor o null.
 */
export function openSheet({ title, content = null, actions = [] }) {
  return new Promise(resolve => {
    const id = 'sheet-t-' + ++n;
    const dlg = h('dialog', { class: 'sheet', 'aria-labelledby': id });
    let done = false;
    const close = v => { if (done) return; done = true; dlg.close(); dlg.remove(); resolve(v); };
    const fire = a => { const v = a.run ? a.run() : a.value; if (a.run && v === false) return; close(v); };
    const primary = actions.find(a => a.kind === 'primary');
    const form = h('form', { class: 'sheet__inner', novalidate: true, onsubmit: e => { e.preventDefault(); if (primary) fire(primary); } },
      h('div', { class: 'sheet__head' },
        h('h2', { id, style: { fontSize: 'var(--fs-h3)' } }, title),
        h('button', { type: 'button', class: 'icon-btn', 'aria-label': 'Cerrar', html: icon('cerrar'), onclick: () => close(null) })),
      typeof content === 'function' ? content(close) : content,
      actions.length ? h('div', { class: 'btn-row', style: { justifyContent: 'flex-end' } },
        actions.map(a => h('button', { type: a === primary ? 'submit' : 'button', class: `btn btn--${a.kind || 'ghost'}`, onclick: a === primary ? null : () => fire(a) }, a.label))) : null);
    dlg.append(form);
    dlg.addEventListener('cancel', e => { e.preventDefault(); close(null); });
    dlg.addEventListener('click', e => { if (e.target === dlg) close(null); }); // clic en el fondo
    document.body.append(dlg);
    dlg.showModal();
    (form.querySelector('input, textarea, select') || form.querySelector('.btn'))?.focus();
  });
}

export const confirmDialog = (title, { ok = 'Borrar', danger = true, detail } = {}) =>
  openSheet({
    title,
    content: detail ? h('p', { class: 'muted' }, detail) : null,
    actions: [{ label: 'Cancelar', kind: 'ghost', value: false }, { label: ok, kind: danger ? 'danger' : 'primary', value: true }],
  }).then(Boolean);
