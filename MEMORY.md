# MEMORY.md

## Estado
- Proyecto: Diario de Estudio (prototipo funcional)
- Archivos: `index.html`, `styles.css`, `app.js`, `heatmap.js`, `weekly-goal.js`, `tests/heatmap.test.js`, `tests/weekly-goal.test.js`, `AGENTS.md`, `MEMORY.md`
- Storage: `localStorage` `diario-estudio-v1` (sesiones), `diario-estudio-goal-v1` (objetivo semanal)
- Sin dependencias, sin build
- Spec 001 (mapa de actividad): T1–T17 completadas y verificadas.
- Spec 002 (objetivo semanal): T1–T8 completadas y verificadas.

## Implementado
- Formulario para registrar sesión (Fecha, Materia, Tema, Minutos) con validación; guardado condicionado al éxito de `saveSessions()`
- Historial de sesiones en lista, ordenado desc por fecha
- Racha actual y mejor racha histórica
- Minutos totales de la semana actual (lunes a domingo)
- Persistencia en localStorage
- Bloqueo de fechas futuras
- Manejo de fechas sin desfase UTC (parseo local)
- Diseño responsive y accesible
- Mapa de actividad de 12 semanas (84 días) con niveles por minutos, leyenda, detalle accesible, días futuros atenuados y navegación por teclado/toque
- Actualización del mapa al cargar y después de guardar una sesión
- Almacenamiento de sesiones corrupto: aviso, vistas seguras y bloqueo de guardado para no sobrescribir datos
- Objetivo semanal (`weekly-goal.js`): validación/ciclo del campo, persistencia canónica en `diario-estudio-goal-v1`, cálculo de semana local y progreso (excluye futuras/fuera de semana, redondeo por sesión), estados sin objetivo/en progreso/cumplido/superado, barra accesible, atajos, anuncios en `#goalMessage`, recálculo en carga/guardado confirmado/foco-visibilidad
- `saveSessions()` devuelve booleano; sin éxito no hay mensaje de éxito, no se limpia el formulario ni se recalculan vistas dependientes
- Tests puros: `tests/heatmap.test.js` y `tests/weekly-goal.test.js`

## Verificación
- `node --test`: **98/98** pruebas pasan (26 mapa + 72 objetivo semanal), antes y después de la verificación integral T7.
- Chrome DevTools T7 (spec 002): carga vacía/con objetivo, persistencia, guardar/cambiar/quitar, atajos, validaciones (`abc`, `00`, `10081`, `0120`, ` 120 `, vacío/`0`), sesión hoy actualiza progreso/anuncio y coincide con “Minutos esta semana” (enteras/no futuras), sesión fuera de semana sin cambio de progreso, cumplimiento exacto y superado (`301/300` +1 min), borrador conservado en fallo/recálculo, fallo simulado `setItem` sesiones (error sin éxito falso ni recálculo, datos intactos), fallo `removeItem` objetivo (valor conservado), goal corrupto (sin objetivo, sin sobrescribir, 1 warning), sesiones ilegibles (bloqueo de guardado preservado, objetivo guardable/visible con progreso 0, `diario-estudio-v1` intacto), cambio de semana por `initScript` +7 días con recálculo (objetivo conservado, progreso reinicia), 10.000 sesiones sin bloqueo perceptible, 375 px sin scroll horizontal.
- Lighthouse (snapshot, `file://`): **Accessibility 100**, **Best Practices 100** en móvil y escritorio. Fallos SEO/Agentic fuera de alcance para app local.
- Consola: sin errores no controlados; warnings solo en escenarios esperados (lectura corrupta/ilegible).

## Divergencia y limitaciones aceptadas
- **Divergencia esperada:** la tarjeta “Minutos esta semana” y el progreso del objetivo pueden diferir con sesiones heredadas (futuras/decimales) por reglas distintas; para sesiones creadas por el formulario (enteras y no futuras) coinciden. No se migran ni normalizan datos existentes.
- **Sesiones ilegibles:** se mantiene el bloqueo de `getSessions()`/`saveSessions()` para no sobrescribir `diario-estudio-v1`; el formulario de sesión no permite registrar en ese estado. El objetivo semanal sigue visible y operable según su clave (progreso 0 si no hay sesiones legibles) y un error de su clave no bloquea el registro de sesiones cuando las sesiones sí son legibles (RF-14).
- **Reinicio semanal:** sin temporizador de medianoche, el progreso se reinicia en la siguiente recalculación (recarga, foco/visibilidad o guardado confirmado).

## Pendiente / Notas
- Sin pendientes funcionales conocidos.
- Sin linting.
- `README.md` no existe y no se crea (fuera de alcance).
- Verificación manual base: abrir `index.html`, probar sesiones/rachas/historial/mapa/objetivo, persistencia y casos de error en Chrome DevTools.
