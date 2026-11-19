// Búsqueda de datos y portadas: Open Library primero, Google Books como respaldo. Sin claves.
const isIsbn = q => /^(97[89])?\d{9}[\dXx]$/.test(q.replace(/[-\s]/g, ''));

async function getJSON(url) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 6000);
  try {
    const res = await fetch(url, { signal: ctrl.signal });
    if (!res.ok) throw new Error('HTTP ' + res.status);
    return await res.json();
  } finally { clearTimeout(t); }
}

async function openLibrary(q) {
  const isbn = isIsbn(q) ? q.replace(/[-\s]/g, '') : null;
  const url = isbn ? `https://openlibrary.org/search.json?isbn=${isbn}&limit=8` : `https://openlibrary.org/search.json?q=${encodeURIComponent(q)}&limit=8`;
  const data = await getJSON(url + '&fields=title,author_name,isbn,publisher,first_publish_year,number_of_pages_median,cover_i');
  return (data.docs || []).map(d => ({
    titulo: d.title || '', autor: (d.author_name || []).slice(0, 2).join(', '), isbn: isbn || (d.isbn || [])[0] || '',
    editorial: (d.publisher || [])[0] || '', anio: d.first_publish_year || '', paginas: d.number_of_pages_median || '',
    portada_url: d.cover_i ? `https://covers.openlibrary.org/b/id/${d.cover_i}-M.jpg` : '',
  }));
}

async function googleBooks(q) {
  const term = isIsbn(q) ? 'isbn:' + q.replace(/[-\s]/g, '') : q;
  const data = await getJSON(`https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(term)}&maxResults=8`);
  return (data.items || []).map(({ volumeInfo: v = {} }) => ({
    titulo: v.title || '', autor: (v.authors || []).slice(0, 2).join(', '),
    isbn: ((v.industryIdentifiers || []).find(i => i.type === 'ISBN_13') || (v.industryIdentifiers || [])[0] || {}).identifier || '',
    editorial: v.publisher || '', anio: (v.publishedDate || '').slice(0, 4), paginas: v.pageCount || '',
    portada_url: (v.imageLinks?.thumbnail || '').replace(/^http:/, 'https:'),
  }));
}

/** Devuelve resultados o lanza Error('Sin conexión') / Error('Sin resultados'). */
export async function searchBooks(q) {
  q = q.trim();
  if (!q) return [];
  if (navigator.onLine === false) throw new Error('Sin conexión');
  let results = [];
  try { results = await openLibrary(q); } catch { /* probamos Google Books */ }
  if (!results.length || !results.some(r => r.portada_url)) {
    try { const g = await googleBooks(q); results = results.length ? [...results, ...g] : g; } catch { /* sin respaldo */ }
  }
  return results.slice(0, 10);
}
