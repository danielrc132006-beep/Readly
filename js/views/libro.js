import * as store from '../store.js';
import { h, icon, toast, fmtDate, tags } from '../ui.js';
import { ESTADOS, FORMATOS, TIPOS_NOTA, ANIMOS, RITMOS, label } from '../schema.js';
import { percent, estimateDays } from '../logic/progress.js';
import { applyStatusChange, releer } from '../logic/status.js';
import { cover } from '../components/cover.js';
import { progressRow, yes } from '../components/book-card.js';
import { openProgress, finishBook, unit } from '../components/progress-control.js';
import { openSheet, confirmDialog } from '../components/sheet.js';
import { starsView } from '../components/stars.js';
import { noteCard } from '../components/note-card.js';

export const live = true;
const TIMER = 'readly:timer';
const byDesc = k => (a, b) => String(b[k] || '').localeCompare(String(a[k] || ''));
const readTimer = () => { try { return JSON.parse(sessionStorage.getItem(TIMER)); } catch { return null; } };
const writeTimer = t => { try { t ? sessionStorage.setItem(TIMER, JSON.stringify(t)) : sessionStorage.removeItem(TIMER); } catch { /* sin almacenamiento */ } };
const elapsed = t => (t ? t.acc + (t.start ? Date.now() - t.start : 0) : 0);
const clock = ms => { const s = Math.floor(ms / 1000); return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`; };
let noteFilter = 'todas';

export default function libro(params, root) {
  const book = store.get('Libros', params.id);
  if (!book) {
    root.append(h('div', { class: 'empty' }, h('h2', {}, 'Este libro ya no existe'), h('p', { class: 'muted' }, 'Puede que se haya borrado en otro dispositivo.'), h('a', { class: 'btn', href: '#/biblioteca' }, 'Ir a la biblioteca')));
    return;
  }
  const id = book.id;
  const sesiones = store.all('Sesiones').filter(s => s.libro_id === id).sort(byDesc('fecha'));
  const resenas = store.all('Resenas').filter(r => r.libro_id === id).sort(byDesc('fecha'));
  const notas = store.all('Notas').filter(n => n.libro_id === id).sort(byDesc('creado'));
  const u = unit(book);
  const cleanups = [];

  // ---------- Estado ----------
  async function changeStatus(estado) {
    if (estado === book.estado) return;
    if (estado === 'leido') return finishBook(book);
    if (estado === 'abandonado') {
      const pg = h('input', { class: 'input', type: 'number', inputmode: 'numeric', min: 0, value: Number(book.pagina_actual) || 0, id: 'ab-pg' });
      const why = h('textarea', { class: 'textarea', id: 'ab-why', maxlength: 10000, placeholder: 'Opcional', style: { minHeight: '90px' } });
      const res = await openSheet({
        title: 'Marcar como abandonado',
        content: h('div', { class: 'form' },
          h('div', { class: 'field' }, h('label', { for: 'ab-pg' }, u === 'min' ? 'Minuto donde lo dejaste' : 'Página donde lo dejaste'), pg),
          h('div', { class: 'field' }, h('label', { for: 'ab-why' }, '¿Por qué lo dejas?'), why)),
        actions: [{ label: 'Cancelar', kind: 'ghost', value: null }, { label: 'Marcar abandonado', kind: 'primary', run: () => ({ pg: Number(pg.value) || 0, why: why.value.trim() }) }],
      });
      if (!res) return;
      const total = Number(book.paginas_total) || 0;
      store.save('Libros', { ...applyStatusChange(book, 'abandonado'), pagina_actual: total ? Math.min(res.pg, total) : res.pg });
      if (res.why) store.save('Notas', { libro_id: id, tipo: 'reflexion', texto: res.why, pagina: res.pg || '', capitulo: '', etiquetas: 'abandono' });
      toast('Marcado como abandonado');
      return;
    }
    store.save('Libros', applyStatusChange(book, estado, new Date()));
  }

  const statusGroup = h('div', { class: 'chips', role: 'group', 'aria-label': 'Estado del libro' },
    ESTADOS.map(e => h('button', { type: 'button', class: 'chip', 'aria-pressed': String(book.estado === e.id), html: icon(e.id, 'icon--sm'), onclick: () => changeStatus(e.id) }, e.label)));

  // ---------- Progreso y cronómetro ----------
  const est = book.estado === 'leyendo' ? estimateDays(book, store.all('Sesiones'), new Date()) : null;
  const timerOut = h('span', { class: 'now__pages', style: { fontSize: '2rem' }, 'aria-live': 'off' });
  const timerBtns = h('div', { class: 'btn-row' });
  function paintTimer() {
    const t = readTimer();
    const mine = t && t.bookId === id;
    timerOut.textContent = mine ? clock(elapsed(t)) : '00:00';
    const btn = (lbl, ic, fn, kind = 'ghost') => h('button', { type: 'button', class: `btn btn--${kind}`, html: icon(ic, 'icon--sm'), onclick: fn }, lbl);
    if (t && !mine) {
      const other = store.get('Libros', t.bookId);
      timerBtns.replaceChildren(h('p', { class: 'muted' }, `Hay un cronómetro activo en «${other?.titulo || 'otro libro'}».`));
      return;
    }
    timerBtns.replaceChildren(...[
      !mine ? btn('Iniciar sesión', 'play', () => { writeTimer({ bookId: id, start: Date.now(), acc: 0 }); paintTimer(); })
        : t.start ? btn('Pausar', 'pausa', () => { writeTimer({ ...t, acc: elapsed(t), start: null }); paintTimer(); })
          : btn('Reanudar', 'play', () => { writeTimer({ ...t, start: Date.now() }); paintTimer(); }),
      mine ? btn('Terminar', 'detener', async () => {
        const mins = Math.max(1, Math.round(elapsed(readTimer()) / 60000));
        writeTimer(null);
        paintTimer();
        await openProgress(store.get('Libros', id), { minutos: mins });
      }, 'primary') : null].filter(Boolean));
  }
  const tick = setInterval(() => { const t = readTimer(); if (t?.bookId === id && t.start) timerOut.textContent = clock(elapsed(t)); }, 1000);
  cleanups.push(() => clearInterval(tick));

  const progressSection = book.estado === 'por_leer' ? null : h('section', { class: 'now', 'aria-labelledby': 'h-prog' },
    h('h2', { id: 'h-prog', class: 'eyebrow' }, 'Progreso'),
    h('p', { class: 'now__pages' }, String(Number(book.pagina_actual) || 0), ' ', h('small', {}, Number(book.paginas_total) ? `de ${book.paginas_total} ${u === 'min' ? 'minutos' : 'páginas'}` : u === 'min' ? 'minutos' : 'páginas')),
    Number(book.paginas_total) ? progressRow(book) : null,
    est != null && percent(book) < 100 ? h('p', {}, `A tu ritmo, lo terminas en ${est} ${est === 1 ? 'día' : 'días'}.`) : null,
    book.estado !== 'leido' ? h('div', { class: 'btn-row' }, h('button', { type: 'button', class: 'btn btn--primary', onclick: () => openProgress(book) }, 'Actualizar progreso')) : null,
    book.estado === 'leyendo' ? h('div', { style: { display: 'grid', gap: '9px' } }, h('div', { style: { display: 'flex', alignItems: 'center', gap: '11px' }, html: icon('cronometro') }, timerOut), timerBtns) : null,
    book.estado === 'leido' ? h('div', { class: 'btn-row' }, h('button', { type: 'button', class: 'btn', html: icon('releer', 'icon--sm'), onclick: () => { store.save('Libros', releer(book, new Date())); toast('Nueva lectura iniciada'); } }, 'Releer')) : null);
  if (book.estado === 'leyendo') paintTimer();

  // ---------- Reseñas ----------
  const yn = v => (yes(v) ? 'Sí' : v === '' || v == null ? '' : 'No');
  const rev = r => h('article', { class: 'card card--2', style: { display: 'grid', gap: '11px' } },
    h('div', { class: 'section__head' }, Number(r.calificacion) ? starsView(r.calificacion) : h('span', { class: 'muted' }, 'Sin calificar'),
      h('a', { class: 'icon-btn', href: `#/libro/${encodeURIComponent(id)}/resena?r=${encodeURIComponent(r.id)}`, 'aria-label': 'Editar reseña', html: icon('editar', 'icon--sm') })),
    r.resena ? h('p', { class: 'note__text' }, r.resena) : null,
    r.frase_clave ? h('p', { class: 'quote__text', style: { fontSize: '1.3rem' } }, r.frase_clave) : null,
    h('div', { class: 'chips' },
      ...tags(r.animo).map(a => h('span', { class: 'pill' }, label(ANIMOS, a) || a)),
      r.ritmo ? h('span', { class: 'pill' }, `Ritmo ${label(RITMOS, r.ritmo).toLowerCase()}`) : null),
    h('p', { class: 'muted', style: { fontSize: '13px' } }, [yn(r.recomendaria) && `Lo recomendaría: ${yn(r.recomendaria)}`, yn(r.releeria) && `Lo releería: ${yn(r.releeria)}`, r.fecha && `Terminado el ${fmtDate(r.fecha)}`].filter(Boolean).join(' · ')));
  const reviewsSection = resenas.length ? h('section', { class: 'section', 'aria-labelledby': 'h-rev' },
    h('h2', { id: 'h-rev' }, resenas.length > 1 ? `Reseñas (${resenas.length} lecturas)` : 'Reseña'),
    rev(resenas[0]),
    resenas.length > 1 ? h('details', { class: 'group' }, h('summary', {}, 'Lecturas anteriores'), h('ul', { class: 'list' }, resenas.slice(1).map(r => h('li', {}, rev(r))))) : null) : null;

  // ---------- Sesiones ----------
  async function editSession(s) {
    const pg = h('input', { class: 'input', type: 'number', min: 0, value: s.paginas, id: 'se-pg' });
    const mi = h('input', { class: 'input', type: 'number', min: 0, value: s.minutos, id: 'se-mi' });
    const res = await openSheet({
      title: 'Editar sesión',
      content: h('div', { class: 'grid-2' }, h('div', { class: 'field' }, h('label', { for: 'se-pg' }, u === 'min' ? 'Minutos escuchados' : 'Páginas leídas'), pg), h('div', { class: 'field' }, h('label', { for: 'se-mi' }, 'Minutos'), mi)),
      actions: [{ label: 'Borrar', kind: 'danger', value: 'borrar' }, { label: 'Guardar', kind: 'primary', run: () => ({ paginas: Math.max(0, Number(pg.value) || 0), minutos: mi.value === '' ? '' : Math.max(0, Number(mi.value) || 0) }) }],
    });
    if (res === 'borrar') { if (await confirmDialog('¿Borrar esta sesión?')) store.remove('Sesiones', s.id); return; }
    if (res) store.save('Sesiones', { ...s, ...res });
  }
  const sessionRow = s => h('li', { class: 'card card--paper', style: { display: 'flex', alignItems: 'center', gap: '11px', padding: '9px 9px 9px 18px' } },
    h('span', { style: { flex: 1 } }, h('strong', { style: { fontWeight: 500 } }, fmtDate(s.fecha)), h('br'),
      h('span', { class: 'muted', style: { fontSize: '13px' } }, `${s.paginas} ${u}${s.pagina_hasta ? ` (${s.pagina_desde}–${s.pagina_hasta})` : ''}${s.minutos !== '' && s.minutos != null ? ` · ${s.minutos} min` : ''}`)),
    h('button', { type: 'button', class: 'icon-btn', 'aria-label': `Editar sesión del ${fmtDate(s.fecha)}`, html: icon('editar', 'icon--sm'), onclick: () => editSession(s) }));
  const sessionsSection = sesiones.length ? h('section', { class: 'section', 'aria-labelledby': 'h-ses' },
    h('h2', { id: 'h-ses' }, 'Sesiones'),
    h('ul', { class: 'list' }, sesiones.slice(0, 5).map(sessionRow)),
    sesiones.length > 5 ? h('details', { class: 'group' }, h('summary', {}, `Ver las ${sesiones.length} sesiones`), h('ul', { class: 'list' }, sesiones.slice(5).map(sessionRow))) : null) : null;

  // ---------- Notas ----------
  const notesList = h('ul', { class: 'list' });
  const types = TIPOS_NOTA.filter(t => notas.some(n => n.tipo === t.id));
  if (noteFilter !== 'todas' && !types.some(t => t.id === noteFilter)) noteFilter = 'todas';
  const paintNotes = () => notesList.replaceChildren(...notas.filter(n => noteFilter === 'todas' || n.tipo === noteFilter).map(n => noteCard(n, book)));
  const filters = h('div', { class: 'chips chips--scroll', role: 'group', 'aria-label': 'Filtrar notas por tipo' },
    [{ id: 'todas', label: 'Todas' }, ...types].map(t => h('button', { type: 'button', class: 'chip', 'aria-pressed': String(noteFilter === t.id), onclick: e => {
      noteFilter = t.id; filters.querySelectorAll('.chip').forEach(c => c.setAttribute('aria-pressed', String(c === e.currentTarget))); paintNotes();
    } }, t.label, ' ', h('span', { class: 'chip__count' }, t.id === 'todas' ? notas.length : notas.filter(n => n.tipo === t.id).length))));
  paintNotes();
  const notesSection = h('section', { class: 'section', 'aria-labelledby': 'h-notas' },
    h('div', { class: 'section__head' }, h('h2', { id: 'h-notas' }, 'Notas'), h('a', { class: 'btn btn--ghost', href: `#/libro/${encodeURIComponent(id)}/nota/nueva`, html: icon('agregar', 'icon--sm') }, 'Nota')),
    notas.length ? filters : h('p', { class: 'muted' }, 'Aún no hay notas. Guarda conceptos, citas o ideas mientras lees.'),
    notesList);

  // ---------- Cabecera ----------
  const favBtn = h('button', { type: 'button', class: 'icon-btn', 'aria-pressed': String(yes(book.favorito)), 'aria-label': 'Favorito', html: icon(yes(book.favorito) ? 'favorito-lleno' : 'favorito'), onclick: () => store.save('Libros', { ...book, favorito: !yes(book.favorito) }) });
  const meta = [book.genero, label(FORMATOS, book.formato), [book.editorial, book.anio].filter(Boolean).join(', '), book.isbn && `ISBN ${book.isbn}`, Number(book.veces_leido) > 1 && `Leído ${book.veces_leido} veces`].filter(Boolean);

  root.append(h('div', { class: 'view' },
    h('div', { class: 'toolbar' },
      h('a', { class: 'icon-btn', href: '#/biblioteca', 'aria-label': 'Volver a la biblioteca', html: icon('atras') }),
      h('span', { style: { flex: 1 } }),
      favBtn,
      h('a', { class: 'icon-btn', href: `#/libro/${encodeURIComponent(id)}/editar`, 'aria-label': 'Editar libro', html: icon('editar') })),
    h('div', { style: { display: 'grid', gridTemplateColumns: '112px 1fr', gap: '18px', alignItems: 'end' } },
      cover(book),
      h('div', { style: { display: 'grid', gap: '7px', minWidth: 0 } },
        h('h1', { style: { overflowWrap: 'anywhere' } }, book.titulo),
        h('p', { style: { fontSize: '1.05rem' } }, book.autor))),
    meta.length ? h('p', { class: 'muted' }, meta.join(' · ')) : null,
    tags(book.etiquetas).length ? h('div', { class: 'chips' }, tags(book.etiquetas).map(t => h('span', { class: 'pill', style: { background: 'var(--surface-1)' }, html: icon('etiqueta', 'icon--sm') }, t))) : null,
    statusGroup,
    progressSection,
    reviewsSection,
    notesSection,
    sessionsSection));
  return () => cleanups.forEach(fn => fn());
}
