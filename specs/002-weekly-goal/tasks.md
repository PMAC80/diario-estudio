# Tasks 002 â€” Objetivo semanal

Tareas en orden de dependencia. Cada una estÃ¡ pensada para 25â€“40 minutos, se puede completar y verificar por separado, y no se marca hasta cumplir su lÃ­nea â€œHecho cuandoâ€. Antes de empezar, lee `specs/002-weekly-goal/spec.md` y `specs/002-weekly-goal/plan.md`.

- [x] **T1 â€” Crear el mÃ³dulo puro de validaciÃ³n y persistencia** (30 min)
  - **Objetivo**: crear `weekly-goal.js` con las constantes, los mensajes, la validaciÃ³n del campo, la validaciÃ³n estricta del valor almacenado y las operaciones de lectura, escritura y eliminaciÃ³n con adaptador inyectable.
  - **Archivos**: `weekly-goal.js` (nuevo), `tests/weekly-goal.test.js` (nuevo).
  - **Depende de**: â€”.
  - **RF**: RF-7, RF-8, RF-9, RF-11; RNF-5, RNF-7.
  - **Pasos**:
    1. Crea `weekly-goal.js` con el mismo patrÃ³n UMD de `heatmap.js`: en Node resuelve `require('./heatmap.js')`; en navegador toma `root.Heatmap`; si falta la dependencia, falla de forma explÃ­cita.
    2. Exporta `GOAL_STORAGE_KEY = 'diario-estudio-goal-v1'`, `MIN_GOAL_MINUTES = 1`, `MAX_GOAL_MINUTES = 10080`, `GOAL_MESSAGES`, `NO_GOAL_TEXTS`, `STATUS_MET_TEXT` y `PROGRESS_LABEL` con los textos exactos del plan.
    3. Implementa `parseGoalInput(rawValue)` con el orden cerrado: `trim`; vacÃ­o o `'0'` exacto quitan; `^[0-9]+$`; rango 1â€“10080; normalizaciÃ³n de ceros a la izquierda; mensajes exactos de formato y rango.
    4. Implementa `isValidGoal(value)` solo para enteros `number` entre 1 y 10080; rechaza cadenas, decimales, `NaN`, `Infinity`, booleanos, `null`, arrays y objetos.
    5. Implementa `parseStoredGoal(rawString)` con `JSON.parse`, objeto no array, `objetivoMinutos` estricto y propiedades adicionales ignoradas.
    6. Implementa `readGoal(storage)` con los estados `missing`, `valid`, `invalid` y `unreadable`; no escribe ni registra avisos. Trata `null`/`undefined` como ausencia y cualquier excepciÃ³n o adaptador ausente como ilegible.
    7. Implementa `saveGoal(storage, value)` y `removeGoal(storage)`. La escritura debe ser exactamente `{ "objetivoMinutos": <entero> }`; devuelve `false` si el valor es invÃ¡lido, el adaptador falta o lanza. Nunca toca `diario-estudio-v1`.
    8. Crea `tests/weekly-goal.test.js` con adaptadores falsos que registren claves leÃ­das, escritas y eliminadas, y adaptadores que lancen.
  - **Pruebas automÃ¡ticas**:
    - ValidaciÃ³n: vacÃ­o, solo espacios, `'0'`, `' 0 '`, `'1'`, `'10080'`, `'0120'`, `'0001'`, `' 120 '`, `'00'`, `'000'`, `'10081'`, cadena enorme, letras, signos, decimales, separadores, notaciÃ³n exponencial y espacios internos.
    - Persistencia: valores 1 y 10080 vÃ¡lidos; `0`, `10081`, `1.5`, `"120"`, `null`, `true`, arrays, objeto sin propiedad, JSON invÃ¡lido y `"null"` invÃ¡lidos; propiedades adicionales vÃ¡lidas.
    - Estados de `readGoal`, JSON canÃ³nico exacto, valor invÃ¡lido no escrito, fallo de `setItem`/`removeItem`, adaptador ausente y ausencia de la clave de sesiones.
    - Ejecuta `node --test`.
  - **VerificaciÃ³n manual**: no aplica; esta tarea no toca el DOM.
  - **Criterios de aceptaciÃ³n**: las funciones son puras, no leen el reloj ni `localStorage` global, no registran avisos, devuelven las formas exactas del plan y no escriben fuera de `diario-estudio-goal-v1`.
  - **Hecho cuando**: `node --test` pasa con las 26 pruebas existentes y las nuevas de validaciÃ³n y persistencia, y no hay acceso real a `localStorage` en las pruebas.

- [x] **T2 â€” Implementar semana, progreso y evaluaciÃ³n de estados** (35 min)
  - **Objetivo**: completar `weekly-goal.js` con el cÃ¡lculo de la semana local, el progreso semanal con redondeo y exclusiÃ³n de futuras, la evaluaciÃ³n de estados, los textos visibles, los datos de `progressbar` y los anuncios.
  - **Archivos**: `weekly-goal.js`, `tests/weekly-goal.test.js`.
  - **Depende de**: T1.
  - **RF**: RF-2, RF-3, RF-5, RF-6, RF-11, RF-13; RNF-1, RNF-2, RNF-7.
  - **Pasos**:
    1. Reutiliza directamente `parseDateKey`, `toDateKey`, `addDays`, `startOfWeekMonday` y `parseMinutes` de `Heatmap`; no copies esas reglas.
    2. Implementa `getGoalWeek(today)` con lunes a domingo en fecha local y `null` si la fecha no es vÃ¡lida.
    3. Implementa `calculateGoalProgress(sessions, today)` en una sola pasada: ignora entradas que no sean objetos, fechas invÃ¡lidas, fechas fuera de la semana y fechas posteriores a hoy; redondea cada sesiÃ³n con `parseMinutes` y suma. No muta las sesiones.
    4. Implementa `evaluateGoal({ goal, minutes })` con los estados `no-goal`, `in-progress`, `met` y `exceeded`, el contador `X / Y min`, `Faltan Z min` o `Falta 1 min`, `Objetivo cumplido`, `+N min` sin `+0 min`, porcentaje limitado a 100 y `aria-valuetext` exacto.
    5. Implementa `getSavedAnnouncement(view)` y `getProgressAnnouncement(view)` con los textos del plan; sin objetivo, el anuncio de progreso es cadena vacÃ­a.
    6. AÃ±ade las pruebas de semana, progreso, tipos, redondeo, estados, textos, anuncios y reutilizaciÃ³n.
  - **Pruebas automÃ¡ticas**:
    - Semana del jueves 5 de noviembre de 2026: `2026-11-02` a `2026-11-08`; lunes y hoy incluidos; viernes y domingo futuros excluidos; domingo incluido cuando hoy es domingo; domingo anterior y lunes siguiente excluidos.
    - Varias sesiones el mismo dÃ­a; decimales 29.4, 29.5, 29.6 y 0.4; tipos admitidos y rechazados; fechas invÃ¡lidas; sin sesiones; array no vÃ¡lido; cambio de mes y aÃ±o; 29 de febrero; 10.000 sesiones sin mutaciÃ³n.
    - Estados 0/300, 120/300, 299/300, 300/300, 301/300 y 600/300; textos exactos, sin `+0 min`, `valuenow` limitado, `aria-valuetext` con singular y plural.
    - Anuncios de guardado y progreso; comparaciÃ³n con `Heatmap.parseMinutes` y `Heatmap.startOfWeekMonday`.
    - Ejecuta `node --test`.
  - **VerificaciÃ³n manual**: no aplica; esta tarea no toca el DOM.
  - **Criterios de aceptaciÃ³n**: la lÃ³gica es determinista para el mismo `today`, usa fecha local, reutiliza las utilidades existentes, no lee storage y devuelve la vista completa que consumirÃ¡ `app.js`.
  - **Hecho cuando**: `node --test` pasa y las pruebas cubren semana, redondeo, tipos, futuros, estados, textos y anuncios.

- [x] **T3 â€” Maquetar la secciÃ³n â€œObjetivo semanalâ€ y sus estilos** (30 min)
  - **Objetivo**: insertar la secciÃ³n estÃ¡tica entre rachas y mapa, con controles, barra, mensajes y atributos accesibles, y agregar los estilos responsive, de foco y de contraste.
  - **Archivos**: `index.html`, `styles.css`.
  - **Depende de**: T1.
  - **RF**: RF-1, RF-4, RF-7, RF-11, RF-12; RNF-2, RNF-3.
  - **Pasos**:
    1. Inserta la secciÃ³n despuÃ©s de `.streaks-section` y antes de `.heatmap-section`, con el esquema y los identificadores del plan.
    2. Deja visible el estado sin objetivo, el campo vacÃ­o, el botÃ³n â€œGuardar objetivoâ€ y los atajos â€œ120 minâ€, â€œ300 minâ€ y â€œ600 minâ€; mantÃ©n `#goalProgress` y `#goalExcess` ocultos.
    3. Usa `type="text"`, `inputmode="numeric"`, `autocomplete="off"`, `aria-describedby="goalMessage"`, etiqueta visible y `novalidate` en el formulario.
    4. Configura la barra con `role="progressbar"`, `aria-label="Progreso del objetivo semanal"`, `aria-valuemin="0"`, `aria-valuemax`, `aria-valuenow` y `aria-valuetext`; no le pongas `aria-live`.
    5. Agrega la regiÃ³n `#goalMessage` con `role="status"`, `aria-live="polite"` y `aria-atomic="true"`; los atajos van en un `group` con `type="button"`.
    6. Carga `weekly-goal.js` despuÃ©s de `heatmap.js` y antes de `app.js`.
    7. Agrega estilos de tarjeta, contador, barra, relleno, mensajes, atajos, foco visible, `min-height: 44px`, `[hidden]`, `overflow-wrap` y responsive a 375 px. No reutilices el verde claro de `.form-message.success` para texto.
  - **Pruebas automÃ¡ticas**: ejecuta `node --test` para confirmar que no se rompiÃ³ nada; esta tarea no agrega pruebas nuevas.
  - **VerificaciÃ³n manual**:
    - Abre `index.html` y comprueba que la secciÃ³n estÃ¡ en el orden correcto y muestra el estado sin objetivo.
    - A 375 px no debe haber scroll horizontal; los atajos deben envolverse y la barra no debe desbordarse.
    - Con zoom de texto al 200 %, el contenido sigue legible y operable.
    - Tab recorre campo, botÃ³n y atajos con foco visible; el campo tiene etiqueta y la barra oculta no aparece en el Ã¡rbol de accesibilidad.
    - La consola no muestra errores por la nueva secciÃ³n.
  - **Criterios de aceptaciÃ³n**: el HTML estÃ¡tico cumple la estructura, los atributos y los textos; los estilos cubren los cuatro estados y el responsive; no hay lÃ³gica de cÃ¡lculo en el HTML.
  - **Hecho cuando**: la secciÃ³n se ve entre rachas y mapa, el estado inicial es â€œAÃºn no tienes objetivo semanalâ€, no hay `progressbar` expuesto sin objetivo, no hay scroll horizontal a 375 px y `node --test` sigue en verde.

- [x] **T4 â€” Integrar la tarjeta en `app.js`** (40 min)
  - **Objetivo**: cargar el objetivo una sola vez, renderizar los cuatro estados, guardar, quitar y validar desde el DOM, con el ciclo de vida del campo y los anuncios definidos.
  - **Archivos**: `app.js`.
  - **Depende de**: T2, T3.
  - **RF**: RF-4, RF-5, RF-6, RF-7, RF-8, RF-9, RF-11; RNF-4, RNF-5.
  - **Pasos**:
    1. Agrega las referencias del DOM, `currentGoal`, `goalWarningShown`, `lastGoalSignature` y `getGoalStorage()` con captura del acceso a `localStorage`.
    2. En la inicializaciÃ³n, lee el objetivo una sola vez con `WeeklyGoal.readGoal`, avisa con un Ãºnico `console.warn` solo si el estado es `invalid` o `unreadable`, asigna `currentGoal`, actualiza el campo y renderiza sin anunciar.
    3. Implementa `renderGoal(view)` sin leer storage y sin escribir el campo. Actualiza tÃ­tulo, pista, contador, barra, restante, exceso, clases y atributos de `progressbar`; oculta la barra sin objetivo.
    4. Implementa `setGoalField(value)`, `showGoalMessage(text, type)` y `refreshGoal({ announceProgress })`. El campo solo se escribe al cargar, guardar, quitar o ante un error; el mensaje no se reasigna si el texto es idÃ©ntico.
    5. Implementa el envÃ­o del formulario: `parseGoalInput`, quitado idempotente sin objetivo, error de validaciÃ³n con `aria-invalid`, foco y mensaje exacto, guardado idempotente si el valor es el mismo, fallo de almacenamiento con el mensaje exacto y Ã©xito con campo canÃ³nico.
    6. Implementa los atajos con `applyGoalSave(value)` en una sola acciÃ³n; actualiza el campo y anuncia el Ã©xito si el valor cambiÃ³.
    7. Integra las llamadas en `init()` sin modificar las secciones existentes.
  - **Pruebas automÃ¡ticas**: ejecuta `node --test`; no se agregan pruebas de DOM en Node. Las funciones puras ya estÃ¡n cubiertas por T1 y T2.
  - **VerificaciÃ³n manual**:
    - Sin clave: estado sin objetivo, campo vacÃ­o, sin warning y sin `progressbar`.
    - Con `{"objetivoMinutos":300}`: campo `300`, `0 / 300 min`, â€œFaltan 300 minâ€.
    - Guarda, cambia y quita; comprueba el storage exacto, el campo y los mensajes.
    - Prueba `abc`, `00`, `10081`, `0120`, ` 120 `, vacÃ­o y `0`; comprueba `aria-invalid`, foco, texto conservado y ausencia de escritura.
    - Con clave corrupta: estado sin objetivo, un solo warning y valor original intacto.
    - Recarga: el objetivo persiste y el campo se puebla.
    - Teclado y lector: campo, botÃ³n y atajos operables; la regiÃ³n anuncia sin duplicar.
  - **Criterios de aceptaciÃ³n**: se cumplen RF-4 a RF-9 y RF-11 en el DOM; ningÃºn render pisa un borrador; el storage solo se escribe tras una acciÃ³n explÃ­cita; los mensajes y estados son exactos.
  - **Hecho cuando**: `node --test` pasa y la verificaciÃ³n manual de carga, guardado, cambio, quitado, validaciÃ³n y datos corruptos queda registrada.

- [x] **T5 â€” Integrar el guardado de sesiones y el recÃ¡lculo reactivo** (35 min)
  - **Objetivo**: condicionar el Ã©xito del formulario de sesiÃ³n al resultado de `saveSessions()`, recalcular el objetivo solo tras un guardado confirmado y actualizarlo al volver a la pestaÃ±a o recibir foco.
  - **Archivos**: `app.js`.
  - **Depende de**: T4.
  - **RF**: RF-10, RF-14; RNF-4, RNF-6.
  - **Pasos**:
    1. Haz que `saveSessions(sessions)` devuelva `true` solo despuÃ©s de un `setItem` exitoso y `false` en el `catch`, manteniendo el `console.error` y el mensaje de error existente.
    2. En el manejador de sesiÃ³n, guarda el resultado y retorna antes de mostrar â€œSesiÃ³n guardada correctamenteâ€, limpiar el formulario o recalcular vistas si es `false`.
    3. Si es `true`, mantÃ©n el orden actual de actualizaciÃ³n y agrega `refreshGoal({ announceProgress: true })` al final.
    4. Asegura que `refreshGoal` no escriba el campo de objetivo; un borrador no guardado debe conservarse al registrar una sesiÃ³n.
    5. Agrega `document.addEventListener('visibilitychange', ...)` y `window.addEventListener('focus', ...)` para recalcular con `new Date()` y sin anunciar.
    6. Usa la firma `weekStartKey:minutes` para no reescribir el DOM ni anunciar cuando el progreso no cambiÃ³.
    7. No agregues temporizador de medianoche, sincronizaciÃ³n entre pestaÃ±as ni relectura de la clave del objetivo.
  - **Pruebas automÃ¡ticas**: ejecuta `node --test`; la lÃ³gica pura de semana y progreso ya estÃ¡ cubierta por T2. No se agregan pruebas de DOM.
  - **VerificaciÃ³n manual**:
    - Guarda una sesiÃ³n de hoy: el objetivo se actualiza y la regiÃ³n anuncia el progreso; la tarjeta â€œMinutos esta semanaâ€ coincide si la sesiÃ³n es entera y no futura.
    - Guarda una sesiÃ³n fuera de la semana: la tarjeta se actualiza sin cambiar el progreso visible ni anunciar.
    - Simula un fallo de `setItem` para sesiones: no aparece â€œSesiÃ³n guardada correctamenteâ€, no se recalcula el objetivo, no se limpia el formulario, el borrador del objetivo se conserva y las sesiones almacenadas quedan iguales.
    - Escribe un borrador en el campo de objetivo y guarda una sesiÃ³n: el borrador no se sobrescribe.
    - Cambia la semana con un `initScript` que desplace `Date` siete dÃ­as y vuelve a la pestaÃ±a: el objetivo se conserva y el progreso se reinicia.
    - Vuelve a la pestaÃ±a sin cambios: no hay anuncio ni escritura.
  - **Criterios de aceptaciÃ³n**: RF-10 y RF-14 se cumplen; un fallo de sesiÃ³n no produce Ã©xito falso ni altera el objetivo; el cambio de semana se refleja en la siguiente recalculaciÃ³n; no se anuncia en foco o visibilidad.
  - **Hecho cuando**: `node --test` pasa y la verificaciÃ³n manual de guardado exitoso, fallido, borrador conservado, sesiÃ³n fuera de semana y cambio de semana queda registrada.

- [x] **T6 â€” AÃ±adir regresiÃ³n y pruebas de borde** (30 min)
  - **Objetivo**: completar la cobertura automatizada de integridad, rendimiento, casos lÃ­mite y divergencia esperada, y corregir solo los defectos que aparezcan.
  - **Archivos**: `tests/weekly-goal.test.js`; si aparece un defecto, `weekly-goal.js` o `app.js` de forma mÃ­nima.
  - **Depende de**: T5.
  - **RF**: RF-3, RF-9, RF-13, RF-14; RNF-1, RNF-5, RNF-6, RNF-7.
  - **Pasos**:
    1. Agrega pruebas de 10.000 sesiones con resultado correcto y sin mutaciÃ³n.
    2. Agrega un fixture con sesiones heredadas futuras y decimales que documente la diferencia con la tarjeta â€œMinutos esta semanaâ€, y otro con sesiones creadas por el formulario que documente la coincidencia.
    3. Agrega pruebas de payload exacto, descarte de propiedades adicionales, ausencia de escrituras en `diario-estudio-v1`, fallos de adaptador y estados de lectura.
    4. Agrega pruebas de lÃ­mites de semana, cambio de mes y aÃ±o, 29 de febrero, fechas invÃ¡lidas y tipos de minutos.
    5. Ejecuta la suite completa y la del mapa por separado. Si algo falla, corrige solo el mÃ³dulo o la integraciÃ³n implicada y vuelve a ejecutar.
  - **Pruebas automÃ¡ticas**:
    - `node --test`.
    - `node --test tests/heatmap.test.js`.
    - Confirma que las 26 pruebas existentes no se modificaron.
  - **VerificaciÃ³n manual**:
    - Inyecta 10.000 sesiones en `diario-estudio-v1` y comprueba que el cÃ¡lculo es correcto y no hay bloqueo perceptible.
    - Comprueba que la clave de sesiones conserva exactamente su contenido antes y despuÃ©s de fijar, cambiar y quitar el objetivo.
    - Con sesiones heredadas futuras o decimales, documenta la diferencia esperada con â€œMinutos esta semanaâ€ sin migrar ni normalizar datos.
  - **Criterios de aceptaciÃ³n**: la suite cubre integridad, rendimiento, divergencia y casos lÃ­mite; no se cambian expectativas existentes; los datos de sesiones nunca se escriben desde el objetivo.
  - **Hecho cuando**: `node --test` pasa completo, las 26 pruebas del mapa siguen verdes y la regresiÃ³n de divergencia queda documentada en las pruebas y en la verificaciÃ³n manual.

- [x] **T7 â€” Ejecutar la checklist de verificaciÃ³n integral con Chrome DevTools** (45 min)
  - **Objetivo**: verificar de punta a punta la secciÃ³n, la accesibilidad, el responsive, la persistencia, los errores y la integridad con Chrome DevTools, y dejar constancia de los resultados para T8.
  - **Archivos**: ninguno de cÃ³digo; registra los resultados para actualizar `MEMORY.md` en T8.
  - **Depende de**: T6.
  - **RF**: todos; RNF-1 a RNF-7.
  - **Pasos**:
    1. Copia el contenido actual de `diario-estudio-v1` y `diario-estudio-goal-v1` para restaurarlo al final.
    2. Ejecuta la matriz manual de la secciÃ³n 7.2 del plan, en el orden indicado: carga vacÃ­a, carga con objetivo, persistencia, guardar, registrar sesiÃ³n, cumplimiento exacto, superado, validaciÃ³n, quitado, atajos, ciclo del campo, fallos simulados, clave corrupta, sesiones ilegibles con el bloqueo de guardado existente, cambio de semana, 10.000 sesiones, responsive, zoom, teclado, lector, Lighthouse, consola e integridad.
    3. Para el fallo de cuota, parchea `Storage.prototype.setItem` y `Storage.prototype.removeItem`, verifica y restaura.
    4. Para el cambio de semana, usa un `initScript` que desplace `Date` siete dÃ­as o cambia el reloj del sistema; vuelve a la pestaÃ±a y comprueba el reinicio sin perder el objetivo.
    5. Comprueba a 375 px que no hay scroll horizontal y que la barra no se desborda; repite con zoom de texto al 200 %.
    6. Revisa el Ã¡rbol de accesibilidad: nombre de la secciÃ³n, etiqueta del campo, foco, `progressbar` con sus valores, `aria-valuetext` y anuncios sin duplicados.
    7. Ejecuta Lighthouse de accesibilidad en mÃ³vil y escritorio; debe dar 100.
    8. Restaura los datos originales y confirma que la consola no tiene errores no controlados.
  - **Pruebas automÃ¡ticas**: `node --test` antes y despuÃ©s de la verificaciÃ³n; debe seguir en verde.
  - **VerificaciÃ³n manual**: la matriz completa de la secciÃ³n 7.2 del plan. Registra cada resultado y cualquier desviaciÃ³n.
  - **Criterios de aceptaciÃ³n**: todos los puntos de la matriz pasan o quedan documentados con su justificaciÃ³n; Lighthouse de accesibilidad es 100; no hay scroll horizontal a 375 px; los datos se restauran; la consola queda limpia.
  - **Hecho cuando**: la checklist estÃ¡ completa, los resultados quedan anotados para T8 y `node --test` sigue en verde.

- [x] **T8 â€” Actualizar la documentaciÃ³n del proyecto** (20 min)
  - **Objetivo**: reflejar en `AGENTS.md` y `MEMORY.md` la secciÃ³n nueva, el mÃ³dulo, la clave, las reglas, el contrato de integraciÃ³n, los resultados reales de verificaciÃ³n y las dos limitaciones resueltas.
  - **Archivos**: `AGENTS.md`, `MEMORY.md`.
  - **Depende de**: T7.
  - **RF**: transversal; constituciÃ³n.
  - **Pasos**:
    1. En `AGENTS.md`, agrega `weekly-goal.js` y `tests/weekly-goal.test.js` al layout, la clave `diario-estudio-goal-v1`, las reglas de semana/progreso/validaciÃ³n, el ciclo del campo, la propiedad de los anuncios y el contrato de `saveSessions()`.
    2. En `AGENTS.md`, actualiza la secciÃ³n de verificaciÃ³n con la matriz del objetivo, el comando `node --test` y el nÃºmero real de pruebas.
    3. En `MEMORY.md`, registra el estado de la spec 002, lo implementado, la clave nueva, los resultados de `node --test`, la verificaciÃ³n manual, Lighthouse, la diferencia esperada con â€œMinutos esta semanaâ€ y las dos limitaciones aceptadas: el bloqueo de guardado con sesiones ilegibles y el reinicio semanal reflejado en la siguiente recalculaciÃ³n cuando no hay temporizador.
    4. Documenta explÃ­citamente que con sesiones ilegibles el objetivo sigue visible con progreso 0 pero se conserva el bloqueo de `getSessions()`; no afirmes que el formulario permite registrar con sesiones corruptas. Aclara tambiÃ©n que un error de la clave del objetivo no bloquea el registro de sesiones (RF-14).
    5. No crees `README.md`, porque no existe en el proyecto; no inventes archivos de documentaciÃ³n.
  - **Pruebas automÃ¡ticas**: `node --test` como comprobaciÃ³n final.
  - **VerificaciÃ³n manual**: revisa que los documentos no contradigan la spec ni el comportamiento implementado, y que no queden referencias a las â€œ26 pruebasâ€ como total si la suite creciÃ³.
  - **Criterios de aceptaciÃ³n**: `AGENTS.md` y `MEMORY.md` describen el estado real, sin promesas no verificadas ni cambios de alcance.
  - **Hecho cuando**: la documentaciÃ³n estÃ¡ actualizada, `node --test` pasa y no queda ningÃºn pendiente sin registrar.
