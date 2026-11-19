// Portada: imagen (lazy) o portada generada con iniciales sobre un degradado de la paleta.
import { h } from '../ui.js';

// Primitivos (no semánticos): la portada generada es clara en ambos temas, igual que una portada impresa.
const [K, M, S, L] = ['var(--keylime)', 'var(--mint)', 'var(--sage)', 'var(--slate)'];
const GRADS = [[K, S], [M, L], [S, L], [K, M], [M, S]];
const hash = s => [...String(s)].reduce((a, c) => (a * 31 + c.charCodeAt(0)) >>> 0, 7);
const initials = t => String(t || '?').split(/\s+/).filter(w => w.length > 2 || /^[A-ZÁÉÍÓÚÑ]/.test(w)).slice(0, 2).map(w => w[0]).join('').toUpperCase() || String(t || '?')[0].toUpperCase();

export function generated(book, cls = '') {
  const [a, b] = GRADS[hash(book.id || book.titulo) % GRADS.length];
  return h('div', { class: `cover cover--gen ${cls}`, style: { background: `linear-gradient(135deg, ${a}, ${b})` }, 'aria-hidden': 'true' }, initials(book.titulo));
}

export function cover(book, cls = '') {
  if (!book.portada_url) return generated(book, cls);
  const wrap = h('div', { class: `cover ${cls}` });
  const img = h('img', { src: book.portada_url, alt: '', loading: 'lazy', decoding: 'async', referrerpolicy: 'no-referrer' });
  img.addEventListener('error', () => wrap.replaceWith(generated(book, cls)), { once: true });
  wrap.append(img);
  return wrap;
}
