// Sincronización local-first: cola compactada + fusión por fila (gana el `actualizado` más reciente).
export const keyOf = sheet => (sheet === 'Config' ? 'clave' : 'id');

/** Devuelve una cola nueva con `op` agregada y compactada por (sheet, id). */
export function enqueue(queue, op) {
  const same = o => o.sheet === op.sheet && o.id === op.id;
  const prev = queue.find(same);
  const rest = queue.filter(o => !same(o));
  if (!prev) return [...queue, op];
  // Un create ya enviado (sent) existe en la hoja: el delete debe viajar igual.
  if (op.op === 'delete') return prev.op === 'create' && !prev.sent ? rest : [...rest, op];
  if (op.op === 'update' && prev.op !== 'delete') return [...rest, { ...prev, data: { ...prev.data, ...op.data } }];
  return [...rest, op];
}

export function mergeTable(sheet, local, remote, queue) {
  const key = keyOf(sheet);
  const pending = new Map(queue.filter(o => o.sheet === sheet).map(o => [o.id, o.op]));
  const localBy = new Map(local.map(r => [r[key], r]));
  const out = [];
  for (const r of remote) {
    const k = r[key];
    if (pending.has(k)) continue;
    const l = localBy.get(k);
    out.push(l && String(l.actualizado || '') > String(r.actualizado || '') ? l : r);
  }
  for (const [k, op] of pending) if (op !== 'delete' && localBy.has(k)) out.push(localBy.get(k));
  return out;
}
