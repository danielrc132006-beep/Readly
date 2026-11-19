// Gráficas SVG hechas a mano. Colores desde variables CSS; cada barra lleva <title>.
const NS = 'http://www.w3.org/2000/svg';
const s = (tag, attrs = {}, text) => {
  const el = document.createElementNS(NS, tag);
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v);
  if (text != null) el.textContent = text;
  return el;
};

export function ring(value, max, label) {
  const r = 52, c = 2 * Math.PI * r, p = max ? Math.min(1, value / max) : 0;
  const svg = s('svg', { viewBox: '0 0 128 128', width: 128, height: 128, role: 'img', 'aria-label': label });
  svg.append(
    s('circle', { cx: 64, cy: 64, r, fill: 'none', stroke: 'var(--rail)', 'stroke-width': 10 }),
    s('circle', { cx: 64, cy: 64, r, fill: 'none', stroke: 'var(--accent)', 'stroke-width': 10, 'stroke-linecap': 'round', 'stroke-dasharray': `${c * p} ${c}`, transform: 'rotate(-90 64 64)' }),
    s('text', { x: 64, y: 62, 'text-anchor': 'middle', class: 'chart__big' }, String(value)),
    s('text', { x: 64, y: 84, 'text-anchor': 'middle', class: 'chart__small' }, `de ${max}`));
  return svg;
}

export function bars(values, labels, { unit = '', label = '' } = {}) {
  const W = 336, H = 160, pad = 18, bw = (W - 8) / values.length;
  const max = Math.max(1, ...values);
  const svg = s('svg', { class: 'chart', viewBox: `0 0 ${W} ${H + pad}`, role: 'img', 'aria-label': `${label}: ${values.map((v, i) => `${labels[i]} ${v}`).join(', ')}` });
  values.forEach((v, i) => {
    const bh = Math.max(v ? 3 : 0, (v / max) * (H - 18));
    const g = s('g');
    g.append(s('title', {}, `${labels[i]}: ${v} ${unit}`.trim()),
      s('rect', { x: i * bw + 4, y: H - bh, width: bw - 8, height: bh, rx: 4, fill: v ? 'var(--accent)' : 'none' }),
      s('rect', { x: i * bw + 4, y: H - 2, width: bw - 8, height: 2, rx: 1, fill: 'var(--line)' }));
    if (v) g.append(s('text', { x: i * bw + bw / 2, y: H - bh - 5, 'text-anchor': 'middle' }, String(v)));
    g.append(s('text', { x: i * bw + bw / 2, y: H + 14, 'text-anchor': 'middle' }, labels[i]));
    svg.append(g);
  });
  return svg;
}

export function hbars(items, { label = '' } = {}) {
  const row = 30, W = 336, labelW = 132;
  const max = Math.max(1, ...items.map(i => i.value));
  const svg = s('svg', { class: 'chart', viewBox: `0 0 ${W} ${items.length * row}`, role: 'img', 'aria-label': `${label}: ${items.map(i => `${i.label} ${i.value}`).join(', ')}` });
  items.forEach((it, i) => {
    const y = i * row, w = ((W - labelW - 30) * it.value) / max;
    svg.append(
      s('text', { x: 0, y: y + 19, class: 'chart__label' }, it.label.length > 18 ? it.label.slice(0, 17) + '…' : it.label),
      s('rect', { x: labelW, y: y + 7, width: Math.max(3, w), height: 16, rx: 4, fill: 'var(--surface-3)' }),
      s('text', { x: labelW + Math.max(3, w) + 6, y: y + 19 }, String(it.value)));
  });
  return svg;
}
