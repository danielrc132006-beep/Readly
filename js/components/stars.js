// Estrellas con medias. Entrada accesible como slider (flechas ±0,5; Inicio/Fin).
import { h, icon } from '../ui.js';

const glyph = (value, i) => (value >= i ? 'estrella' : value >= i - 0.5 ? 'estrella-media' : 'estrella-vacia');
const fmt = v => String(v).replace('.', ',');

export function starsView(value) {
  const v = Number(value) || 0;
  return h('span', { class: 'stars', role: 'img', 'aria-label': `${fmt(v)} de 5 estrellas`, html: [1, 2, 3, 4, 5].map(i => icon(glyph(v, i))).join('') });
}

export function starsInput(value, onChange) {
  let v = Number(value) || 0;
  const el = h('div', { class: 'stars-input', role: 'slider', tabindex: 0, 'aria-label': 'Calificación', 'aria-valuemin': 0, 'aria-valuemax': 5 });
  const paint = () => {
    el.setAttribute('aria-valuenow', v);
    el.setAttribute('aria-valuetext', v ? `${fmt(v)} estrellas` : 'Sin calificar');
    el.querySelectorAll('button').forEach((b, i) => { b.innerHTML = icon(glyph(v, i + 1)); });
  };
  const set = n => { v = Math.min(5, Math.max(0, Math.round(n * 2) / 2)); paint(); onChange(v); };
  for (let i = 1; i <= 5; i++) {
    el.append(h('button', { type: 'button', tabindex: -1, 'aria-hidden': 'true', onclick: e => {
      const r = e.currentTarget.getBoundingClientRect();
      const half = e.clientX && e.clientX - r.left < r.width / 2;
      set(v === (half ? i - 0.5 : i) ? 0 : half ? i - 0.5 : i); // tocar el mismo valor lo borra
    } }));
  }
  el.addEventListener('keydown', e => {
    const map = { ArrowRight: v + 0.5, ArrowUp: v + 0.5, ArrowLeft: v - 0.5, ArrowDown: v - 0.5, Home: 0, End: 5 };
    if (e.key in map) { e.preventDefault(); set(map[e.key]); }
  });
  paint();
  return el;
}
