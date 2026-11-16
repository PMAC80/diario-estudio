# AGENTS.md

## Repo layout
- `index.html` - UI: rachas, objetivo semanal, mapa de actividad, formulario (fecha/materia/tema/minutos) e historial
- `styles.css` - estilos, responsive y estados del mapa y objetivo semanal
- `heatmap.js` - lógica pura de fechas, ventana de 84 días, agregación, niveles y etiquetas; exporta a navegador y Node
- `weekly-goal.js` - lógica pura del objetivo semanal: validación, persistencia de `diario-estudio-goal-v1`, semana/progreso/estados/textos/anuncios; reutiliza utilidades de `Heatmap`; exporta a navegador y Node
- `app.js` - DOM, localStorage, render/interacciones de rachas, objetivo, mapa e historial
- `tests/heatmap.test.js` - pruebas puras del mapa con `node:test`
- `tests/weekly-goal.test.js` - pruebas puras del objetivo semanal con `node:test`
- `specs/001-heat-map/` - spec, plan y tareas del mapa de actividad
- `specs/002-weekly-goal/` - spec, plan y tareas del objetivo semanal
- `docs/constitution.md` - principios innegociables del proyecto

## How to run
Open `index.html` directly in a browser. No build, no server required.

## Data/storage
- Key sesiones: `diario-estudio-v1` (JSON array in localStorage)
  - Each session: `{ id, fecha (YYYY-MM-DD), materia, tema, minutos, createdAt }`
- Key objetivo: `diario-estudio-goal-v1` (JSON canónico `{ "objetivoMinutos": <entero 1-10080> }` o ausencia de clave = sin objetivo)
- Dates are stored/parsed as local dates (input `type=date` value used directly). Avoid UTC conversion.
- `getSessions()` lee sesiones: si falta, devuelve `[]`; si el contenido no es un array o el JSON es inválido, avisa una vez por `console.warn`, marca lectura fallida y devuelve `[]`. El guardado de sesiones queda bloqueado para no sobrescribir datos originales.
- `saveSessions(sessions)` devuelve `true` solo tras `setItem` exitoso; en fallo registra `console.error`, muestra error y devuelve `false`. El formulario de sesión solo muestra éxito, limpia campos y recalcula vistas si el guardado fue confirmado.
- El objetivo semanal nunca lee, escribe ni elimina `diario-estudio-v1`. Un error de la clave del objetivo no bloquea el registro de sesiones (RF-14). Con sesiones ilegibles, el objetivo puede mostrarse con progreso 0 pero se conserva el bloqueo de guardado de sesiones de `getSessions()`.

## Heatmap
- Ventana fija de 12 semanas calendario (84 días), de lunes a domingo, desde el lunes de la semana −11 hasta el domingo de la semana actual.
- Niveles por suma diaria: 0 sin estudio, 1 = 1–29, 2 = 30–59, 3 = 60–119, 4 = 120+ minutos. Cada sesión se redondea antes de sumar.
- Los días futuros se muestran atenuados, no son enfocables y no muestran detalle.
- Teclado: roving tabindex; flechas izquierda/derecha ±7 días, arriba/abajo ±1, `Home`/`End` a los extremos y `Escape` cierra el detalle.
- Puntero/foco actualizan el panel `aria-live`; el toque fija el detalle y se cierra al tocar otro día o fuera del mapa.
- Accesibilidad: cada día no futuro es un botón con nombre accesible completo; la cuadrícula es un `group` y la leyenda una `list`.

## Objetivo semanal
- Semana local lunes–domingo; progreso incluye sesiones desde el lunes hasta hoy (inclusive) y excluye fechas futuras y fuera de semana. Cada sesión se redondea con las mismas utilidades de minutos que el mapa; sesiones inválidas se ignoran.
- Validación de entrada: `trim`; vacío/solo espacios o `'0'` exacto quitan el objetivo; solo dígitos enteros; rango 1–10080; ceros a la izquierda se normalizan. Formato inválido: “Ingresa un número entero de minutos mayor que 0.” Rango inválido: “El objetivo debe estar entre 1 y 10080 minutos.”
- Persistencia: lectura distingue `missing`, `valid`, `invalid`, `unreadable` (no escribe ni avisa desde el módulo puro). Clave corrupta/ilegible → estado sin objetivo, un único `console.warn` en UI y no se sobrescribe el valor original. Escritura/eliminación solo por acción explícita; fallos mantienen el valor anterior y muestran mensaje exacto de error.
- Estados UI: sin objetivo, en progreso, cumplido y superado (`+N min`, sin `+0 min`). Sin objetivo no se expone `progressbar`. Contador `X / Y min`, textos y `aria-valuetext` según spec.
- Ciclo del campo: se escribe solo al cargar, guardar, quitar o ante error de validación/almacenamiento según corresponda; nunca en cada render. Un borrador no guardado se conserva ante recálculos (p. ej. guardado de sesión).
- Anuncios: `#goalMessage` (`role="status"`, `aria-live="polite"`, `aria-atomic="true"`) es la región de anuncios. Se anuncia en guardado/cambio/quitado y en progreso tras guardar sesión confirmada; no se anuncia en recálculos por foco/visibilidad/cambio de semana sin acción explícita.
- Cambio de semana: el objetivo persiste y el progreso se reinicia en la siguiente recalculación (recarga, foco/visibilidad, guardado). No hay temporizador de medianoche.
- Divergencia esperada: la tarjeta “Minutos esta semana” usa su lógica existente (puede incluir futuras y no redondea igual que el objetivo); el progreso del objetivo aplica las reglas anteriores. Coinciden para sesiones creadas por el formulario (enteras y no futuras).

## Gotchas
- **Date handling**: Parse `YYYY-MM-DD` by splitting to `new Date(y,m-1,d)`. Don't use `new Date(dateString)` for date-only strings (can shift due to TZ).
- **Future dates**: Form blocks `sessionDate > today` and streak/goal progress ignore future dates (según sus reglas).
- **Streak actual**: Consecutive days counting backward from today. If today has no session, streak starts from most recent consecutive chain going backward.
- **Mejor racha histórica**: máxima secuencia de días consecutivos únicos con sesión; fechas locales, ignora futuras.
- **XSS**: `escapeHtml()` used when rendering history.
- **Tests puros**: usan fechas locales fijas (p. ej. `new Date(2026, 10, 5)`), adaptadores falsos y no dependen del reloj ni `localStorage` real.

## Verificación
- Tests automáticos: `node --test` (98 pruebas: 26 mapa + 72 objetivo semanal).
- Chrome DevTools (T7 spec 002, verificación integral): carga vacía y con datos, guardar/cambiar/quitar objetivo, persistencia, atajos, validaciones (`abc`, `00`, `10081`, `0120`, ` 120 `), sesión hoy/fuera de semana, cumplimiento exacto y superado, borrador conservado, fallos simulados de storage (`setItem` sesiones, `removeItem` objetivo), goal corrupto (sin pisar, 1 warning), sesiones ilegibles con bloqueo de guardado preservado y objetivo visible/progreso 0, cambio de semana por `initScript` + recálculo, 10.000 sesiones sin bloqueo perceptible, responsive 375 px sin scroll horizontal, Lighthouse accesibilidad 100 móvil/escritorio (snapshot), consola sin errores no controlados.
- Limitaciones aceptadas: con sesiones ilegibles no se puede registrar sesión (bloqueo existente de `getSessions()`); el reinicio semanal se refleja en la siguiente recalculación cuando no hay temporizador de medianoche.

Tests: node --test.
Leé docs/constitution.md y la spec activa antes de tocar código.
