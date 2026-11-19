// Progreso de lectura. Los números llegan como texto desde Sheets: siempre Number(x) || 0.
const num = x => Number(x) || 0;
const DAY = 864e5;

export function percent(book) {
  const total = num(book.paginas_total);
  if (total <= 0) return 0;
  return Math.round(Math.min(100, Math.max(0, num(book.pagina_actual) / total * 100)));
}

export function sessionFromProgress(book, newPage, { minutos = '', fecha = new Date().toISOString() } = {}) {
  const desde = num(book.pagina_actual);
  const total = num(book.paginas_total);
  const hasta = total > 0 ? Math.min(num(newPage), total) : num(newPage);
  if (hasta <= desde) return null;
  return { libro_id: book.id, fecha, pagina_desde: desde, pagina_hasta: hasta, paginas: hasta - desde, minutos };
}

/** Páginas por día en los últimos 30 días (todos los libros si bookId es null). */
export function pace(sessions, bookId, today = new Date()) {
  const from = today.getTime() - 30 * DAY;
  const pages = sessions
    .filter(s => (bookId == null || s.libro_id === bookId) && new Date(s.fecha).getTime() > from)
    .reduce((sum, s) => sum + num(s.paginas), 0);
  return Math.round(pages / 30 * 10) / 10;
}

export function estimateDays(book, sessions, today = new Date()) {
  const p = pace(sessions, book.id, today);
  if (p <= 0) return null;
  return Math.ceil(Math.max(0, num(book.paginas_total) - num(book.pagina_actual)) / p);
}
