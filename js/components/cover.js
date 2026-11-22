// Portada: imagen (lazy) o portada generada con iniciales sobre un degradado de la paleta.
import { h } from '../ui.js';

// Primitivos (no semánticos): la portada generada es clara en ambos temas, igual que una portada impresa.
// [inicio, fin, tinta]: tres oscuros (cobalto/violeta) y dos claros para dar ritmo a la biblioteca.
const [C, D, V, Sky, P, Lav, W] = ['var(--electric-cobalt)', 'var(--deep-cobalt)', 'var(--vivid-violet)', 'var(--sky-wash)', 'var(--powder-blue)', 'var(--lavender-mist)', 'var(--pure-white)'];
const GRADS = [[C, V, W], [Sky, Lav, D], [D, C, W], [Lav, P, V], [V, D, W]];
const hash = s => [...String(s)].reduce((a, c) => (a * 31 + c.charCodeAt(0)) >>> 0, 7);
const initials = t => String(t || '?').split(/\s+/).filter(w => w.length > 2 || /^[A-ZÁÉÍÓÚÑ]/.test(w)).slice(0, 2).map(w => w[0]).join('').toUpperCase() || String(t || '?')[0].toUpperCase();

export function generated(book, cls = '') {
  const [a, b, ink] = GRADS[hash(book.id || book.titulo) % GRADS.length];
  return h('div', { class: `cover cover--gen ${cls}`, style: { background: `linear-gradient(150deg, ${a}, ${b})`, color: ink }, 'aria-hidden': 'true' }, initials(book.titulo));
}

export function cover(book, cls = '') {
  if (!book.portada_url) return generated(book, cls);
  const wrap = h('div', { class: `cover ${cls}` });
  const img = h('img', { src: book.portada_url, alt: '', loading: 'lazy', decoding: 'async', referrerpolicy: 'no-referrer' });
  img.addEventListener('error', () => wrap.replaceWith(generated(book, cls)), { once: true });
  wrap.append(img);
  return wrap;
}
