# Tasks 001 — Mapa de actividad

Tareas en orden de dependencia. Cada una está pensada para 20–30 minutos y no se marca hasta cumplir su línea “Hecho cuando”.

- [x] **T1 — Crear `heatmap.js` y utilidades de fecha puras** (25 min)
  - Depende de: —.
  - RF: RF-1.
  - Hecho cuando: con `hoy = new Date(2026, 10, 5)` se obtienen 84 claves consecutivas desde `2026-08-17` hasta `2026-11-08`, empezando en lunes y terminando en domingo.

- [x] **T2 — Agregación de minutos y validación de datos** (25 min)
  - Depende de: T1.
  - RF: RF-2, RF-9.
  - Hecho cuando: un fixture con sesiones válidas, repetidas, decimales e inválidas devuelve el mapa de minutos esperado, con redondeo por sesión e ignorando fechas o minutos inválidos.

- [x] **T3 — Niveles y construcción de los 84 días** (30 min)
  - Depende de: T2.
  - RF: RF-2, RF-3, RF-4, RF-10.
  - Hecho cuando: `buildHeatmapDays` devuelve 84 días con minutos, nivel 0–4, marca de hoy, marca de futuro y estado correcto para un día sin sesiones.

- [x] **T4 — Pruebas unitarias de la lógica pura** (30 min)
  - Depende de: T3.
  - RF: RF-1, RF-2, RF-3, RF-4, RF-9, RF-10.
  - Hecho cuando: `node --test tests/heatmap.test.js` pasa y cubre límites 1/29/30/59/60/119/120, redondeo, suma de sesiones, fechas inválidas, futuros y ventana de 84 días.

- [x] **T5 — Maquetar la sección “Mapa de actividad”** (20 min)
  - Depende de: T1.
  - RF: RF-1, RF-6.
  - Hecho cuando: `index.html` contiene la sección entre rachas y formulario, con título, contenedor de cuadrícula, leyenda y región de detalle con `aria-live="polite"`.

- [x] **T6 — Estilos de cuadrícula, estados y responsive** (30 min)
  - Depende de: T5.
  - RF: RF-3, RF-4, RF-6; RNF-1, RNF-2, RNF-3.
  - Hecho cuando: a 375 px se ven 12 columnas y 7 filas sin scroll horizontal, y los estados sin estudio, niveles 1–4, futuro y foco son visualmente distinguibles.

- [x] **T7 — Renderizar cuadrícula y leyenda desde los datos** (30 min)
  - Depende de: T3, T6.
  - RF: RF-1, RF-2, RF-3, RF-4, RF-6, RF-10.
  - Hecho cuando: con tres sesiones de prueba el DOM muestra 84 celdas, los niveles correctos, los días futuros atenuados y la leyenda completa.

- [x] **T8 — Detalle por puntero y foco** (25 min)
  - Depende de: T7.
  - RF: RF-5, RF-8.
  - Hecho cuando: hover y focus muestran fecha y minutos totales o “Sin estudio”, y un día futuro no muestra detalle.

- [x] **T9 — Detalle táctil y cierre** (25 min)
  - Depende de: T8.
  - RF: RF-5, RF-8.
  - Hecho cuando: tocar un día muestra el detalle; tocar otro día o fuera del mapa lo cierra; tocar un día futuro no hace nada.

- [x] **T10 — Navegación por teclado** (30 min)
  - Depende de: T9.
  - RF: RF-8.
  - Hecho cuando: Tab entra una sola vez al mapa, las flechas recorren solo días no futuros, `Home`/`End` van a los extremos y `Escape` cierra el detalle.

- [x] **T11 — Auditoría de accesibilidad del mapa** (25 min)
  - Depende de: T10.
  - RF: RF-8; RNF-2.
  - Hecho cuando: cada celda no futura tiene nombre accesible con fecha y minutos, el detalle se anuncia por `aria-live`, el foco es visible y el contraste cumple AA.

- [x] **T12 — Integrar carga y actualización tras guardar** (25 min)
  - Depende de: T7.
  - RF: RF-7.
  - Hecho cuando: al cargar se pinta el mapa con las sesiones existentes y al guardar una sesión válida el mapa se actualiza sin recargar; una sesión fuera de la ventana no altera las celdas visibles.

- [x] **T13 — Manejo de almacenamiento corrupto** (20 min)
  - Depende de: T12.
  - RF: RF-7, RF-9; RNF-6, RNF-7.
  - Hecho cuando: con JSON inválido el mapa queda vacío, aparece un `console.warn`, la pantalla no se rompe y el almacenamiento conserva el valor original.

- [x] **T14 — Verificación de bordes y rendimiento** (30 min)
  - Depende de: T13.
  - RF: RF-1, RF-2, RF-9; RNF-4.
  - Hecho cuando: 29 de febrero, cruce de año y 10.000 sesiones se procesan sin errores, sin días duplicados y sin bloqueo perceptible.

- [x] **T15 — Verificación móvil y matriz manual** (30 min)
  - Depende de: T14.
  - RF: RF-3, RF-4, RF-5, RF-6, RF-8; RNF-2, RNF-3.
  - Hecho cuando: en Chrome a 375 px se validan carga vacía, tres sesiones, hover/focus/tap, leyenda, futuros, cierre de detalle y ausencia de scroll horizontal.

- [x] **T16 — Actualizar documentación del proyecto** (20 min)
  - Depende de: T15.
  - RF: transversal; constitución.
  - Hecho cuando: `AGENTS.md` describe la nueva sección, `heatmap.js` y `node --test`, y `MEMORY.md` refleja el estado y la verificación realizados.

- [x] **T17 — Regresión final y consola limpia** (30 min)
  - Depende de: T16.
  - RF: todos; RNF-7, RNF-8; constitución.
  - Hecho cuando: `node --test` pasa, el registro/historial/rachas/minutos semanales siguen funcionando, la consola no muestra errores y la spec queda trazada contra lo implementado.
