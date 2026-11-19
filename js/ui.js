// Utilidades de DOM. Regla: el texto del usuario entra por textContent (h) o por esc(), nunca crudo.
const ESC = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
export const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ESC[c]);

/** h('button', {class:'btn', onclick}, 'Texto', otroNodo). Strings hijos = texto; `html` = HTML de confianza (iconos). */
export function h(tag, attrs = {}, ...children) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs || {})) {
    if (v == null || v === false) continue;
    if (k === 'html') el.innerHTML = v;
    else if (k.startsWith('on')) el.addEventListener(k.slice(2), v);
    else if (k === 'style' && typeof v === 'object') Object.assign(el.style, v);
    else el.setAttribute(k, v === true ? '' : v);
  }
  for (const c of children.flat()) if (c != null && c !== false) el.append(c instanceof Node ? c : String(c));
  return el;
}

export const icon = (name, cls = '') => `<svg class="icon ${cls}" aria-hidden="true" focusable="false"><use href="icons/sprite.svg#${name}"/></svg>`;
export const iconEl = (name, cls) => h('span', { html: icon(name, cls), style: { display: 'contents' } });

export function toast(msg, ms = 2600) {
  const el = h('div', { class: 'toast', role: 'status' }, msg);
  document.body.append(el);
  setTimeout(() => el.remove(), ms);
}

/** Normaliza para búsquedas: sin mayúsculas ni acentos. */
export const norm = s => String(s ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
export const tags = s => String(s ?? '').split(',').map(t => t.trim()).filter(Boolean);
export const fmtDate = d => (d ? new Date(/^\d{4}-\d{2}-\d{2}$/.test(d) ? d + 'T12:00:00' : d).toLocaleDateString('es', { day: 'numeric', month: 'short', year: 'numeric' }) : '');
