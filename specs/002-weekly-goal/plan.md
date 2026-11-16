# Plan 002 — Objetivo semanal

## 1. Alcance y principios

Implementar la spec aprobada `specs/002-weekly-goal/spec.md` sin dependencias, sin build y sin servidor, manteniendo intactos el formulario, las rachas, la tarjeta “Minutos esta semana”, el mapa de actividad y el historial. La única corrección permitida sobre una funcionalidad existente es el contrato de retorno de `saveSessions()`, exigido por RF-10 para no mostrar un éxito falso.

Principios:

- **Lógica pura separada del DOM**: semana, progreso, redondeo, validación, estados y textos viven en un módulo nuevo exportable a navegador y Node. No lee el reloj, el DOM ni `localStorage` global; recibe `today` y un adaptador de almacenamiento.
- **Reutilización obligatoria**: `weekly-goal.js` consume `parseDateKey`, `toDateKey`, `addDays`, `startOfWeekMonday` y `parseMinutes` de `heatmap.js`. No se copian reglas de fecha ni de redondeo.
- **Solo lectura de sesiones**: el objetivo no crea, edita, migra, repara ni elimina sesiones. Nunca escribe en `diario-estudio-v1`.
- **Clave nueva y aislada**: `diario-estudio-goal-v1` guarda únicamente `{ "objetivoMinutos": <entero 1–10080> }`. Se escribe solo tras un guardado o quitado explícito.
- **Fuente de verdad en memoria**: el objetivo se lee una sola vez al cargar y se actualiza solo tras una escritura exitosa. Ningún render vuelve a leer la clave, evitando avisos repetidos y estados inconsistentes.
- **Accesibilidad y responsive**: una sola región `aria-live` para el objetivo, barra con `role="progressbar"` y `aria-valuetext`, foco visible, áreas táctiles de 44 × 44 px, sin depender del color, 375 px sin scroll horizontal y zoom de texto al 200 %.
- **Tuteo y formato**: todos los textos nuevos en español y tuteo; minutos enteros sin decimales ni separador de miles.

## 2. Archivos y responsabilidades

| Archivo | Responsabilidad |
| --- | --- |
| `weekly-goal.js` (nuevo) | Dominio puro: constantes y mensajes, validación del campo, lectura/escritura con adaptador, semana actual, progreso, evaluación de estados, textos accesibles y anuncios. Sin DOM, sin reloj real y sin acceso directo a `localStorage`. Se carga como script clásico y exporta a Node. |
| `tests/weekly-goal.test.js` (nuevo) | Pruebas unitarias con `node:test`: validación, persistencia con adaptadores falsos, semana, redondeo, tipos, estados, textos, anuncios y casos de integridad. Sin DOM ni `localStorage` real. |
| `index.html` | Insertar la sección “Objetivo semanal” entre “Rachas” y “Mapa de actividad”; controles, barra, mensajes y región viva con la estructura y los atributos accesibles. Cargar `weekly-goal.js` después de `heatmap.js` y antes de `app.js`. |
| `styles.css` | Tarjeta, formulario, atajos, barra de progreso, estados, mensajes, foco visible, contraste AA, áreas táctiles, `[hidden]` y responsive a 375 px y zoom 200 %. |
| `app.js` | Integración: referencias del DOM, acceso seguro a `localStorage`, carga única del objetivo, render de estados, guardar/quitar/validar, ciclo de vida del campo, anuncios, recálculo al volver a la pestaña y contrato de `saveSessions()`. |
| `AGENTS.md` y `MEMORY.md` | Actualizar layout, almacenamiento, reglas del objetivo, contrato de integración y verificación según la constitución. |
| `specs/002-weekly-goal/plan.md` y `tasks.md` | Este plan y la lista de tareas. No se modifica la spec salvo el estado aprobado. |

No existe `README.md` en el repositorio; no se crea uno. No se agregan dependencias, `package.json`, bundler, framework de tests ni módulos ES, porque `file://` bloquea `import`.

## 3. Diseño del módulo puro `weekly-goal.js`

### 3.1 Carga y reutilización

Se usa el mismo patrón UMD de `heatmap.js`:

- En Node, `weekly-goal.js` resuelve `require('./heatmap.js')`.
- En el navegador, toma `root.Heatmap`, que ya fue cargado antes por `index.html`.
- Si la dependencia no existe, falla de forma explícita y temprana; no duplica utilidades como respaldo.

Del módulo `Heatmap` se desestructuran y usan directamente:

- `parseDateKey` para validar `AAAA-MM-DD` y detectar fechas inexistentes como `2026-02-30`.
- `toDateKey` para comparar claves locales y construir ventanas.
- `addDays` para calcular el domingo de la semana.
- `startOfWeekMonday` para el lunes local.
- `parseMinutes` para aceptar números o cadenas numéricas con `trim`, redondear con `Math.round` y descartar tipos inválidos, no finitos, ≤ 0 y valores que redondean a 0.

No se reimplementan `startOfWeekMonday`, `parseDateKey` ni el redondeo. Las pruebas verifican que los resultados del objetivo coinciden con esas utilidades para los mismos insumos.

### 3.2 API exportada

| Exportación | Entrada | Salida / responsabilidad |
| --- | --- | --- |
| `GOAL_STORAGE_KEY` | — | `'diario-estudio-goal-v1'`. |
| `MIN_GOAL_MINUTES` / `MAX_GOAL_MINUTES` | — | `1` y `10080`. |
| `GOAL_MESSAGES` | — | Mensajes exactos de validación, fallo, guardado y quitado. |
| `NO_GOAL_TEXTS` | — | Titular e invitación del estado sin objetivo. |
| `STATUS_MET_TEXT` / `PROGRESS_LABEL` | — | `'Objetivo cumplido'` y `'Progreso del objetivo semanal'`. |
| `parseGoalInput(rawValue)` | string crudo del campo | `{ action: 'remove' }`, `{ action: 'invalid', reason: 'format' \| 'range', message }` o `{ action: 'save', value }`. Aplica `trim`, la regla del `0` exacto, `^[0-9]+$` y el rango 1–10080. |
| `isValidGoal(value)` | cualquier valor | `true` solo para enteros de tipo `number` entre 1 y 10080. Rechaza cadenas, decimales, `NaN`, `Infinity`, booleanos, `null`, arrays y objetos. |
| `parseStoredGoal(rawString)` | contenido crudo de la clave o `null` | Entero válido o `null`. Parsea JSON, exige objeto no array, ignora propiedades adicionales y valida `objetivoMinutos` de forma estricta. |
| `readGoal(storage)` | adaptador con `getItem` o `null` | `{ status: 'missing' \| 'valid' \| 'invalid' \| 'unreadable', goal: number \| null }`. No escribe ni avisa por consola. |
| `saveGoal(storage, value)` | adaptador y entero válido | `true` solo si escribe exactamente `{ "objetivoMinutos": value }`. No escribe valores inválidos. Falso si el adaptador falta o lanza. |
| `removeGoal(storage)` | adaptador | `true` solo si elimina la clave. Falso si el adaptador falta o lanza. |
| `getGoalWeek(today)` | `Date` local o inválido | `{ startKey, endKey, todayKey }` o `null` si la fecha no es válida. Lunes a domingo en fecha local. |
| `calculateGoalProgress(sessions, today)` | sesiones y `Date` local | `{ weekStartKey, weekEndKey, todayKey, minutes }`. Recorre las sesiones una sola vez, ignora futuras y fuera de semana, redondea cada una y suma. |
| `evaluateGoal({ goal, minutes })` | objetivo y acumulado | Vista completa: estado, contador, faltante, exceso, porcentaje, textos visibles y datos de `progressbar`. |
| `getSavedAnnouncement(view)` | vista con objetivo | Texto único para la región viva tras guardar: mensaje de éxito más el estado completo del progreso. |
| `getProgressAnnouncement(view)` | vista con objetivo | Texto para la región viva cuando una sesión confirmada cambia el progreso; cadena vacía si no hay objetivo. |

### 3.3 Validación del campo (`parseGoalInput`)

Se aplica sobre el string crudo, en este orden:

1. `trim`.
2. Si queda vacío, devuelve `remove`.
3. Si es exactamente `'0'`, devuelve `remove`.
4. Si no cumple `^[0-9]+$`, devuelve `invalid` con `reason: 'format'` y el mensaje `Ingresa un número entero de minutos mayor que 0.`
5. Convierte a número. Si no es entero, es menor que 1 o mayor que 10080, devuelve `invalid` con `reason: 'range'` y el mensaje `El objetivo debe estar entre 1 y 10080 minutos.`
6. En cualquier otro caso, devuelve `save` con el entero normalizado.

Consecuencias cerradas:

- `' 0 '` quita; `'00'`, `'000'` y cualquier representación de cero que no sea el texto exacto `'0'` se rechazan por rango.
- `'0120'`, `'0001'` y `' 120 '` son válidos y se normalizan a `120` y `1`.
- Letras, signos, decimales, separadores de miles, notación exponencial y espacios internos son errores de formato.
- Un valor inválido nunca se interpreta como vacío ni quita el objetivo.
- El texto inválido se conserva en el campo; no se normaliza ni se recorta visualmente.

### 3.4 Semana y progreso

Pseudocódigo:

```text
FUNCIÓN getGoalWeek(today):
    SI today no es Date válida ENTONCES DEVOLVER null
    hoy = medianoche local de today
    lunes = startOfWeekMonday(hoy)
    domingo = addDays(lunes, 6)
    DEVOLVER {
        startKey: toDateKey(lunes),
        endKey: toDateKey(domingo),
        todayKey: toDateKey(hoy)
    }

FUNCIÓN calculateGoalProgress(sessions, today):
    semana = getGoalWeek(today)
    SI semana es null ENTONCES DEVOLVER minutos 0 y claves null
    SI sessions no es array ENTONCES DEVOLVER minutos 0 y claves de la semana
    hoy = medianoche local de today
    total = 0
    PARA cada sesión EN sessions:
        SI sesión no es objeto, es null o es array ENTONCES continuar
        fecha = parseDateKey(sesión.fecha)
        SI fecha es null ENTONCES continuar
        SI fecha < lunes DE LA SEMANA O fecha > domingo DE LA SEMANA ENTONCES continuar
        SI fecha > hoy ENTONCES continuar
        minutos = parseMinutes(sesión.minutos)
        SI minutos es null ENTONCES continuar
        total = total + minutos
    DEVOLVER { ...semana, minutes: total }
```

Reglas cerradas:

- La comparación es por fecha local a medianoche, nunca por UTC ni por `new Date('AAAA-MM-DD')`.
- La sesión de hoy cuenta; una sesión futura dentro de la misma semana no cuenta y no se borra.
- Varias sesiones del mismo día se suman después de redondear cada una.
- `0,4` redondea a 0 y no suma; `29,4`, `29,5` y `29,6` suman 29, 30 y 30.
- Cadenas numéricas con espacios exteriores se aceptan por `parseMinutes`; booleanos, `null`, arrays, objetos, cadenas vacías y no numéricas se ignoran.
- Fechas con formato incorrecto o inexistente se ignoran.
- Una entrada que no sea objeto se ignora.
- Si no hay sesiones válidas, el progreso es 0.
- La función no muta el array ni las sesiones.

### 3.5 Evaluación de estados y textos

`evaluateGoal({ goal, minutes })` devuelve:

- `state`: `'no-goal'`, `'in-progress'`, `'met'` o `'exceeded'`.
- `goal`, `minutes`, `remaining`, `excess`, `percent`.
- `statusTitle`, `counterText`, `remainingText`, `excessText`.
- `progress`: `null` sin objetivo; con objetivo, `{ valueMin: 0, valueMax: goal, valueNow: min(minutes, goal), valueText }`.

| Condición | Estado | Textos visibles | `aria-valuetext` |
| --- | --- | --- | --- |
| Sin objetivo válido | `no-goal` | “Aún no tienes objetivo semanal” y “Fija cuántos minutos quieres estudiar esta semana.”; sin contador ni barra | No aplica; no hay `progressbar` |
| `X < Y` | `in-progress` | `X / Y min` y `Faltan Z min`; si `Z = 1`, `Falta 1 min` | `X de Y minutos; faltan Z minutos`; si `Z = 1`, `X de Y minutos; falta 1 minuto` |
| `X = Y` | `met` | `X / Y min` y `Objetivo cumplido`; sin exceso y sin `+0 min` | `X de Y minutos; objetivo cumplido` |
| `X > Y` | `exceeded` | `X / Y min`, `Objetivo cumplido` y `+N min` | `X de Y minutos; objetivo cumplido; N minutos de exceso`; con `N = 1`, `1 minuto de exceso` |

Decisiones cerradas:

- `percent` es `X / Y`, limitado como máximo a 100; el contador y `aria-valuetext` conservan el acumulado real.
- `valueNow` es `min(X, Y)`; `valueMax` es `Y`; `valueMin` es 0.
- `X = 0` y objetivo existente produce `0 / Y min`, barra vacía y `Faltan Y min`.
- Sin objetivo no se calcula porcentaje, no se divide por cero y no se expone `progress`.
- Los minutos se formatean con `String`, sin decimales ni separador de miles.
- El exceso de 1 minuto se expresa en singular; el resto, en plural.
- El titular “Objetivo cumplido” se usa tanto en el cumplimiento exacto como en el superado.

### 3.6 Persistencia y adaptador

El adaptador tiene la forma `{ getItem(key), setItem(key, value), removeItem(key) }`. Puede ser `localStorage` o un objeto falso en pruebas.

`readGoal(storage)`:

| Situación | `status` | `goal` |
| --- | --- | --- |
| Adaptador ausente o sin `getItem` | `unreadable` | `null` |
| `getItem` lanza | `unreadable` | `null` |
| Devuelve `null` o `undefined` | `missing` | `null` |
| JSON inválido, `null`, array, cadena, número, objeto sin `objetivoMinutos` o valor inválido | `invalid` | `null` |
| Objeto con `objetivoMinutos` entero entre 1 y 10080 | `valid` | entero |
| Objeto con propiedades adicionales y `objetivoMinutos` válido | `valid` | entero; las demás se ignoran |

`saveGoal(storage, value)`:

- Rechaza valores que no cumplan `isValidGoal` sin escribir.
- Escribe exactamente `JSON.stringify({ objetivoMinutos: value })`, sin propiedades adicionales.
- Devuelve `false` si el adaptador falta, no tiene `setItem` o lanza.
- Solo toca `GOAL_STORAGE_KEY`.

`removeGoal(storage)`:

- Llama a `removeItem(GOAL_STORAGE_KEY)`.
- Devuelve `false` si el adaptador falta, no tiene `removeItem` o lanza.
- La ausencia posterior de la clave es un estado `missing`, no un error.

El módulo no registra avisos. `app.js` decide el aviso único por carga según el `status` devuelto.

## 4. Diseño de la UI

### 4.1 Ubicación y estructura

La sección se inserta en `index.html` inmediatamente después del cierre de `.streaks-section` y antes de `.heatmap-section`, sin mover las demás secciones.

Esquema de la sección:

```html
<section class="goal-section" id="goalSection" aria-labelledby="goal-title">
  <h2 id="goal-title" class="section-title">Objetivo semanal</h2>

  <div class="goal-status">
    <p class="goal-status-title" id="goalStatusTitle">Aún no tienes objetivo semanal</p>
    <p class="goal-hint" id="goalHint">Fija cuántos minutos quieres estudiar esta semana.</p>
  </div>

  <div class="goal-progress" id="goalProgress" hidden>
    <p class="goal-counter" id="goalCounter"></p>
    <div class="goal-progress-track" id="goalProgressBar"
         role="progressbar"
         aria-label="Progreso del objetivo semanal"
         aria-valuemin="0" aria-valuemax="0" aria-valuenow="0" aria-valuetext="">
      <span class="goal-progress-fill" id="goalProgressFill" aria-hidden="true"></span>
    </div>
    <p class="goal-remaining" id="goalRemaining"></p>
    <p class="goal-excess" id="goalExcess" hidden></p>
  </div>

  <form class="goal-form" id="goalForm" novalidate>
    <div class="form-group">
      <label for="goalMinutes">Objetivo en minutos</label>
      <input type="text" id="goalMinutes" name="goalMinutes" inputmode="numeric"
             autocomplete="off" aria-describedby="goalMessage" placeholder="Ej. 300">
    </div>
    <button type="submit" class="submit-btn">Guardar objetivo</button>
  </form>

  <div class="goal-shortcuts" role="group" aria-label="Atajos de objetivo">
    <button type="button" class="goal-shortcut" data-goal-minutes="120">120 min</button>
    <button type="button" class="goal-shortcut" data-goal-minutes="300">300 min</button>
    <button type="button" class="goal-shortcut" data-goal-minutes="600">600 min</button>
  </div>

  <p class="goal-message" id="goalMessage" role="status"
     aria-live="polite" aria-atomic="true"></p>
</section>
```

Decisiones cerradas:

- El HTML inicial ya muestra el estado sin objetivo y mantiene `#goalProgress` oculto; la sección nunca queda vacía si el JavaScript tarda o falla.
- El campo es `type="text"` con `inputmode="numeric"`, nunca `type="number"`, para controlar la gramática sin validación nativa.
- El formulario usa `novalidate`.
- Los atajos son `type="button"` y viven fuera del formulario para no enviarlo por accidente.
- La única región viva de la sección es `#goalMessage`; la barra no tiene `aria-live`.
- `#goalMessage` es visible y también el destino de `aria-describedby` del campo, de modo que los errores quedan asociados.
- La barra es un `div` con `role="progressbar"`; no se usa `<progress>` para controlar con exactitud `aria-valuemin`, `aria-valuemax`, `aria-valuenow` y `aria-valuetext`.
- Los controles nuevos tienen al menos 44 px de alto; los atajos se envuelven cuando no caben.

### 4.2 Render por estado

| Estado | `#goalStatusTitle` | `#goalHint` | `#goalCounter` | `#goalProgress` | `#goalRemaining` | `#goalExcess` |
| --- | --- | --- | --- | --- | --- | --- |
| Sin objetivo | “Aún no tienes objetivo semanal” | Visible | Oculto | Oculto | Oculto | Oculto |
| En curso | Oculto | Oculto | `X / Y min` | Visible | `Faltan Z min` o `Falta 1 min` | Oculto |
| Cumplido exacto | `Objetivo cumplido` | Oculto | `X / Y min` | Visible al 100 % | Oculto | Oculto |
| Superado | `Objetivo cumplido` | Oculto | `X / Y min` | Visible al 100 % | Oculto | `+N min` |

Al mostrar la barra se fijan primero todos los atributos y después se quita `hidden`. Al pasar a sin objetivo se oculta la barra; un elemento con `hidden` no se expone con rol `progressbar`. El relleno usa `style.width = percent + '%'` y `aria-hidden="true"`.

### 4.3 Propiedad de los anuncios

| Evento | Región `#formMessage` | Región `#goalMessage` |
| --- | --- | --- |
| Carga inicial | Sin cambios | Vacía; no anuncia |
| Guardar sesión exitoso | “Sesión guardada correctamente” | Si hay objetivo y cambió el progreso: `Progreso del objetivo: X de Y minutos; …` |
| Guardar sesión fallido | Error existente del formulario | Nada; no recalcula ni anuncia |
| Guardar objetivo exitoso | Nada | `Objetivo semanal guardado.` más el `aria-valuetext` del progreso |
| Quitar objetivo exitoso | Nada | `Objetivo semanal eliminado.` |
| Error de formato o rango | Nada | Mensaje exacto de validación |
| Fallo de guardado o quitado | Nada | `No se pudo actualizar el objetivo. Se mantiene el valor anterior.` |
| Cambio de progreso por volver a la pestaña o foco | Nada | Nada; actualización silenciosa |
| Pulsación del campo mientras se escribe | Nada | Nada |
| Guardado repetido del mismo valor | Nada | Nada; no se reescribe el mismo texto |

Reglas cerradas:

- No se anuncia “Sesión guardada correctamente” en la región del objetivo ni el progreso en la del formulario.
- Cada evento produce como máximo un texto nuevo en `#goalMessage`; si el texto es idéntico al actual, no se vuelve a asignar.
- El mensaje de éxito del objetivo incluye el estado del progreso para cumplir el requisito de anunciar ambos cambios en una sola lectura.
- Los mensajes de éxito y error usan texto visible; el color es un refuerzo, no la única señal.
- Los errores de validación marcan `aria-invalid="true"` y devuelven el foco al campo. Los errores de almacenamiento no marcan el campo como inválido, porque el valor puede ser correcto aunque no se haya persistido.

### 4.4 Ciclo de vida del campo

| Momento | Valor del campo | `aria-invalid` | ¿Escribe storage? |
| --- | --- | --- | --- |
| Carga con objetivo válido | Entero canónico como texto | `false` | No |
| Carga sin objetivo, inválido o ilegible | Vacío | `false` | No |
| Guardado exitoso | Valor guardado, canónico | `false` | Sí, explícito |
| Guardado fallido | Texto intentado, tal como quedó | `false` | Se intentó, falló |
| Quitado exitoso | Vacío | `false` | Sí, elimina la clave |
| Quitado fallido | Objetivo vigente, canónico | `false` | Se intentó, falló |
| Entrada inválida | Texto inválido intacto | `true` | No |
| Guardar sesión | Sin cambios; se conserva el borrador | Sin cambios | No toca la clave del objetivo |
| Volver a la pestaña o foco | Sin cambios | Sin cambios | No |

El campo solo se actualiza al cargar, tras guardar o quitar el objetivo, o ante un error. `renderGoal()` nunca escribe `goalInput.value`. Un valor vacío mostrado por el sistema no dispara el quitado; solo lo hace un envío explícito del formulario o un atajo.

### 4.5 Estilos y accesibilidad

- `.goal-section` reutiliza la tarjeta blanca, borde y sombra de las secciones existentes.
- `.goal-progress-track` ocupa como máximo el 100 % del contenedor, con altura de 0.75 rem, fondo gris y `overflow: hidden`.
- `.goal-progress-fill` usa el azul primario; en estado cumplido puede usar un verde oscuro, pero el texto “Objetivo cumplido” sigue siendo la señal principal.
- `.goal-message` usa colores con contraste AA sobre blanco: verde oscuro para éxito y rojo oscuro para error, sin reutilizar el verde claro de `.form-message.success` que no cumple AA para texto.
- `.goal-shortcut` y el botón de guardar tienen `min-height: 44px`; el campo también alcanza 44 px.
- Foco visible en campo, botón y atajos con el mismo lenguaje de `box-shadow`/outline de la app.
- `[hidden]` se refuerza con `.goal-progress[hidden] { display: none; }` y `.goal-excess[hidden] { display: none; }` para que un `display` explícito no anule el atributo.
- `.goal-message` usa `overflow-wrap: anywhere` y no `white-space: nowrap`.
- A 375 px, el formulario se apila, los atajos se envuelven y ningún elemento tiene ancho fijo mayor que el contenedor.
- Con zoom de texto al 200 %, todo sigue siendo operable y legible; se usan `rem` y `flex-wrap`.

## 5. Integración en `app.js`

### 5.1 Estado y utilidades

Variables nuevas:

- `currentGoal`: entero válido o `null`; única fuente de verdad durante la sesión.
- `goalWarningShown`: garantiza un solo `console.warn` por carga.
- `lastGoalSignature`: `weekStartKey + ':' + minutes` para detectar cambios reales y evitar anuncios y escrituras DOM innecesarias.

Funciones nuevas:

- `getGoalStorage()`: intenta obtener `window.localStorage`; si el acceso lanza, devuelve `null` para que el módulo lo trate como ilegible.
- `warnGoalReadOnce(error)`: registra exactamente un `console.warn` por carga con el mensaje de que el objetivo no se pudo leer y no se sobrescribe.
- `renderGoal(view)`: actualiza título, pista, contador, barra, restante, exceso y clases. No lee storage ni modifica el campo.
- `setGoalField(value)`: único punto que escribe `goalInput.value`, salvo el valor inicial vacío del HTML.
- `showGoalMessage(text, type)`: actualiza `#goalMessage` y su clase; si el texto es idéntico, no reasigna.
- `refreshGoal({ announceProgress })`: lee sesiones, calcula progreso con `new Date()`, evalúa el estado, actualiza el DOM si cambió la firma y, solo si corresponde, anuncia.
- `applyGoalSave(value)`: guarda un objetivo ya validado y centraliza éxito, fallo y ciclo del campo.
- `handleGoalSubmit(event)` y `handleGoalShortcut(event)`.

`renderGoal(view)` no toca el campo y `refreshGoal()` no vuelve a leer la clave del objetivo. Esto evita pisar borradores y avisos repetidos.

### 5.2 Carga inicial

1. Obtener el adaptador seguro.
2. Llamar una sola vez a `WeeklyGoal.readGoal(storage)`.
3. Si el estado es `invalid` o `unreadable`, llamar a `warnGoalReadOnce`. Si es `missing` o `valid`, no avisar.
4. Asignar `currentGoal` y llamar a `setGoalField`.
5. Renderizar el estado con `refreshGoal({ announceProgress: false })`.
6. No anunciar nada en la región viva durante la carga.

La lectura del objetivo es independiente de la lectura de sesiones. Un fallo de sesiones no invalida el objetivo ni borra su clave.

### 5.3 Guardar y quitar el objetivo

Flujo del formulario:

1. Prevenir el envío.
2. Llamar a `parseGoalInput(goalInput.value)`.
3. Si es `remove`:
   - Si no hay objetivo vigente, dejar el campo vacío y no escribir, no anunciar ni cambiar el estado; es un quitado idempotente sin efecto.
   - Si hay objetivo, llamar a `removeGoal(storage)`.
   - Si falla: conservar `currentGoal`, mostrar el error de almacenamiento, poner el objetivo vigente en el campo y mantener el progreso anterior.
   - Si funciona: `currentGoal = null`, vaciar el campo, renderizar sin objetivo y anunciar “Objetivo semanal eliminado.”.
4. Si es `invalid`:
   - No tocar `currentGoal`, el progreso ni el storage.
   - Conservar el texto inválido, marcar `aria-invalid="true"`, mostrar el mensaje exacto y enfocar el campo.
5. Si es `save`:
   - Si `value === currentGoal`, normalizar el campo al entero canónico y no escribir, no mostrar mensaje ni anunciar; el guardado repetido es idempotente.
   - Si es distinto, llamar a `saveGoal(storage, value)`.
   - Si falla: conservar `currentGoal` y el progreso, dejar el texto intentado en el campo, mostrar el error de almacenamiento y registrar un `console.error` controlado.
   - Si funciona: `currentGoal = value`, poner el valor canónico en el campo, renderizar y anunciar el éxito con el estado del progreso.

Los atajos usan el mismo flujo de guardado: actualizan el campo con su valor, ejecutan `applyGoalSave(value)` en la misma acción y anuncian “Objetivo semanal guardado.” si el valor es distinto del vigente. No requieren un segundo clic.

El guardado y el quitado no piden confirmación modal, no borran sesiones y no recalculan rachas, historial, minutos semanales ni mapa.

### 5.4 Integración con el guardado de sesiones

`saveSessions(sessions)` pasa a devolver un booleano:

- `true` solo después de que `localStorage.setItem(STORAGE_KEY, ...)` termine sin lanzar.
- `false` en el `catch`, manteniendo el `console.error` y el mensaje de error existente del formulario.

El manejador del formulario de sesión:

1. Mantiene todas las validaciones actuales y el bloqueo de fechas futuras.
2. Mantiene la comprobación de `storageReadFailed`.
3. Obtiene `const saved = saveSessions(sessions)`.
4. Si `saved` es falso, retorna antes de mostrar “Sesión guardada correctamente”, antes de limpiar el formulario y antes de recalcular cualquier vista. No toca el campo de objetivo.
5. Si `saved` es verdadero, muestra el éxito, limpia materia/tema/minutos, actualiza historial, rachas, minutos semanales, mapa y luego llama a `refreshGoal({ announceProgress: true })`.

`refreshGoal` no escribe el campo de objetivo, por lo que un borrador no guardado se conserva al registrar una sesión.

### 5.5 Actualización reactiva y cambio de semana

- Se agrega `document.addEventListener('visibilitychange', ...)`: si `document.visibilityState === 'visible'`, llama a `refreshGoal({ announceProgress: false })`.
- Se agrega `window.addEventListener('focus', ...)` con la misma recalculación silenciosa.
- Cada recalculación usa `new Date()` en ese momento; no se guarda una fecha de carga.
- La firma `weekStartKey:minutes` evita reescribir el DOM cuando nada cambió y evita anuncios por guardar sesiones fuera de la semana.
- Si cambió la semana, la nueva firma actualiza el contador, la barra y el restante con el progreso reiniciado; el objetivo se conserva.
- No se agrega temporizador de medianoche ni sincronización entre pestañas.
- No se anuncia el cambio de progreso producido por `focus` o `visibilitychange`, porque la spec solo exige anunciar los cambios producidos por guardar una sesión o por guardar o quitar el objetivo.

### 5.6 Manejo de errores

- La lectura del objetivo se encapsula una sola vez; un fallo de `getItem` o del acceso a `localStorage` produce estado sin objetivo y un único `console.warn`, sin sobrescribir.
- Un fallo de escritura del objetivo o de quitado produce el mensaje exacto, conserva el objetivo anterior, deja el campo en el valor indicado y registra un `console.error` controlado.
- Un fallo de lectura de sesiones mantiene el objetivo, muestra progreso 0 y no escribe ni borra la clave del objetivo.
- Un fallo de guardado de sesión no muestra éxito, no recalcula el objetivo, no limpia el formulario y no toca el campo de objetivo.
- La consola no debe tener excepciones no controladas en carga, guardado de sesión, edición, quitado, validación ni datos corruptos controlados.

## 6. Persistencia

### 6.1 Lectura

- La clave se lee una sola vez por carga.
- `missing` no genera `console.warn`.
- `valid` no genera `console.warn` y usa `objetivoMinutos`.
- `invalid` y `unreadable` generan exactamente un `console.warn` por carga, muestran el estado sin objetivo y no sobrescriben el valor original.
- Las propiedades adicionales se ignoran al leer.
- Una cadena numérica en `objetivoMinutos` es inválida, aunque represente un entero.
- No se repara, migra ni reescribe el contenido inválido hasta una acción explícita.

### 6.2 Escritura y eliminación

- Solo `saveGoal` escribe, y solo con `{ "objetivoMinutos": <entero> }`; descarta cualquier propiedad adicional.
- Solo `removeGoal` elimina la clave.
- La carga, el render, el foco, la visibilidad y el guardado de sesiones no escriben en la clave del objetivo.
- Nunca se escribe, migra, repara ni elimina `diario-estudio-v1`.
- Un fallo de escritura o eliminación no cambia `currentGoal` ni el progreso mostrado.
- Un guardado explícito puede reemplazar un valor inválido previamente existente; es la única vía de corrección permitida.

### 6.3 Fallos simulados

- Cuota o permisos: `setItem`/`removeItem` lanzan; la función devuelve `false`.
- `localStorage` inaccesible: el adaptador es `null`; lectura `unreadable`, escritura `false`.
- La app muestra el mensaje de error y conserva el objetivo vigente.
- La clave de sesiones permanece byte a byte igual antes y después de las operaciones del objetivo.

## 7. Estrategia de pruebas

### 7.1 Pruebas automáticas con `node --test`

Archivo `tests/weekly-goal.test.js`. Se usan fechas locales fijas como `new Date(2026, 10, 5)` y adaptadores falsos; no se depende del reloj ni del almacenamiento real.

**Validación del campo**

- `''`, `'   '`, `'0'` y `' 0 '` devuelven `remove`.
- `'1'` y `'10080'` devuelven `save`.
- `'0120'`, `'0001'` y `' 120 '` devuelven el entero normalizado.
- `'00'`, `'000'`, `'10081'` y una cadena enorme de dígitos devuelven `range` con el mensaje exacto.
- `'abc'`, `'12a'`, `'+120'`, `'-120'`, `'120.5'`, `'1,200'`, `'1e2'` y `'1 200'` devuelven `format` con el mensaje exacto.
- Un valor inválido conserva su texto y no produce una acción `remove`.

**Validación y persistencia almacenada**

- `objetivoMinutos` con `1` y `10080` es válido.
- `0`, `10081`, `1.5`, `"120"`, `null`, `true`, arrays, objetos sin la propiedad, JSON inválido y `"null"` son inválidos.
- Un objeto con propiedades adicionales y `objetivoMinutos` válido es válido y usa solo esa propiedad.
- `readGoal` distingue `missing`, `valid`, `invalid` y `unreadable`; `missing` no es un error.
- `saveGoal` escribe exactamente el JSON canónico, no escribe valores inválidos y devuelve `false` si `setItem` lanza.
- `removeGoal` elimina la clave y devuelve `false` si `removeItem` lanza.
- Los adaptadores registran las claves usadas y nunca aparece `diario-estudio-v1` en escrituras del objetivo.

**Semana y progreso**

- Con `today = new Date(2026, 10, 5)` (jueves), la semana es `2026-11-02` a `2026-11-08` y `todayKey` es `2026-11-05`.
- Sesión del lunes incluida; sesión de hoy incluida; sesión del viernes o del domingo futuro excluida; domingo incluido cuando `today` es domingo.
- Sesión del domingo anterior y del lunes siguiente excluidas.
- Varias sesiones el mismo día se suman después de redondear cada una.
- Decimales `29.4`, `29.5`, `29.6` y `0.4`; `0.4` no suma.
- Tipos admitidos y rechazados: números, cadenas numéricas con espacios, booleanos, `null`, arrays, objetos, cadenas vacías y no numéricas.
- Fechas inválidas como `2026-02-30` y formatos incorrectos se ignoran.
- Sin sesiones, sesiones no array y sesiones todas inválidas producen 0.
- La semana cruza mes y año; el 29 de febrero de un año bisiesto se ubica correctamente.
- 10.000 sesiones producen el total correcto sin mutar el array.

**Estados, textos y anuncios**

- Sin objetivo: `no-goal`, sin `progress`, sin contador y sin división por cero.
- `0 / 300`: `0 / 300 min`, `Faltan 300 min`, `valuenow` 0.
- `120 / 300`: `Faltan 180 min`, porcentaje 40.
- `299 / 300`: `Falta 1 min`.
- `300 / 300`: `Objetivo cumplido`, sin exceso, sin `+0 min`, porcentaje 100.
- `301 / 300`: `Objetivo cumplido`, `+1 min`, `valuenow` 300 y `aria-valuetext` con 1 minuto de exceso.
- `600 / 300`: `+300 min`, barra al 100 % y acumulado real en el contador.
- Los minutos se muestran sin decimales ni separador de miles.
- El anuncio de guardado contiene el mensaje exacto y el estado del progreso; el anuncio de progreso devuelve cadena vacía sin objetivo.
- La reutilización se comprueba comparando con `Heatmap.parseMinutes` y `Heatmap.startOfWeekMonday` para los mismos insumos.

**Regresión**

- Las 26 pruebas de `tests/heatmap.test.js` siguen pasando sin cambios.
- Un fixture con sesiones heredadas futuras o decimales documenta que el progreso del objetivo difiere de la tarjeta “Minutos esta semana”, que incluye futuras y no redondea.
- Un fixture con sesiones creadas por el formulario (enteras y no futuras) documenta que ambos cálculos coinciden.
- `node --test` ejecuta ambos archivos y queda en verde.

### 7.2 Matriz de verificación manual con Chrome DevTools

Antes de empezar, copia el contenido de `diario-estudio-v1` y `diario-estudio-goal-v1` para restaurarlo al final.

1. **Carga vacía**: sin sesiones y sin clave de objetivo, la sección aparece entre “Rachas” y “Mapa de actividad”, muestra el estado sin objetivo, el campo vacío y los controles; no hay `progressbar` expuesto ni `console.warn`.
2. **Carga con objetivo**: con `{"objetivoMinutos":300}`, el campo muestra `300`, el contador `0 / 300 min`, “Faltan 300 min” y la barra vacía; no hay warning.
3. **Persistencia**: recarga y comprueba que el objetivo y el progreso se mantienen.
4. **Guardar objetivo**: guarda `300`; el storage contiene exactamente `{"objetivoMinutos":300}`, el campo muestra `300`, el mensaje es “Objetivo semanal guardado.” y no se toca `diario-estudio-v1`.
5. **Registrar hoy**: guarda una sesión de 120 minutos; el objetivo pasa a `120 / 300 min`, “Faltan 180 min”, y la tarjeta “Minutos esta semana” coincide porque la sesión es entera y no futura.
6. **Cumplimiento exacto**: completa 300; aparece “Objetivo cumplido”, no aparece “Faltan”, no aparece `+0 min`, la barra está al 100 % y `aria-valuenow` es 300.
7. **Superado**: añade 1 minuto; aparece `+1 min`, el contador conserva `301 / 300 min`, la barra sigue al 100 % y `aria-valuenow` sigue en 300.
8. **Validación**: prueba `abc`, `+120`, `-120`, `120.5`, `1,200`, `1e2`, `1 200`, `00` y `10081`; el mensaje corresponde al formato o al rango, el campo conserva el texto, `aria-invalid` es verdadero, el foco vuelve al campo y el objetivo y el storage no cambian. Prueba `0120` y ` 120 `; se guardan como 120.
9. **Quitar**: envía vacío y luego `0`; la clave desaparece, el estado vuelve a sin objetivo, el campo queda vacío y se anuncia “Objetivo semanal eliminado.”. Recarga: no hay warning.
10. **Atajos**: pulsa 120, 300 y 600; cada uno guarda en una sola acción y anuncia el éxito. Repite el mismo valor: no hay segundo mensaje ni segunda escritura.
11. **Ciclo del campo**: comprueba valor al cargar, valor guardado tras guardar, vacío tras quitar, texto intentado tras fallo de guardado, objetivo vigente tras fallo de quitado y borrador conservado al guardar una sesión.
12. **Fallo de guardado de objetivo**: simula cuota con `Storage.prototype.setItem` y verifica el mensaje exacto, el objetivo anterior conservado, el texto intentado en el campo y un `console.error` controlado; restaura el método.
13. **Fallo de quitado**: simula `removeItem`; verifica el mensaje exacto, el objetivo vigente y el campo con ese objetivo.
14. **Fallo de guardado de sesión**: simula `setItem` para `diario-estudio-v1`; no debe aparecer “Sesión guardada correctamente”, no debe recalcularse el objetivo, no debe limpiarse el formulario, no debe tocarse el borrador del objetivo y las sesiones almacenadas deben quedar iguales.
15. **Clave de objetivo corrupta**: prueba JSON inválido, `null`, array, cadena, objeto sin `objetivoMinutos`, `objetivoMinutos` como cadena, `0` y `10081`; cada carga muestra el estado sin objetivo, un solo `console.warn` y el valor original intacto. Prueba propiedades adicionales válidas: se usa el objetivo y no hay warning; un guardado explícito posterior deja solo `objetivoMinutos`.
16. **Sesiones ilegibles**: con un JSON de sesiones inválido, el objetivo sigue visible y usable, el progreso es 0 y la clave del objetivo no se toca. Comprueba que el guardado de sesiones mantiene el bloqueo existente de `getSessions()` y que no se sobrescriben datos. Registra la decisión resuelta de la sección 10.
17. **Cambio de semana**: con un `initScript` que desplace `Date` siete días o cambiando el reloj del sistema, vuelve a la pestaña; el objetivo se conserva y el progreso se reinicia. No debe depender de una fecha capturada al abrir.
18. **10.000 sesiones**: inyecta el volumen en `diario-estudio-v1`; el cálculo es correcto y no hay bloqueo perceptible ni un nodo del DOM por sesión.
19. **Responsive**: a 375 px no hay scroll horizontal, el formulario se apila, los atajos se envuelven y la barra no se desborda.
20. **Zoom 200 %**: el texto sigue legible y los controles operables.
21. **Teclado y lector**: Tab recorre campo, botón y atajos con foco visible; el campo tiene etiqueta; la barra se lee con `aria-valuetext`; las regiones anuncian lo que corresponde sin duplicados; no se anuncia cada pulsación.
22. **Lighthouse**: accesibilidad 100 en móvil y escritorio.
23. **Consola**: sin errores no controlados durante carga, guardado de sesión, edición, quitado, validación, datos corruptos y fallos simulados.
24. **Integridad**: compara `diario-estudio-v1` antes y después de todas las operaciones del objetivo; debe ser idéntico. Restaura los datos originales.

## 8. Riesgos y mitigaciones

| Riesgo | Mitigación |
| --- | --- |
| Doble clic, doble Enter o atajo repetido | El guardado compara con `currentGoal`; si el valor es el mismo no escribe, no muestra mensaje y no anuncia. La escritura es síncrona y la UI se actualiza solo tras el éxito. |
| Cuota o permisos simulados | `saveGoal`/`removeGoal` capturan la excepción y devuelven `false`; la app conserva el objetivo anterior, deja el campo según el caso y muestra el mensaje exacto. |
| Sesiones heredadas futuras o decimales | El objetivo las ignora y redondea; la tarjeta “Minutos esta semana” no se modifica. La diferencia se documenta con un fixture de regresión. |
| Cambio de semana con la pestaña siempre visible | No hay temporizador por estar fuera de alcance; el progreso se actualiza en la siguiente recalculación por `visibilitychange`, `focus`, guardado o recarga. Es una limitación aceptada por la spec. |
| `saveSessions()` cambia de contrato | Solo hay un punto de llamada; se actualiza el manejador para condicionar éxito, limpieza y recálculo al booleano. Las validaciones y el esquema no cambian. |
| Avisos repetidos por lectura inválida | El objetivo se lee una sola vez al cargar y se conserva en memoria; `refreshGoal` no relee la clave. `goalWarningShown` refuerza el único aviso. |
| Mensajes o anuncios duplicados | Una sola región viva para el objetivo; `showGoalMessage` no reasigna el mismo texto; no se anuncia al escribir, al enfocar ni al volver a la pestaña. |
| División por cero o “0 / 0 min” | Sin objetivo no se calcula porcentaje ni se muestra el contenedor de progreso; el objetivo válido siempre es ≥ 1. |
| `[hidden]` anulado por `display` | Se agregan reglas explícitas `.goal-progress[hidden]` y `.goal-excess[hidden]`. |
| Contraste insuficiente en mensajes | No se reutiliza el verde claro existente; se usan tonos oscuros con contraste AA y texto visible como señal principal. |
| Acceso a `localStorage` que lanza al obtenerlo | `getGoalStorage()` captura el error y devuelve `null`; el módulo lo trata como `unreadable` y la escritura falla de forma controlada. |
| `parseInt` aceptaría texto parcial | La validación usa primero `^[0-9]+$` y luego convierte; no se usa `parseInt` para decidir la validez. |
| Pruebas dependientes de la zona horaria | Se usan fechas locales construidas con `new Date(año, mes - 1, día)` y comparaciones por claves locales. |
| Coste con 10.000 sesiones | Una sola pasada, sin nodos DOM por sesión; render de un número fijo de elementos. |

## 9. Alternativas descartadas

| Alternativa | Motivo de descarte |
| --- | --- |
| Guardar el objetivo dentro de `diario-estudio-v1` | Mezcla datos y arriesga el esquema de sesiones; la spec exige una clave nueva y separada. |
| Duplicar `startOfWeekMonday` o el redondeo en el módulo nuevo | Rompe la reutilización exigida y permite divergencias entre mapa y objetivo. |
| Usar `<progress>` nativo | Controla mal `aria-valuetext` y los valores dinámicos; la spec exige atributos exactos y nombre accesible propio. |
| Agregar una segunda región viva oculta solo para progreso | La spec pide una región para el formulario y otra para el objetivo; una tercera aumenta el riesgo de anuncios duplicados. |
| Temporizador de medianoche | Está fuera de alcance; la spec define la recalculación por eventos. |
| Persistir el progreso calculado | Es un dato derivado; se desincroniza y arriesga la integridad del almacenamiento. |
| Anunciar cada pulsación del campo | La spec lo prohíbe y satura al lector de pantalla. |

## 10. Riesgos y decisiones resueltas

1. **Sesiones ilegibles y registro de sesiones — RESUELTA (opción A)**: se mantiene el bloqueo de guardado existente cuando `getSessions()` no puede leer el array, para no sobrescribir los datos originales. La sección de objetivo sigue visible y usable con progreso 0, sin borrar ni sobrescribir sesiones. No se cambia `saveSessions()` ni la validación del formulario de sesiones por este caso. La contradicción de la spec quedó corregida en el criterio de finalización, el caso límite y la decisión resuelta. T7 verifica y registra esta limitación real, y T8 la documenta en `AGENTS.md` y `MEMORY.md`.
2. **Pestaña siempre visible durante el cambio de semana — RESUELTA (sí, limitación aceptada)**: sin temporizador de medianoche, el progreso se actualiza en la siguiente recalculación por `visibilitychange`, `focus`, guardado o recarga. Si la pestaña nunca pierde el foco, el reinicio semanal puede verse recién en la próxima interacción. Es una limitación aceptada y alineada con RF-10 y con “Fuera de alcance”. No se amplía el alcance ni se agregan temporizadores. T8 la documenta explícitamente en `MEMORY.md`.

No hay decisiones abiertas ni contradicciones pendientes. Las decisiones menores quedan cerradas en este plan: quitado sin objetivo como no-op silencioso, guardado repetido sin mensaje, mensajes que persisten hasta la próxima acción, una sola región viva visible para el objetivo y exceso de 1 minuto en singular.

## 11. Orden de implementación y dependencias

| Orden | Tarea | Depende de | Entrega |
| --- | --- | --- | --- |
| 1 | T1 — Módulo puro de validación y persistencia | — | `weekly-goal.js` con constantes, mensajes, validación, lectura/escritura y primeras pruebas. |
| 2 | T2 — Semana, progreso y evaluación de estados | T1 | Cálculo puro y textos accesibles completos, con pruebas. |
| 3 | T3 — Sección HTML y estilos accesibles | T1 | Estructura estática, estilos, responsive y carga del módulo. |
| 4 | T4 — Integración DOM de la tarjeta | T2, T3 | Carga, render, guardar/quitar, validación, ciclo del campo y anuncios. |
| 5 | T5 — Integración con sesiones y recálculo reactivo | T4 | `saveSessions()` booleano, actualización tras guardado confirmado, `focus` y `visibilitychange`. |
| 6 | T6 — Regresión y pruebas de borde | T5 | Cobertura de integridad, rendimiento, divergencia esperada y casos límite. |
| 7 | T7 — Verificación integral con Chrome DevTools | T6 | Matriz manual completa, Lighthouse y consola limpia. |
| 8 | T8 — Documentación final | T7 | `AGENTS.md` y `MEMORY.md` actualizados con el estado real. |

No hay dependencias circulares. T3 puede avanzar en paralelo con T2 una vez creado T1, pero T4 necesita ambos. T6 no cambia comportamiento salvo que descubra un defecto; en ese caso la corrección se limita a `weekly-goal.js` o `app.js` y se vuelve a ejecutar la suite.

## 12. Criterio de “hecho” global

- Los 14 requisitos funcionales y los 7 no funcionales de la spec están implementados y verificados.
- `node --test` pasa con las 26 pruebas existentes y las nuevas, sin modificar las expectativas del mapa.
- La verificación manual de T7 está completa: carga vacía y con objetivo, guardado, cambio, quitado, persistencia, estados en curso/cumplido/superado, validación, atajos, ciclo del campo, fallos simulados, datos corruptos, sesiones ilegibles con el bloqueo de guardado existente, cambio de semana, 10.000 sesiones, 375 px, zoom 200 %, teclado, lector, Lighthouse 100 y consola limpia.
- `diario-estudio-v1` conserva exactamente su contenido antes y después de fijar, cambiar y quitar el objetivo.
- La diferencia esperada con “Minutos esta semana” queda documentada y reproducida con un fixture de sesiones heredadas.
- `AGENTS.md` y `MEMORY.md` describen la sección, el módulo, la clave nueva, el contrato de `saveSessions()`, las decisiones cerradas y los resultados de verificación.
- La spec `specs/002-weekly-goal/spec.md` mantiene `**Estado:** aprobada` y no se altera su contenido funcional.
