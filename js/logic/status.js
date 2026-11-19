// Reglas de cambio de estado de un libro. Fechas de libro en YYYY-MM-DD local.
const pad = n => String(n).padStart(2, '0');
export const isoDay = (d = new Date()) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

export function applyStatusChange(book, estado, today = new Date()) {
  const b = { ...book, estado };
  const day = isoDay(today);
  if (estado === 'leyendo' || estado === 'leido') b.fecha_inicio ||= day;
  if (estado === 'leido') {
    b.fecha_fin ||= day;
    b.pagina_actual = Number(b.paginas_total) || Number(b.pagina_actual) || 0;
    b.veces_leido = Math.max(1, Number(b.veces_leido) || 0);
  }
  return b;
}

export function releer(book, today = new Date()) {
  return { ...book, estado: 'leyendo', veces_leido: (Number(book.veces_leido) || 1) + 1, pagina_actual: 0, fecha_inicio: isoDay(today), fecha_fin: '' };
}
