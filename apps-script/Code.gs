/**
 * Readly — backend en Google Apps Script.
 * Se pega a mano en Extensiones → Apps Script de la hoja. NO contiene el token:
 * el token vive en Configuración del proyecto → Propiedades de la secuencia de comandos → READLY_TOKEN.
 *
 * Todas las lecturas y escrituras van por POST (Content-Type: text/plain) con { token, action, ... }.
 * Acciones: getAll | create | update | delete | batch
 */

// Copia de js/schema.js (HEADERS). Si cambias una, cambia la otra.
var HEADERS = {
  Libros: ['id', 'titulo', 'autor', 'genero', 'estado', 'formato', 'paginas_total', 'pagina_actual', 'portada_url', 'isbn', 'editorial', 'anio', 'fecha_inicio', 'fecha_fin', 'etiquetas', 'favorito', 'prioridad', 'calificacion', 'veces_leido', 'creado', 'actualizado'],
  Sesiones: ['id', 'libro_id', 'fecha', 'pagina_desde', 'pagina_hasta', 'paginas', 'minutos', 'creado', 'actualizado'],
  Notas: ['id', 'libro_id', 'tipo', 'texto', 'pagina', 'capitulo', 'etiquetas', 'creado', 'actualizado'],
  Resenas: ['id', 'libro_id', 'calificacion', 'resena', 'recomendaria', 'releeria', 'animo', 'ritmo', 'frase_clave', 'fecha', 'creado', 'actualizado'],
  Categorias: ['id', 'nombre', 'orden', 'actualizado'],
  Config: ['clave', 'valor', 'actualizado']
};
var SHEET_NAMES = { Libros: 'Libros', Sesiones: 'Sesiones', Notas: 'Notas', Resenas: 'Reseñas', Categorias: 'Categorias', Config: 'Config' };
var ENUMS = {
  estado: ['por_leer', 'leyendo', 'leido', 'abandonado'],
  formato: ['', 'fisico', 'ebook', 'audiolibro'],
  prioridad: ['', 'alta', 'media', 'baja'],
  tipo: ['concepto', 'sistema', 'reflexion', 'frase', 'accionable', 'pregunta', 'dato', 'resumen'],
  ritmo: ['', 'lento', 'medio', 'rapido']
};
var NUMERIC = ['paginas_total', 'pagina_actual', 'anio', 'veces_leido', 'pagina_desde', 'pagina_hasta', 'paginas', 'minutos', 'orden'];
var MAX_TEXT = 10000;
var CATEGORIAS = ['Novela', 'Ficción literaria', 'Ciencia ficción', 'Fantasía', 'Misterio y thriller', 'Romance', 'Histórica', 'Clásicos', 'Poesía', 'Biografía y memorias', 'Historia', 'Ciencia', 'Filosofía', 'Psicología', 'Desarrollo personal', 'Negocios y finanzas', 'Productividad', 'Espiritualidad', 'Ensayo', 'Divulgación', 'Arte y diseño', 'Tecnología', 'Otro'];

function keyOf_(table) { return table === 'Config' ? 'clave' : 'id'; }
function json_(obj) { return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON); }

/** Solo confirma que la URL es de Readly. No devuelve datos. */
function doGet() { return json_({ ok: true, app: 'readly' }); }

function doPost(e) {
  try {
    var body;
    try { body = JSON.parse(e && e.postData ? e.postData.contents : ''); } catch (err) { throw new Error('Petición no válida: el cuerpo no es JSON'); }
    checkToken_(body.token);
    switch (body.action) {
      case 'getAll': return json_({ ok: true, data: getAll_() });
      case 'create': case 'update': return json_({ ok: true, data: applyOps_([{ op: body.action, sheet: body.sheet, id: body.data && body.data[keyOf_(body.sheet)], data: body.data }]) });
      case 'delete': return json_({ ok: true, data: applyOps_([{ op: 'delete', sheet: body.sheet, id: body.id }]) });
      case 'batch': return json_({ ok: true, data: applyOps_(body.ops) });
      default: throw new Error('Acción desconocida: ' + body.action);
    }
  } catch (err) {
    return json_({ ok: false, error: err.message });
  }
}

function checkToken_(token) {
  var expected = PropertiesService.getScriptProperties().getProperty('READLY_TOKEN');
  if (!expected) throw new Error('Falta READLY_TOKEN en las propiedades del script');
  if (typeof token !== 'string' || token !== expected) throw new Error('Token incorrecto');
}

function sheet_(table) {
  if (!HEADERS.hasOwnProperty(table)) throw new Error('Hoja no permitida: ' + table);
  var sh = SpreadsheetApp.getActive().getSheetByName(SHEET_NAMES[table]);
  if (!sh) throw new Error('No existe la pestaña "' + SHEET_NAMES[table] + '". Ejecuta setup() una vez.');
  return sh;
}

function readTable_(table) {
  var sh = sheet_(table), headers = HEADERS[table], last = sh.getLastRow();
  if (last < 2) return [];
  return sh.getRange(2, 1, last - 1, headers.length).getDisplayValues()
    .filter(function (r) { return r[0] !== ''; })
    .map(function (r) { var o = {}; headers.forEach(function (h, i) { o[h] = r[i]; }); return o; });
}

function getAll_() {
  var out = {};
  Object.keys(HEADERS).forEach(function (t) { out[t] = readTable_(t); });
  return out;
}

/** Convierte y valida una fila. Lanza Error con mensaje claro si algo no cuadra. */
function clean_(table, row) {
  var out = {};
  HEADERS[table].forEach(function (h) {
    if (!row.hasOwnProperty(h)) return;
    var v = row[h];
    if (v === null || v === undefined) v = '';
    if (typeof v === 'boolean') v = v ? 'true' : 'false';
    v = String(v);
    if (v.length > MAX_TEXT) throw new Error('El campo "' + h + '" supera ' + MAX_TEXT + ' caracteres');
    if (ENUMS[h] && ENUMS[h].indexOf(v) < 0) throw new Error('Valor no permitido en "' + h + '": ' + v);
    if (NUMERIC.indexOf(h) >= 0 && v !== '' && !(Number(v) >= 0)) throw new Error('"' + h + '" debe ser un número mayor o igual a 0');
    if (h === 'calificacion' && v !== '' && v !== '0') {
      var n = Number(v);
      if (!(n >= 0.5 && n <= 5 && n * 2 === Math.round(n * 2))) throw new Error('La calificación debe ir de 0.5 a 5 en pasos de 0.5');
    }
    out[h] = v;
  });
  return out;
}

function required_(table, row) {
  var key = keyOf_(table);
  if (!row[key]) throw new Error('Falta "' + key + '" en ' + table);
  if (table === 'Libros' && (!row.titulo || !row.autor)) throw new Error('El libro necesita título y autor');
  if (table === 'Libros' && !row.estado) throw new Error('El libro necesita estado');
  if (table === 'Notas' && (!row.tipo || !row.texto)) throw new Error('La nota necesita tipo y texto');
  if (table === 'Categorias' && !row.nombre) throw new Error('La categoría necesita nombre');
}

/** Evita que Sheets interprete un texto como fórmula. */
function safe_(v) { return /^[=+\-@]/.test(v) ? "'" + v : v; }

function applyOps_(ops) {
  if (!Array.isArray(ops)) throw new Error('"ops" debe ser una lista');
  var lock = LockService.getScriptLock();
  if (!lock.tryLock(20000)) throw new Error('La hoja está ocupada, intenta de nuevo en unos segundos');
  try {
    var tables = {}, applied = 0, skipped = 0;
    ops.forEach(function (op) {
      if (!op || ['create', 'update', 'delete'].indexOf(op.op) < 0) throw new Error('Operación no válida');
      var t = op.sheet, key = keyOf_(t);
      sheet_(t);
      if (!tables[t]) tables[t] = readTable_(t);
      var rows = tables[t], id = String(op.id || (op.data && op.data[key]) || '');
      if (!id) throw new Error('Operación sin id en ' + t);
      var idx = -1;
      for (var i = 0; i < rows.length; i++) if (rows[i][key] === id) { idx = i; break; }

      if (op.op === 'delete') {
        if (idx >= 0) rows.splice(idx, 1);
        applied++;
        return;
      }
      var incoming = clean_(t, op.data || {});
      incoming[key] = id;
      if (idx >= 0) {
        // Gana el cambio más reciente: si la hoja tiene algo más nuevo, se ignora.
        if (String(rows[idx].actualizado || '') > String(incoming.actualizado || '')) { skipped++; return; }
        var merged = {};
        Object.keys(rows[idx]).forEach(function (k) { merged[k] = rows[idx][k]; });
        Object.keys(incoming).forEach(function (k) { merged[k] = incoming[k]; });
        required_(t, merged);
        rows[idx] = merged;
      } else if (op.op === 'create') {
        required_(t, incoming);
        rows.push(incoming);
      } else {
        skipped++; // update de una fila borrada en otro dispositivo: se descarta
        return;
      }
      applied++;
    });
    Object.keys(tables).forEach(function (t) { writeTable_(t, tables[t]); });
    return { applied: applied, skipped: skipped };
  } finally {
    lock.releaseLock();
  }
}

function writeTable_(table, rows) {
  var sh = sheet_(table), headers = HEADERS[table];
  var values = rows.map(function (r) { return headers.map(function (h) { return safe_(r[h] == null ? '' : String(r[h])); }); });
  var needed = values.length + 1;
  if (sh.getMaxRows() < needed) sh.insertRowsAfter(sh.getMaxRows(), needed - sh.getMaxRows());
  var last = sh.getLastRow();
  if (last > 1) sh.getRange(2, 1, last - 1, headers.length).clearContent();
  if (values.length) sh.getRange(2, 1, values.length, headers.length).setNumberFormat('@').setValues(values);
}

/** Ejecutar una vez desde el editor. Crea las pestañas que falten; no borra nada. */
function setup() {
  var ss = SpreadsheetApp.getActive();
  Object.keys(HEADERS).forEach(function (t) {
    var name = SHEET_NAMES[t], sh = ss.getSheetByName(name) || ss.insertSheet(name);
    var headers = HEADERS[t];
    sh.getRange(1, 1, sh.getMaxRows(), headers.length).setNumberFormat('@');
    sh.getRange(1, 1, 1, headers.length).setValues([headers]).setFontWeight('bold');
    sh.setFrozenRows(1);
  });
  var cat = ss.getSheetByName(SHEET_NAMES.Categorias);
  if (cat.getLastRow() < 2) {
    cat.getRange(2, 1, CATEGORIAS.length, 4).setValues(CATEGORIAS.map(function (n, i) {
      return ['cat-' + (i < 9 ? '0' : '') + (i + 1), n, String(i + 1), '2026-01-01T00:00:00.000Z'];
    }));
  }
}
