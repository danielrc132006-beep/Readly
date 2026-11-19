# Readly

App personal para registrar lecturas, progreso, notas y reseñas. Funciona sin conexión (PWA) y guarda una copia en Google Sheets.

- Frontend: HTML + CSS + JavaScript (módulos ES), sin paso de build. Se publica tal cual en GitHub Pages.
- Datos: se guardan primero en el dispositivo y se sincronizan con Google Sheets mediante Google Apps Script cuando hay conexión. Si editas lo mismo en dos dispositivos, gana el cambio más reciente.
- Seguridad: toda lectura y escritura pasa por POST con un token secreto. El token **no** está en este repositorio; vive en las propiedades del script y en el dispositivo.

---

## A. Apps Script (una sola vez)

1. Abre tu hoja de Google Sheets → **Extensiones → Apps Script**.
2. Borra lo que haya en `Código.gs` y pega el contenido de [`apps-script/Code.gs`](apps-script/Code.gs). Guarda.
3. **Configuración del proyecto** (icono de engrane) → **Propiedades de la secuencia de comandos** → **Agregar propiedad**:
   - Propiedad: `READLY_TOKEN`
   - Valor: una contraseña larga inventada (por ejemplo 30 caracteres al azar). Guárdala en tu gestor de contraseñas: la vas a pegar en la app.
4. En el editor, elige la función **`setup`** en la lista de arriba y pulsa **Ejecutar**. Acepta los permisos (es tu propia hoja). Crea las pestañas que falten; no borra nada.
5. **Implementar → Nueva implementación** → engrane → tipo **Aplicación web**:
   - Ejecutar como: **Yo**
   - Quién tiene acceso: **Cualquier usuario**
   - **Implementar**.
6. Copia la **URL de la aplicación web** (termina en `/exec`).
7. Cada vez que cambies `Code.gs`: **Implementar → Gestionar implementaciones → editar (lápiz) → Versión: Nueva versión → Implementar**. Así la URL no cambia.

> "Cualquier usuario" solo permite llamar a la URL. Sin el token, Apps Script responde "Token incorrecto" y no entrega ni modifica datos. Abrir la URL en el navegador solo muestra `{"ok":true,"app":"readly"}`.

## B. GitHub Pages

1. Crea un repositorio llamado `readly` en GitHub.
2. Sube **solo el contenido de esta carpeta** (`readly/`): `index.html`, `manifest.webmanifest`, `service-worker.js`, `favicon.svg`, `css/`, `js/`, `icons/`, `apps-script/` (es solo referencia, no contiene el token) y `README.md`. Nunca subas el token.
3. Desde esta carpeta, en PowerShell:
   ```powershell
   git init
   git add .
   git commit -m "Readly v1"
   git branch -M main
   git remote add origin https://github.com/<usuario>/readly.git
   git push -u origin main
   ```
4. En GitHub: **Settings → Pages → Source: Deploy from a branch → `main` / `(root)` → Save**.
5. Abre `https://<usuario>.github.io/readly/` (tarda uno o dos minutos la primera vez).

## C. Conectar e instalar

1. En la app: **Ajustes** (engrane arriba a la derecha) → pega la URL `/exec` y el token → **Probar conexión** → **Guardar**.
2. Android: abre la URL en Chrome → menú ⋮ → **Instalar app** (o "Agregar a pantalla principal").
3. iPad / iPhone: abre la URL en Safari → **Compartir → Agregar a pantalla de inicio**.
4. Repite el paso 1 en cada dispositivo (la URL y el token se guardan por dispositivo).

## D. Actualizar la app

Después de cambiar archivos y antes de hacer `git push`, sube la versión de caché en `service-worker.js`:

```js
const CACHE_VERSION = 'readly-v2'; // v1 → v2 → v3…
```

Si no la cambias, los teléfonos seguirán usando la versión guardada. Al abrir la app con la versión nueva publicada, el service worker descarga los archivos nuevos; cierra y vuelve a abrir la app para verlos.

## Respaldo

En **Ajustes → Respaldo**:

- **Exportar JSON**: copia completa que se puede volver a importar.
- **Exportar CSV**: un archivo por tabla, para abrir en una hoja de cálculo.
- **Importar JSON**: agrega o actualiza registros (no borra nada) y los sube a Google Sheets.

## Estructura

```
index.html, manifest.webmanifest, service-worker.js, favicon.svg
css/      tokens.css (paleta y tipografía) · app.css (componentes)
js/       app.js (router) · store.js (datos locales + cola) · api.js (Apps Script) · schema.js · covers.js · ui.js
js/logic/ progreso, estadísticas, sincronización, respaldo, estados (lógica pura con pruebas)
js/views/ inicio, biblioteca, libro, formularios, notas, estadísticas, ajustes
js/components/ tarjetas, portada, estrellas, gráficas, hoja inferior
icons/    sprite.svg (iconos de la interfaz), logo y PNG de la app
apps-script/Code.gs  backend (se copia a mano en Apps Script)
```
