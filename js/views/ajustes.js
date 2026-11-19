import * as store from '../store.js';
import * as api from '../api.js';
import { h, icon, toast, fmtDate } from '../ui.js';
import { HEADERS, TABLES, SHEET_NAMES, now } from '../schema.js';
import { toCSV, exportJSON, importJSON } from '../logic/backup.js';
import { confirmDialog, openSheet } from '../components/sheet.js';
import { field } from './libro-form.js';
import { askGoal } from './inicio.js';

function download(name, text, type) {
  const url = URL.createObjectURL(new Blob([text], { type }));
  const a = h('a', { href: url, download: name });
  document.body.append(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
const stamp = () => new Date().toISOString().slice(0, 10);

export default function ajustes(_, root) {
  const cfg = store.settings();
  const card = (title, ...kids) => h('section', { class: 'card form' }, h('h2', { style: { fontSize: 'var(--fs-h3)' } }, title), ...kids);

  // ---------- Conexión ----------
  const url = h('input', { class: 'input', type: 'url', inputmode: 'url', value: cfg.url || '', placeholder: 'https://script.google.com/macros/s/…/exec', autocomplete: 'off' });
  const token = h('input', { class: 'input', type: 'password', value: cfg.token || '', autocomplete: 'off', spellcheck: 'false' });
  const showBtn = h('button', { type: 'button', class: 'btn btn--ghost', 'aria-pressed': 'false', onclick: () => {
    const show = token.type === 'password'; token.type = show ? 'text' : 'password'; showBtn.textContent = show ? 'Ocultar' : 'Mostrar'; showBtn.setAttribute('aria-pressed', String(show));
  } }, 'Mostrar');
  const connMsg = h('p', { class: 'field__hint', role: 'status' });
  async function test() {
    if (!url.value.trim() || !token.value) { connMsg.textContent = 'Escribe la URL y el token.'; return; }
    connMsg.textContent = 'Probando…';
    try {
      const n = await api.testConnection(url.value.trim(), token.value);
      connMsg.textContent = `Conexión correcta. La hoja tiene ${n} ${n === 1 ? 'libro' : 'libros'}.`;
    } catch (e) { connMsg.textContent = e.message; }
  }
  async function saveConn() {
    const u = url.value.trim();
    if (u && !/^https:\/\/script\.google(usercontent)?\.com\//.test(u)) { connMsg.textContent = 'La URL debe ser la de Apps Script (https://script.google.com/…/exec).'; return; }
    store.setSettings({ url: u, token: token.value });
    connMsg.textContent = 'Guardado. Sincronizando…';
    const r = await api.sync();
    connMsg.textContent = r.ok ? 'Guardado y sincronizado.' : `Guardado. No se pudo sincronizar: ${r.error}`;
  }

  // ---------- Sincronización ----------
  const syncInfo = h('p', { class: 'muted' });
  const paintSync = () => {
    const last = store.lastSync();
    const q = store.queue().length;
    syncInfo.textContent = `${last ? `Última sincronización: ${fmtDate(last)}, ${new Date(last).toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' })}.` : 'Aún no se ha sincronizado.'} ${q ? `${q} ${q === 1 ? 'cambio pendiente' : 'cambios pendientes'}.` : 'Sin cambios pendientes.'}${api.status() === 'error' ? ` Último error: ${api.lastError()}` : ''}`;
  };
  paintSync();
  const unsub = store.subscribe(paintSync);

  // ---------- Tema ----------
  const tema = cfg.tema || 'auto';
  const temaGroup = h('div', { class: 'segmented', role: 'radiogroup', 'aria-label': 'Tema' },
    [['auto', 'Automático'], ['claro', 'Claro'], ['oscuro', 'Oscuro']].map(([v, l]) => h('button', { type: 'button', role: 'radio', class: 'chip', 'aria-checked': String(tema === v), onclick: e => {
      store.setSettings({ tema: v });
      document.documentElement.dataset.theme = v === 'oscuro' ? 'dark' : v === 'claro' ? 'light' : 'auto';
      temaGroup.querySelectorAll('.chip').forEach(c => c.setAttribute('aria-checked', String(c === e.currentTarget)));
    } }, l)));

  // ---------- Categorías ----------
  const catList = h('ul', { class: 'list' });
  const sorted = () => [...store.all('Categorias')].sort((a, b) => (Number(a.orden) || 0) - (Number(b.orden) || 0));
  function move(c, d) {
    const cs = sorted(); const i = cs.indexOf(c); const j = i + d;
    if (j < 0 || j >= cs.length) return;
    [cs[i], cs[j]] = [cs[j], cs[i]];
    cs.forEach((x, k) => { if (Number(x.orden) !== k + 1) store.save('Categorias', { ...x, orden: k + 1 }); });
    paintCats();
  }
  async function rename(c) {
    const inp = h('input', { class: 'input', value: c.nombre, id: 'cat-name' });
    const name = await openSheet({ title: 'Renombrar categoría', content: field('Nombre', inp), actions: [{ label: 'Cancelar', kind: 'ghost', value: null }, { label: 'Guardar', kind: 'primary', run: () => inp.value.trim() || false }] });
    if (!name || name === c.nombre) return;
    store.all('Libros').filter(b => b.genero === c.nombre).forEach(b => store.save('Libros', { ...b, genero: name }));
    store.save('Categorias', { ...c, nombre: name });
    paintCats();
  }
  async function del(c) {
    const used = store.all('Libros').filter(b => b.genero === c.nombre);
    if (!await confirmDialog(`¿Borrar «${c.nombre}»?`, { detail: used.length ? `${used.length} ${used.length === 1 ? 'libro pasa' : 'libros pasan'} a «Otro».` : undefined })) return;
    used.forEach(b => store.save('Libros', { ...b, genero: 'Otro' }));
    store.remove('Categorias', c.id);
    paintCats();
  }
  function paintCats() {
    const cs = sorted();
    catList.replaceChildren(...cs.map((c, i) => h('li', { style: { display: 'flex', alignItems: 'center', gap: '4px', borderBottom: '1px solid var(--line)' } },
      h('span', { style: { flex: 1, overflowWrap: 'anywhere' } }, c.nombre),
      h('button', { type: 'button', class: 'icon-btn', 'aria-label': `Subir ${c.nombre}`, disabled: i === 0, html: icon('atras', 'icon--sm'), style: { transform: 'rotate(90deg)' }, onclick: () => move(c, -1) }),
      h('button', { type: 'button', class: 'icon-btn', 'aria-label': `Bajar ${c.nombre}`, disabled: i === cs.length - 1, html: icon('atras', 'icon--sm'), style: { transform: 'rotate(-90deg)' }, onclick: () => move(c, 1) }),
      h('button', { type: 'button', class: 'icon-btn', 'aria-label': `Renombrar ${c.nombre}`, html: icon('editar', 'icon--sm'), onclick: () => rename(c) }),
      h('button', { type: 'button', class: 'icon-btn', 'aria-label': `Borrar ${c.nombre}`, html: icon('borrar', 'icon--sm'), onclick: () => del(c) }))));
  }
  paintCats();
  const newCat = h('input', { class: 'input', placeholder: 'Nueva categoría', 'aria-label': 'Nueva categoría' });
  const addCat = e => {
    e.preventDefault();
    const name = newCat.value.trim();
    if (!name) return;
    if (store.all('Categorias').some(c => c.nombre.toLowerCase() === name.toLowerCase())) { toast('Esa categoría ya existe'); return; }
    store.save('Categorias', { nombre: name, orden: sorted().length + 1 });
    newCat.value = '';
    paintCats();
  };

  // ---------- Respaldo ----------
  const file = h('input', { type: 'file', accept: 'application/json,.json', class: 'sr-only', id: 'imp-file', onchange: async () => {
    const f = file.files[0]; file.value = '';
    if (!f) return;
    let result;
    try { result = importJSON(await f.text(), store.snapshot(), now()); } catch (e) { toast(e.message); return; }
    if (!result.ops.length) { toast('El archivo no tiene datos'); return; }
    if (!await confirmDialog(`¿Importar ${result.ops.length} registros?`, { ok: 'Importar', danger: false, detail: 'Se agregan o actualizan; no se borra nada. Después se suben a Google Sheets.' })) return;
    store.applyImport(result);
    toast(`${result.ops.length} registros importados`);
  } });

  root.append(h('div', { class: 'view' },
    h('h1', {}, 'Ajustes'),
    card('Google Sheets',
      h('p', { class: 'muted' }, 'Pega la URL /exec de tu Apps Script y el token que guardaste en sus propiedades. Se guardan solo en este dispositivo.'),
      field('URL de Apps Script', url),
      h('div', { class: 'field' }, h('label', { for: 'f-token' }, 'Token'), h('div', { class: 'toolbar' }, Object.assign(token, { id: 'f-token' }), showBtn)),
      h('div', { class: 'btn-row' }, h('button', { type: 'button', class: 'btn btn--ghost', onclick: test }, 'Probar conexión'), h('button', { type: 'button', class: 'btn btn--primary', onclick: saveConn }, 'Guardar')),
      connMsg),
    card('Sincronización', syncInfo,
      h('div', {}, h('button', { type: 'button', class: 'btn', html: icon('sincronizar', 'icon--sm'), onclick: async () => { const r = await api.sync(); toast(r.ok ? 'Sincronizado' : r.error); paintSync(); } }, 'Forzar sincronización'))),
    card('Meta anual', h('div', {}, h('button', { type: 'button', class: 'btn', html: icon('meta', 'icon--sm'), onclick: () => askGoal(new Date().getFullYear()) }, `Meta de ${new Date().getFullYear()}`))),
    card('Tema', temaGroup),
    card('Categorías', catList, h('form', { class: 'toolbar', onsubmit: addCat }, newCat, h('button', { type: 'submit', class: 'btn', html: icon('agregar', 'icon--sm') }, 'Agregar'))),
    card('Respaldo',
      h('p', { class: 'muted' }, 'Además de Google Sheets, puedes guardar una copia en un archivo.'),
      h('div', { class: 'btn-row' },
        h('button', { type: 'button', class: 'btn', html: icon('exportar', 'icon--sm'), onclick: () => download(`readly-${stamp()}.json`, exportJSON(store.snapshot()), 'application/json') }, 'Exportar JSON'),
        h('button', { type: 'button', class: 'btn btn--ghost', html: icon('exportar', 'icon--sm'), onclick: () => TABLES.forEach((t, i) => setTimeout(() => download(`readly-${SHEET_NAMES[t].toLowerCase()}-${stamp()}.csv`, toCSV(store.all(t), HEADERS[t]), 'text/csv'), i * 250)) }, 'Exportar CSV'),
        h('label', { class: 'btn btn--ghost', for: 'imp-file', html: icon('importar', 'icon--sm'), tabindex: 0, onkeydown: e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); file.click(); } } }, 'Importar JSON'), file),
      h('p', { class: 'field__hint' }, 'El JSON se puede volver a importar. Los CSV son para abrir en una hoja de cálculo.'))));
  return unsub;
}
