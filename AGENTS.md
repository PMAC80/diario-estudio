# AGENTS.md

## Repo layout
- `index.html` - UI: rachas, mapa de actividad, formulario (fecha/materia/tema/minutos) e historial
- `styles.css` - estilos, responsive y estados del mapa
- `heatmap.js` - lógica pura de fechas, ventana de 84 días, agregación, niveles y etiquetas; exporta a navegador y Node
- `app.js` - DOM, localStorage, render del mapa, interacciones y lógica existente de rachas/historial
- `tests/heatmap.test.js` - pruebas de la lógica pura con `node:test`
- `specs/001-heat-map/` - spec, plan y tareas del mapa de actividad
- `docs/constitution.md` - principios innegociables del proyecto

## How to run
Open `index.html` directly in a browser. No build, no server required.

## Data/storage
- Key: `diario-estudio-v1` (JSON array in localStorage)
- Each session: `{ id, fecha (YYYY-MM-DD), materia, tema, minutos, createdAt }`
- Dates are stored/parsed as local dates (input `type=date` value used directly). Avoid UTC conversion.
- El mapa solo lee sesiones: no crea, edita, migra ni elimina datos. Las sesiones futuras o fuera de la ventana se ignoran visualmente sin borrarse.
- Si el almacenamiento no se puede leer o no es un array, `getSessions()` avisa una vez por `console.warn` y devuelve `[]`; guardar queda bloqueado para no sobrescribir los datos originales.

## Heatmap
- Ventana fija de 12 semanas calendario (84 días), de lunes a domingo, desde el lunes de la semana −11 hasta el domingo de la semana actual.
- Niveles por suma diaria: 0 sin estudio, 1 = 1–29, 2 = 30–59, 3 = 60–119, 4 = 120+ minutos. Cada sesión se redondea antes de sumar.
- Los días futuros se muestran atenuados, no son enfocables y no muestran detalle.
- Teclado: un solo día en el orden de tabulación (roving tabindex); flechas izquierda/derecha ±7 días, arriba/abajo ±1, `Home`/`End` a los extremos y `Escape` cierra el detalle.
- Puntero/foco actualizan el panel `aria-live`; el toque fija el detalle y se cierra al tocar otro día o fuera del mapa.
- Accesibilidad: cada día no futuro es un botón con nombre accesible completo; la cuadrícula es un `group` y la leyenda una `list`.

## Gotchas
- **Date handling**: Parse `YYYY-MM-DD` by splitting to `new Date(y,m-1,d)`. Don't use `new Date(dateString)` for date-only strings (can shift due to TZ).
- **Future dates**: Form blocks `sessionDate > today` and streak calculations ignore future dates.
- **Streak actual**: Consecutive days counting backward from today. If today has no session, streak starts from most recent consecutive chain going backward (logic in `calculateStreak()`).
- **Mejor racha histórica**: Longitud máxima de días consecutivos con al menos una sesión. Usa fechas locales, ignora futuras, días únicos (múltiples sesiones mismo día = 1 día). Calcula en orden cronológico buscando huecos. Se actualiza al guardar e inicializar.
- **XSS**: `escapeHtml()` used when rendering history.
- **Tests del mapa**: usan fechas locales fijas (por ejemplo `new Date(2026, 10, 5)`) y no dependen del reloj real.

## Verificación
- Tests automáticos: `node --test` (26 pruebas de `heatmap.js`).
- Después de cada cambio visual o de integración, verificá con el MCP de Chrome DevTools: carga vacía y con sesiones, actualización al guardar, persistencia, hover/foco/toque, cierre del detalle, días futuros, almacenamiento corrupto y consola sin errores.
- Comprobá la vista móvil a 375 px sin scroll horizontal. Lighthouse de accesibilidad debe mantenerse en 100.

Tests: node --test.
Leé docs/constitution.md y la spec activa antes de tocar código.
