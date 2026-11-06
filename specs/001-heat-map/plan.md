# Plan 001 — Mapa de actividad

## 1. Alcance del plan

Implementar la spec `specs/001-heat-map/spec.md` sin dependencias ni build, manteniendo el registro, las rachas, los minutos semanales y el historial existentes. La lógica de fechas y agregación quedará aislada en funciones puras, con “hoy” recibido como parámetro, para poder probarla con `node --test` sin navegador.

## 2. Archivos y responsabilidades

| Archivo | Responsabilidad |
| --- | --- |
| `index.html` | Agregar la sección “Mapa de actividad” entre rachas y formulario: título, contenedor de la cuadrícula, leyenda y región de detalle accesible. No contiene lógica de cálculo. |
| `styles.css` | Estilos de cuadrícula, celdas, estados (sin estudio, 4 niveles, futuro, hoy), foco visible, leyenda, panel de detalle y responsive a 375 px. |
| `heatmap.js` (nuevo) | Dominio puro: parseo y formateo de fechas locales, ventana de 84 días, agregación de minutos, niveles, detalle y etiquetas accesibles. Sin DOM, sin `localStorage`, sin dependencia del reloj real. Expone las funciones al navegador y a Node para tests. |
| `app.js` | Integración: leer sesiones, invocar la lógica pura con la fecha actual, renderizar la cuadrícula y la leyenda, gestionar hover/focus/tap, cerrar detalle, actualizar tras guardar y avisar por consola si la lectura falla. No replica cálculos de fechas. |
| `tests/heatmap.test.js` (nuevo) | Pruebas unitarias de las funciones puras con `node --test`. Sin DOM ni almacenamiento real. |
| `AGENTS.md` y `MEMORY.md` | Actualizar layout, estado, comandos y notas de verificación, según la constitución. |
| `specs/001-heat-map/plan.md` | Este documento; no se modifica la spec salvo que aparezca una contradicción nueva. |

No se agregan dependencias, `package.json`, bundler, framework de tests ni módulos ES. `heatmap.js` se carga como script clásico y exporta a `module.exports` solo cuando se ejecuta en Node, para que `index.html` siga funcionando con `file://`.

## 3. Funciones puras

Todas reciben sus entradas explícitamente y no leen el reloj, el DOM ni el almacenamiento. “Hoy” siempre es un parámetro `Date` local.

| Función | Entrada | Salida / responsabilidad |
| --- | --- | --- |
| `parseDateKey(key)` | `AAAA-MM-DD` | `Date` local o `null` si el formato o la fecha son inválidos. Valida el round-trip año/mes/día para detectar fechas como `2026-02-30`. |
| `toDateKey(date)` | `Date` | Clave local `AAAA-MM-DD` usando año, mes y día locales. No usa UTC. |
| `addDays(date, n)` | `Date`, entero | Nueva `Date` local desplazada con `setDate`. No suma milisegundos. |
| `startOfWeekMonday(date)` | `Date` | Lunes local de la semana que contiene la fecha. |
| `getWindowStart(hoy)` | `Date` | Lunes de la semana −11 respecto de la semana de “hoy”. |
| `buildDateRange(start, count)` | `Date`, entero | Lista de `count` fechas locales consecutivas desde `start`. |
| `parseMinutes(value)` | valor almacenado | Minutos finitos redondeados, o `null` si son inválidos o ≤ 0. Acepta números y cadenas numéricas no vacías. |
| `aggregateMinutesByDate(sessions)` | sesiones | Mapa `clave → minutos redondeados` sumando varias sesiones del mismo día e ignorando sesiones inválidas. |
| `getLevel(minutes)` | entero ≥ 0 | `0` sin estudio, `1` 1–29, `2` 30–59, `3` 60–119, `4` 120+. |
| `isFutureDate(dateKey, hoy)` | clave, `Date` | `true` solo si la fecha es posterior a hoy. |
| `buildHeatmapDays(sessions, hoy)` | sesiones, `Date` | Los 84 días con `dateKey`, `date`, `minutes`, `level`, `isFuture`, `isToday` y etiquetas. Determinista para el mismo `hoy`. |
| `formatDetail(day)` | día calculado | Texto en español con fecha legible y minutos totales, o “Sin estudio”. |
| `getAccessibleLabel(day)` | día calculado | Nombre accesible completo para la celda. |
| `LEVELS` | — | Constante con los cuatro rangos y sus textos de leyenda. |

## 4. Algoritmo en pseudocódigo

```text
FUNCIÓN buildHeatmapDays(sesiones, hoy):
    hoyFecha = fecha local con año/mes/día de hoy
    claveHoy = toDateKey(hoyFecha)
    lunesActual = startOfWeekMonday(hoyFecha)
    inicio = addDays(lunesActual, -77)        // 11 semanas completas hacia atrás
    minutosPorDía = aggregateMinutesByDate(sesiones)
    días = []

    PARA i DESDE 0 HASTA 83:
        fecha = addDays(inicio, i)
        clave = toDateKey(fecha)
        minutos = minutosPorDía[clave] O 0
        futuro = fecha > hoyFecha
        nivel = SI futuro ENTONCES FUTURO SINO getLevel(minutos)
        días.agregar({
            dateKey: clave,
            date: fecha,
            minutes: minutos,
            level: nivel,
            isFuture: futuro,
            isToday: clave == claveHoy
        })

    DEVOLVER días


FUNCIÓN aggregateMinutesByDate(sesiones):
    mapa = mapa vacío
    PARA cada sesion EN sesiones:
        SI sesion no es objeto ENTONCES continuar
        SI parseDateKey(sesion.fecha) es nulo ENTONCES continuar
        minutos = parseMinutes(sesion.minutos)
        SI minutos es nulo ENTONCES continuar
        mapa[sesion.fecha] = (mapa[sesion.fecha] O 0) + minutos
    DEVOLVER mapa


FUNCIÓN parseDateKey(key):
    SI key no cumple AAAA-MM-DD ENTONCES DEVOLVER nulo
    [a, m, d] = separar y convertir a enteros
    fecha = nueva Date local(a, m - 1, d)
    SI fecha.getFullYear() != a O fecha.getMonth() != m - 1 O fecha.getDate() != d
        ENTONCES DEVOLVER nulo
    DEVOLVER fecha


FUNCIÓN parseMinutes(valor):
    SI valor es booleano, nulo, vacío o espacios ENTONCES DEVOLVER nulo
    numero = convertir a número
    SI no es finito O numero <= 0 ENTONCES DEVOLVER nulo
    redondeado = redondear al entero más cercano
    SI redondeado <= 0 ENTONCES DEVOLVER nulo
    DEVOLVER redondeado


FUNCIÓN getLevel(minutos):
    SI minutos <= 0 ENTONCES DEVOLVER 0
    SI minutos < 30 ENTONCES DEVOLVER 1
    SI minutos < 60 ENTONCES DEVOLVER 2
    SI minutos < 120 ENTONCES DEVOLVER 3
    DEVOLVER 4
```

Render: la cuadrícula se pinta en 12 columnas semanales y 7 filas de lunes a domingo, de más antigua a más reciente. Cada celda no futura es un control enfocable con nombre accesible; las futuras no son enfocables y no muestran detalle. Hover/focus actualizan un único panel de detalle con `aria-live="polite"`; touch selecciona el día y cierra al tocar otro día o fuera del mapa.

## 5. Decisiones

1. **Ventana**: 12 semanas calendario, incluyendo la semana actual; empieza el lunes de la semana −11 y termina el domingo de la semana actual. Son 84 celdas aunque la semana actual tenga días futuros.
2. **Cuadrícula**: columnas = semanas, filas = lunes a domingo, orden de antigua a reciente. Se muestran etiquetas de días.
3. **Agregación**: se redondea cada sesión con `Math.round` antes de sumar; se ignoran fechas inválidas, minutos no finitos, ≤ 0 o que redondeen a 0. Si el total del día queda en 0, el día es “sin estudio”.
4. **Datos corruptos**: se muestra el mapa vacío, se registra `console.warn` y no se modifica el almacenamiento. Esto evita errores no controlados y mantiene la consola sin errores.
5. **Detalle**: un único panel fijo debajo del mapa, no un tooltip flotante. Se actualiza con hover, focus o toque; se cierra con `mouseleave`, `blur`, `Escape`, otro día o toque fuera.
6. **Teclado**: un solo día participa en el orden de tabulación (roving tabindex); las flechas mueven el foco por días no futuros, `Home`/`End` van al primero/último, `Escape` cierra el detalle. Los días futuros quedan fuera del recorrido.
7. **Colores**: cuatro tonos de la paleta azul existente, gris claro para “sin estudio” y gris atenuado con patrón o borde discontinuo para futuros. El texto de la leyenda usa los colores de texto existentes para mantener contraste AA.
8. **Idioma y fechas**: claves internas `AAAA-MM-DD`; visualización con `Intl.DateTimeFormat('es-ES')`. Cálculos con componentes locales y `setDate`, nunca con cadenas ISO ni UTC.
9. **Actualización**: se recalcula en la inicialización y después de guardar una sesión válida. No se escucha `storage` ni se sincroniza entre pestañas, según la spec.
10. **Rendimiento**: la agregación recorre las sesiones una vez y el render siempre produce 84 celdas. Con 10.000 sesiones el coste dominante es O(n) y no se recalcula por celda.
11. **Integridad**: el mapa solo lee sesiones; no crea, edita, migra ni elimina datos. Las sesiones fuera de la ventana y las futuras se ignoran visualmente sin borrarse.
12. **Módulo testeable**: `heatmap.js` usa un patrón de exportación condicional para navegador y Node, sin módulos ES, porque `file://` bloquea `import`.

## 6. Alternativas descartadas

| Alternativa | Motivo de descarte |
| --- | --- |
| Tooltip flotante o `title` nativo para el detalle | `title` no es fiable en táctil ni teclado, y el flotante se recorta cerca de los bordes a 375 px. Se prefiere un panel fijo con `aria-live`. |
| Escala relativa al máximo del período | Dificulta comparar semanas y cambia el significado del color según los datos. La spec fijó umbrales absolutos. |
| Módulos ES (`import`/`export`) | `file://` bloquea los módulos en Chrome; obligaría a un servidor o build, contra la constitución. |
| Paleta verde estilo GitHub | Choca con la identidad azul existente y con las tarjetas de rachas; se reutiliza la paleta actual. |
| Ventana configurable o de 8/16 semanas | La decisión aprobada fue 12 semanas; una opción configurable agrega estado y UI fuera de alcance. |
| Recalcular minutos por celda recorriendo todas las sesiones | Coste O(84·n); la agregación previa en un mapa reduce a O(n + 84). |
| Guardar el mapa calculado en `localStorage` | Duplica datos derivados, se desincroniza y arriesga la integridad del almacenamiento existente. |

## 7. Estrategia de tests con `node --test`

### Pruebas unitarias

Archivo `tests/heatmap.test.js`. Cada prueba construye “hoy” con `new Date(año, mes - 1, día)` para fijar una fecha local conocida (por ejemplo, jueves 5 de noviembre de 2026) y no depende de la fecha real del equipo.

- **Ventana**: 84 días exactos; inicio en lunes; fin en domingo de la semana actual; orden ascendente; semana actual completa con días futuros.
- **Niveles**: 0, 1, 29, 30, 59, 60, 119, 120 y valores muy altos.
- **Redondeo**: decimales como 29,4, 29,5, 29,6 y 0,4; redondeo por sesión antes de sumar.
- **Agregación**: varias sesiones el mismo día; suma que cruza 60 y 120; total 0 tras redondeo.
- **Datos inválidos**: fecha con formato incorrecto, fecha inexistente (`2026-02-30`), minutos `NaN`, `Infinity`, negativos, cero, booleanos, nulos, vacíos y objetos `null` o sin campos.
- **Futuros**: sesión almacenada con fecha futura ignorada; día futuro no interactivo; sesión fuera de la ventana no visible.
- **Fechas límite**: 29 de febrero de año bisiesto y no bisiesto; semanas que cruzan diciembre/enero; recorrido de 84 días con `addDays` sin duplicar ni saltar claves.
- **Etiquetas y detalle**: minutos enteros, “Sin estudio”, fecha legible en español y nombre accesible para días con y sin sesiones.
- **Rendimiento funcional**: 10.000 sesiones producen 84 días correctos; la prueba es de corrección, sin umbral de tiempo frágil.

### Verificación de integración y manual

Con Chrome DevTools, según la constitución:

- Cargar sin sesiones: mapa vacío, leyenda visible y futuros atenuados.
- Registrar hoy, ayer y anteayer: el mapa actualiza los tres días con sus niveles; las rachas siguen mostrando 3/3.
- Persistencia: recargar y comprobar el mismo mapa; no se alteran datos.
- Días futuros: no enfocables, sin detalle, distintos de un día pasado sin estudio.
- Detalle: hover, focus con teclado, flechas, `Escape`, toque en móvil, toque fuera y toque en otro día.
- Fechas futuras: el formulario sigue bloqueándolas; una sesión futura inyectada no colorea el mapa ni se borra.
- Datos corruptos: inyectar JSON inválido, ver mapa vacío, aviso en consola y pantalla estable; restaurar los datos después.
- Responsive: 375 px sin scroll horizontal ni recortes; probar zoom de texto y foco visible.
- Consola sin errores durante carga, guardado e interacción.
- Regresión: historial, minutos semanales y ambas rachas sin cambios.

### Comandos

```text
node --test
node --test tests/heatmap.test.js
```

Criterio de salida: todas las pruebas unitarias pasan, la verificación manual y móvil queda registrada, y no hay errores en consola.
