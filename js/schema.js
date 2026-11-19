// Esquema compartido. Code.gs tiene una copia de HEADERS: si cambias algo aquí, cámbialo allá.
export const TABLES = ['Libros', 'Sesiones', 'Notas', 'Resenas', 'Categorias', 'Config'];
export const SHEET_NAMES = { Libros: 'Libros', Sesiones: 'Sesiones', Notas: 'Notas', Resenas: 'Reseñas', Categorias: 'Categorias', Config: 'Config' };

export const HEADERS = {
  Libros: ['id', 'titulo', 'autor', 'genero', 'estado', 'formato', 'paginas_total', 'pagina_actual', 'portada_url', 'isbn', 'editorial', 'anio', 'fecha_inicio', 'fecha_fin', 'etiquetas', 'favorito', 'prioridad', 'calificacion', 'veces_leido', 'creado', 'actualizado'],
  Sesiones: ['id', 'libro_id', 'fecha', 'pagina_desde', 'pagina_hasta', 'paginas', 'minutos', 'creado', 'actualizado'],
  Notas: ['id', 'libro_id', 'tipo', 'texto', 'pagina', 'capitulo', 'etiquetas', 'creado', 'actualizado'],
  Resenas: ['id', 'libro_id', 'calificacion', 'resena', 'recomendaria', 'releeria', 'animo', 'ritmo', 'frase_clave', 'fecha', 'creado', 'actualizado'],
  Categorias: ['id', 'nombre', 'orden', 'actualizado'],
  Config: ['clave', 'valor', 'actualizado'],
};

export const ESTADOS = [
  { id: 'leyendo', label: 'Leyendo' },
  { id: 'por_leer', label: 'Por leer' },
  { id: 'leido', label: 'Leído' },
  { id: 'abandonado', label: 'Abandonado' },
];
export const FORMATOS = [
  { id: 'fisico', label: 'Físico' },
  { id: 'ebook', label: 'eBook' },
  { id: 'audiolibro', label: 'Audiolibro' },
];
export const PRIORIDADES = [
  { id: 'alta', label: 'Alta' },
  { id: 'media', label: 'Media' },
  { id: 'baja', label: 'Baja' },
];
export const TIPOS_NOTA = [
  { id: 'concepto', label: 'Concepto' },
  { id: 'sistema', label: 'Sistema / método' },
  { id: 'reflexion', label: 'Reflexión' },
  { id: 'frase', label: 'Frase / cita' },
  { id: 'accionable', label: 'Idea accionable' },
  { id: 'pregunta', label: 'Pregunta' },
  { id: 'dato', label: 'Dato' },
  { id: 'resumen', label: 'Resumen de capítulo' },
];
export const ANIMOS = ['inspirador', 'reflexivo', 'emotivo', 'divertido', 'oscuro', 'intenso', 'ligero', 'informativo', 'desafiante'].map(id => ({ id, label: id[0].toUpperCase() + id.slice(1) }));
export const RITMOS = [
  { id: 'lento', label: 'Lento' },
  { id: 'medio', label: 'Medio' },
  { id: 'rapido', label: 'Rápido' },
];
export const CATEGORIAS_INICIALES = ['Novela', 'Ficción literaria', 'Ciencia ficción', 'Fantasía', 'Misterio y thriller', 'Romance', 'Histórica', 'Clásicos', 'Poesía', 'Biografía y memorias', 'Historia', 'Ciencia', 'Filosofía', 'Psicología', 'Desarrollo personal', 'Negocios y finanzas', 'Productividad', 'Espiritualidad', 'Ensayo', 'Divulgación', 'Arte y diseño', 'Tecnología', 'Otro'];

export const label = (list, id) => list.find(x => x.id === id)?.label ?? '';
export const newId = () => crypto.randomUUID();
export const now = () => new Date().toISOString();
