# Spec 002 — Objetivo semanal de estudio

**Estado:** aprobada

## Contexto y objetivo

El Diario de Estudio registra sesiones con fecha, materia, tema y minutos, y ya muestra rachas, minutos de la semana actual, un mapa de actividad de 12 semanas y un historial. Hoy no existe una meta semanal que permita comparar lo estudiado con lo que la persona se propuso.

El objetivo es incorporar una sección “Objetivo semanal” que permita fijar una meta global de minutos para la semana en curso, ver el progreso acumulado, saber cuánto falta o cuánto se superó, y cambiar o quitar la meta. La funcionalidad debe ser independiente del mapa de actividad, usar fechas locales y persistir en una clave nueva sin modificar las sesiones existentes ni alterar las rachas, el historial, los minutos semanales o el mapa.

La tarjeta existente “Minutos esta semana” no se modifica. Su cálculo puede diferir del progreso del objetivo cuando haya sesiones heredadas futuras o con decimales, porque esa tarjeta incluye futuras y no redondea. Ambas coinciden cuando todas las sesiones de la semana fueron creadas por el formulario, que solo admite enteros y bloquea fechas futuras.

## Usuarios

- **Persona que planifica su semana de estudio**: fija una meta de minutos y organiza cuánto estudiar.
- **Persona que sigue su progreso**: consulta cuánto lleva, cuánto le falta y si ya cumplió la meta.
- **Persona que retoma el hábito**: usa una meta concreta para volver a estudiar con una referencia clara.
- **Persona que usa la app en el móvil o con teclado**: edita la meta y consulta el progreso sin depender del ratón y sin desplazamiento horizontal.

## Historias de usuario

- **HU-1**: Como persona que estudia, quiero fijar un objetivo de minutos para la semana actual para tener una meta concreta.
- **HU-2**: Como persona que estudia, quiero ver los minutos acumulados frente a mi objetivo para saber cómo voy.
- **HU-3**: Como persona que estudia, quiero saber cuántos minutos me faltan o cuánto superé el objetivo para decidir si seguir estudiando.
- **HU-4**: Como persona que estudia, quiero cambiar o quitar el objetivo cuando mis circunstancias cambien.
- **HU-5**: Como persona que usa la app varias semanas, quiero que el objetivo se conserve y que el progreso se reinicie cada semana sin volver a configurarlo.
- **HU-6**: Como persona que usa el móvil, el teclado o un lector de pantalla, quiero editar el objetivo y entender el progreso sin depender solo del color o del ratón.
- **HU-7**: Como persona que ya usa las rachas y el mapa, quiero que el nuevo objetivo no modifique mis datos ni cambie el funcionamiento de las secciones existentes.

## Requisitos funcionales

### RF-1 — Sección y ubicación
El sistema debe mostrar una sección llamada “Objetivo semanal” entre la sección de rachas y la sección del mapa de actividad.

**Criterios de aceptación (EARS)**
- El sistema debe presentar la sección con el título “Objetivo semanal”.
- El sistema debe ubicar la sección después de “Rachas” y antes de “Mapa de actividad”.
- El sistema debe mantener visible la sección aunque no exista objetivo, aunque no existan sesiones o aunque el almacenamiento del objetivo no se pueda leer.
- El sistema debe conservar visibles y en su ubicación actual las secciones de rachas, mapa de actividad, formulario e historial.

### RF-2 — Semana actual y reinicio
El sistema debe aplicar un objetivo único global a la semana en curso, definida de lunes a domingo en fecha local, y reiniciar el progreso al cambiar de semana sin modificar el objetivo.

**Criterios de aceptación (EARS)**
- El sistema debe definir la semana en curso desde el lunes a las 00:00 hasta el domingo a las 23:59:59 en hora local del dispositivo.
- El sistema debe usar la fecha local para determinar el inicio y el fin de la semana, sin conversiones UTC ni `new Date(string)` sobre fechas `AAAA-MM-DD`.
- El sistema debe mantener el mismo objetivo entre semanas sin exigir que la persona lo vuelva a fijar.
- Cuando cambie la semana, el sistema debe calcular el progreso solo con las sesiones de la nueva semana, de modo que el acumulado anterior deje de mostrarse.
- El sistema debe mostrar únicamente la semana en curso; no debe mostrar semanas anteriores, un selector de semana ni un historial de objetivos.
- Cuando la aplicación permanezca abierta durante un cambio de semana, el sistema debe usar la fecha local del momento de la siguiente recalculación definida en RF-10, incluida la vuelta a la pestaña.
- El sistema no debe desplazar por zona horaria la fecha registrada de una sesión.
- El sistema debe usar la fecha local del momento del recálculo para determinar la semana del objetivo; el valor por defecto del formulario no determina esa fecha.

**Nota:** el valor por defecto del formulario puede quedar obsoleto después de medianoche. Es comportamiento existente y queda fuera de alcance; el objetivo usa la fecha local del momento del recálculo.

### RF-3 — Cálculo y redondeo del progreso
El sistema debe calcular el progreso como la suma de minutos de las sesiones válidas de la semana en curso, excluyendo las sesiones futuras y redondeando cada sesión antes de sumar.

**Criterios de aceptación (EARS)**
- El sistema debe considerar únicamente las sesiones cuya fecha local esté entre el lunes y el domingo de la semana en curso.
- El sistema debe incluir las sesiones de hoy en el progreso.
- El sistema debe excluir las sesiones con fecha posterior a hoy, aunque caigan dentro de la semana en curso.
- El sistema debe excluir del progreso las sesiones con fecha anterior al lunes de la semana en curso o posterior al domingo de la semana en curso, sin borrarlas ni modificarlas.
- El sistema debe ignorar las entradas que no sean objetos, incluyendo `null` y arrays.
- El sistema debe aceptar como minutos únicamente números finitos o cadenas numéricas no vacías después de aplicar `trim`.
- El sistema debe ignorar los minutos que sean booleanos, `null`, arrays, objetos, cadenas vacías o cadenas no numéricas.
- Cuando una sesión tenga minutos decimales positivos, el sistema debe redondearlos al entero más cercano, con los valores terminados en 0,5 hacia arriba, antes de sumar.
- Cuando el redondeo de minutos positivos dé 0, como en 0,4, el sistema no debe sumar esa sesión.
- Cuando una sesión tenga minutos expresados como una cadena numérica con espacios exteriores, el sistema debe aplicar `trim` y luego interpretarla como número.
- Si una sesión tiene una fecha con formato distinto de `AAAA-MM-DD` o una fecha inexistente, el sistema debe ignorarla para el progreso.
- Si una sesión tiene minutos de un tipo no admitido, no finitos o menores o iguales a 0, el sistema debe ignorarla para el progreso.
- El sistema debe sumar los minutos de todas las sesiones válidas de la semana en curso, incluidas varias sesiones del mismo día.
- Si no existe ninguna sesión válida en la semana en curso, el sistema debe considerar el progreso como 0 minutos.
- Si no se pueden leer las sesiones almacenadas, el sistema debe mostrar 0 minutos acumulados, mantener el objetivo y no borrar ni sobrescribir las sesiones.
- El sistema no debe modificar, reparar ni eliminar las sesiones usadas para el cálculo.

### RF-4 — Estado sin objetivo
El sistema debe mostrar un estado específico cuando no exista un objetivo válido.

**Criterios de aceptación (EARS)**
- Cuando no exista un objetivo válido, el sistema debe mostrar el texto “Aún no tienes objetivo semanal”.
- Cuando no exista un objetivo válido, el sistema debe mostrar la invitación “Fija cuántos minutos quieres estudiar esta semana.”
- Cuando no exista un objetivo válido, el sistema no debe mostrar una barra de progreso ni el texto “Faltan … min”.
- El sistema debe mantener visibles el campo de objetivo, el botón “Guardar objetivo” y los atajos rápidos en el estado sin objetivo.
- Cuando no exista un objetivo, el sistema debe mostrar el campo de objetivo vacío.
- Cuando la persona quite el objetivo correctamente, el sistema debe pasar al estado sin objetivo y vaciar el campo sin recargar la página.
- Cuando el objetivo almacenado sea inválido o no se pueda leer, el sistema debe mostrar este estado sin romper la pantalla.

### RF-5 — Estado con objetivo y progreso visible
El sistema debe mostrar el progreso frente al objetivo mientras exista un objetivo válido, independientemente de si ya se alcanzó.

**Criterios de aceptación (EARS)**
- Mientras exista un objetivo válido, el sistema debe mostrar siempre el texto “X / Y min”, donde X es el acumulado real sin recortar e Y el objetivo.
- Mientras exista un objetivo válido, el sistema debe mostrar una barra de progreso cuyo avance visual sea X dividido por Y, limitado como máximo al 100 %.
- Cuando el acumulado sea menor que el objetivo, el sistema debe mostrar “Faltan Z min”, donde Z es igual a Y menos X.
- Cuando Z sea igual a 1, el sistema debe mostrar “Falta 1 min”.
- Cuando el acumulado sea 0 y exista objetivo, el sistema debe mostrar “0 / Y min”, una barra vacía y “Faltan Y min”.
- Cuando el acumulado sea igual o mayor que el objetivo, el sistema no debe mostrar el texto “Faltan … min”; ese estado se rige por RF-6.
- El sistema debe calcular Z con el acumulado real, no con el valor limitado visualmente al 100 %.

### RF-6 — Estado cumplido y superado
El sistema debe mostrar un estado de cumplimiento cuando el acumulado alcance o supere el objetivo, distinguiendo el cumplimiento exacto del exceso.

**Criterios de aceptación (EARS)**
- Cuando el acumulado sea igual al objetivo, el sistema debe mostrar el titular “Objetivo cumplido” sin texto de exceso y sin “+0 min”.
- Cuando el acumulado sea mayor que el objetivo, el sistema debe mostrar el titular “Objetivo cumplido” y el exceso real como “+N min”, donde N es igual a X menos Y y N es mayor que 0.
- Cuando el acumulado sea igual o mayor que el objetivo, el sistema debe mantener visible “X / Y min” con el acumulado real sin recortar.
- Cuando el acumulado sea igual o mayor que el objetivo, el sistema debe mantener la barra visual al 100 %.
- Cuando el acumulado sea igual o mayor que el objetivo, el sistema no debe mostrar el texto “Faltan … min”.
- El sistema debe comunicar el cumplimiento con texto visible, no solo mediante un cambio de color.
- El sistema debe usar el mismo titular “Objetivo cumplido” tanto en el cumplimiento exacto como en el superado.

### RF-7 — Edición del objetivo
El sistema debe permitir fijar, cambiar y quitar el objetivo desde la sección “Objetivo semanal”.

**Criterios de aceptación (EARS)**
- El sistema debe ofrecer un campo de texto para minutos con la etiqueta “Objetivo en minutos”, usando `type="text"` e `inputmode="numeric"`.
- Si el campo está dentro de un formulario, el sistema debe usar `novalidate` para que la validación dependa de la gramática definida en RF-8.
- El sistema debe ofrecer un botón con el texto “Guardar objetivo”.
- El sistema debe ofrecer atajos rápidos con los textos visibles “120 min”, “300 min” y “600 min”.
- Al cargar la aplicación, si existe un objetivo vigente, el sistema debe mostrar su valor en el campo.
- Tras un guardado exitoso del objetivo, el sistema debe mostrar el valor guardado en el campo.
- Tras un quitado exitoso del objetivo, el sistema debe vaciar el campo.
- Tras un guardado fallido del objetivo, el sistema debe conservar en el campo el valor que la persona intentó guardar.
- Tras un quitado fallido del objetivo, el sistema debe mostrar en el campo el objetivo vigente.
- El sistema debe actualizar el campo de objetivo solo al cargar, tras guardar o quitar el objetivo, o ante un error.
- El sistema debe distinguir el vaciado explícito de la persona de un valor vacío mostrado por el sistema; solo el vaciado explícito ejecuta el quitado.
- El sistema no debe reescribir el campo de objetivo como consecuencia de guardar una sesión; si la persona tiene un borrador no guardado en ese campo, debe conservarse.
- Cuando la persona active un atajo rápido, el sistema debe actualizar el campo con ese valor, guardarlo en la misma acción y anunciar “Objetivo semanal guardado.”, sin exigir un segundo clic.
- Los guardados repetidos del mismo valor deben ser idempotentes y no deben duplicar mensajes ni anuncios.
- Cuando la persona guarde un objetivo válido, el sistema debe aplicar el nuevo valor a la semana en curso y conservar los minutos ya acumulados.
- Cuando la persona guarde un campo vacío, un campo con solo espacios o el valor “0”, el sistema debe quitar el objetivo y volver al estado sin objetivo.
- El sistema debe quitar el objetivo sin pedir confirmación modal y sin borrar ni modificar sesiones.
- Cuando la persona vuelva a fijar un objetivo después de quitarlo, el sistema debe calcular el progreso con las sesiones válidas de la semana en curso ya existentes.
- Cuando el guardado o el quitado se complete, el sistema debe mostrar el mensaje “Objetivo semanal guardado.” o “Objetivo semanal eliminado.”, respectivamente.
- El sistema debe mantener el objetivo guardado y el progreso actualizados sin recargar la página.

### RF-8 — Validación del campo
El sistema debe aceptar únicamente objetivos enteros positivos dentro de un rango definido y rechazar las entradas inválidas sin alterar el objetivo vigente.

**Criterios de aceptación (EARS)**
- El sistema debe validar el valor crudo del campo después de aplicar `trim`.
- Si después de `trim` el valor es vacío, el sistema debe quitar el objetivo.
- Si después de `trim` el valor es exactamente “0”, el sistema debe quitar el objetivo.
- En cualquier otro caso, el sistema debe exigir que el valor cumpla `^[0-9]+$` y que represente un entero desde 1 hasta 10080 minutos, ambos inclusive.
- El sistema debe interpretar 10080 minutos como el máximo semanal posible, equivalente a 7 días de 24 horas.
- El sistema debe rechazar letras, signos positivos o negativos, decimales, separadores de miles, notación exponencial y espacios internos.
- El sistema debe aceptar espacios al inicio y al final del valor y ceros a la izquierda cuando el entero resultante esté entre 1 y 10080.
- El sistema debe rechazar “00” y cualquier otro valor cuyo entero resultante sea 0 pero que no sea exactamente el texto “0”.
- Cuando la entrada sea inválida por formato, el sistema debe mostrar el mensaje “Ingresa un número entero de minutos mayor que 0.”
- Cuando la entrada cumpla `^[0-9]+$` pero el entero resultante sea menor que 1 o mayor que 10080, el sistema debe mostrar el mensaje “El objetivo debe estar entre 1 y 10080 minutos.”
- Cuando la entrada sea inválida, el sistema no debe modificar el objetivo vigente, el progreso ni el almacenamiento.
- Cuando la entrada sea inválida, el sistema nunca debe interpretarla como vacía ni quitar el objetivo.
- Cuando la entrada sea inválida, el sistema debe mantener el texto inválido en el campo para que la persona lo corrija.
- Cuando la entrada sea inválida, el sistema debe marcar el campo como inválido, asociar el mensaje de error al campo y devolver el foco al campo.
- El sistema debe tratar el campo vacío y el texto exacto “0” como la acción de quitar el objetivo, no como un error de validación.
- El sistema debe aplicar esta validación con independencia de la validación nativa del navegador.
- El sistema debe mostrar el mensaje de error con texto visible y anunciarlo a las tecnologías de asistencia.

### RF-9 — Persistencia y datos corruptos
El sistema debe persistir el objetivo en una clave nueva de `localStorage`, separada de las sesiones, y sobrevivir a datos ausentes, ilegibles o inválidos sin sobrescribirlos.

**Criterios de aceptación (EARS)**
- El sistema debe guardar el objetivo en la clave `diario-estudio-goal-v1` como un objeto JSON con la forma `{ "objetivoMinutos": <entero entre 1 y 10080> }`.
- El sistema no debe escribir, migrar, reparar ni eliminar la clave `diario-estudio-v1` ni modificar el esquema de las sesiones.
- El sistema debe escribir en `diario-estudio-goal-v1` únicamente cuando la persona guarde o quite el objetivo de forma explícita.
- Cuando la clave `diario-estudio-goal-v1` no exista, el sistema debe mostrar el estado sin objetivo y no debe registrar ningún `console.warn` por ese motivo.
- Cuando la clave exista pero su contenido no se pueda interpretar o sea inválido, el sistema debe mostrar el estado sin objetivo y registrar exactamente un `console.warn` por carga.
- Cuando la clave exista y contenga un objeto válido, el sistema debe usarlo y no debe registrar `console.warn`.
- Si `localStorage` no se puede leer, el sistema debe tratar la clave como ilegible, mostrar el estado sin objetivo y registrar exactamente un `console.warn` por carga.
- El sistema debe considerar inválidos los valores que no sean un objeto, los arrays, los objetos sin `objetivoMinutos`, los valores no numéricos, los no finitos, los decimales, los menores o iguales a 0 y los mayores que 10080.
- El sistema debe considerar inválida una cadena numérica almacenada en `objetivoMinutos`, aunque represente un entero válido.
- El sistema debe ignorar las propiedades adicionales del objeto almacenado y no invalidar el objetivo por su presencia.
- Al guardar, el sistema debe escribir exactamente `{ "objetivoMinutos": <entero> }`, descartando las propiedades adicionales.
- El sistema no debe sobrescribir el valor original de la clave hasta un guardado o quitado explícito.
- Cuando la persona guarde o quite el objetivo, el sistema debe eliminar la clave `diario-estudio-goal-v1` si la acción es quitarlo.
- La ausencia de la clave después de un quitado correcto no debe generar `console.warn`.
- Si el guardado falla, el sistema debe mostrar el mensaje “No se pudo actualizar el objetivo. Se mantiene el valor anterior.”, conservar el objetivo vigente, mantener en el campo el valor intentado y no dejar la tarjeta en un estado inconsistente.
- Si el quitado falla, el sistema debe mostrar el mensaje “No se pudo actualizar el objetivo. Se mantiene el valor anterior.”, conservar el objetivo vigente y mostrar el objetivo vigente en el campo.
- El sistema no debe tratar un error de lectura de las sesiones como un objetivo inválido ni debe borrar la clave del objetivo por ese motivo.

### RF-10 — Actualización reactiva
El sistema debe recalcular y actualizar la tarjeta al cargar la aplicación, al volver a la pestaña y después de cada guardado confirmado, sin recargar la página.

**Criterios de aceptación (EARS)**
- Cuando la aplicación termine de cargar, el sistema debe mostrar el objetivo y el progreso calculados con las sesiones existentes y la fecha local actual.
- Cuando la persona guarde una sesión, el sistema debe recalcular el progreso solo si `saveSessions()` devuelve un estado de éxito booleano o equivalente.
- El sistema debe requerir que `saveSessions()` devuelva un estado de éxito y que el manejador del formulario condicione el recálculo del objetivo y el mensaje “Sesión guardada correctamente” a ese resultado.
- Si `saveSessions()` falla, el sistema no debe mostrar “Sesión guardada correctamente”, no debe recalcular el objetivo y no debe modificar el campo de objetivo.
- Esta corrección de integración no debe cambiar las validaciones del formulario de sesiones ni el esquema de las sesiones.
- Cuando la persona guarde una sesión válida fuera de la semana en curso, el sistema debe actualizar la tarjeta sin alterar el progreso mostrado.
- Cuando la persona guarde, cambie o quite el objetivo, el sistema debe actualizar la tarjeta sin recargar la página.
- Cuando la pestaña vuelva a estar visible o la ventana reciba foco, el sistema debe recalcular con la fecha local actual para reflejar un posible cambio de semana.
- Cuando cambie la semana, la siguiente recalculación debe usar la nueva semana y mostrar el progreso reiniciado.
- El sistema debe usar la fecha local del momento de cada recalculación, no una fecha capturada al abrir la aplicación.
- Si falla el guardado del objetivo, el sistema no debe actualizar el objetivo mostrado ni el progreso asociado.
- Si falla el guardado de una sesión, el sistema no debe alterar el progreso del objetivo.
- El sistema no debe requerir que la persona recargue la página para ver el efecto de un guardado correcto.
- El sistema no debe sobrescribir con una recalculación el borrador no guardado del campo de objetivo.

### RF-11 — Accesibilidad
El sistema debe hacer que la sección, la edición y el progreso sean comprensibles y operables sin depender exclusivamente del color o del ratón.

**Criterios de aceptación (EARS)**
- El sistema debe asociar la sección “Objetivo semanal” con su título mediante un nombre accesible.
- El sistema debe asociar el campo “Objetivo en minutos” con una etiqueta visible.
- El sistema debe permitir operar con teclado el campo, el botón y los atajos rápidos, con un indicador de foco visible.
- El sistema debe mantener una región `aria-live="polite"` para los mensajes del formulario de sesión y otra para los mensajes y el estado de la sección de objetivo.
- La región del formulario debe anunciar únicamente el resultado de guardar una sesión, incluido su error.
- La región del objetivo debe anunciar los mensajes de guardar o quitar objetivo, los errores de validación, guardado o quitado, y los cambios de progreso producidos al guardar una sesión o al guardar o quitar el objetivo.
- El sistema no debe anunciar el mensaje “Sesión guardada correctamente” en la región del objetivo ni el cambio de progreso en la región del formulario.
- El sistema no debe duplicar un mismo cambio en ambas regiones.
- El sistema no debe anunciar cambios en cada pulsación del campo mientras la persona escribe.
- El sistema no debe asignar `aria-live` a la barra de progreso; su lectura bajo demanda debe usar `aria-valuetext`.
- Cuando exista un objetivo y un progreso visible, la barra debe exponer el rol `progressbar`, un nombre accesible “Progreso del objetivo semanal”, `aria-valuemin` 0, `aria-valuemax` igual al objetivo y `aria-valuenow` igual al acumulado limitado al objetivo.
- El sistema debe exponer en `aria-valuetext` el estado completo: acumulado real, objetivo, minutos restantes o exceso y si el objetivo está cumplido.
- Cuando el acumulado sea menor que el objetivo, `aria-valuetext` debe expresar “X de Y minutos; faltan Z minutos” o “falta 1 minuto” si Z es 1.
- Cuando el acumulado sea igual al objetivo, `aria-valuetext` debe expresar “X de Y minutos; objetivo cumplido”, sin exceso.
- Cuando el acumulado sea mayor que el objetivo, `aria-valuetext` debe expresar “X de Y minutos; objetivo cumplido; N minutos de exceso”.
- El sistema no debe exponer un elemento con rol `progressbar` cuando no exista objetivo.
- El sistema debe comunicar el estado sin objetivo, el progreso y el cumplimiento con texto visible, no solo con color.
- El sistema debe asociar los mensajes de éxito y de error con la región `aria-live` que corresponda.
- El sistema debe marcar el campo con `aria-invalid` cuando la validación falle y asociar el mensaje mediante `aria-describedby`.
- Los controles nuevos deben tener un área táctil de al menos 44 × 44 px.

### RF-12 — Responsive
El sistema debe adaptar la sección a pantallas estrechas sin desplazamiento horizontal ni contenido recortado.

**Criterios de aceptación (EARS)**
- El sistema debe mostrarse a 375 px de ancho sin provocar desplazamiento horizontal.
- El sistema debe permitir que el campo, el botón y los atajos se apilen o se envuelvan cuando no quepan en una sola fila.
- El sistema debe mostrar la barra de progreso con un ancho que no exceda el contenedor.
- El sistema debe permitir que los textos de estado, los mensajes y los atajos se envuelvan sin recortarse.
- El sistema debe mantener la legibilidad y la operabilidad al aplicar un zoom de texto del 200 %.

### RF-13 — Estado sin sesiones
El sistema debe mostrar la sección correctamente aunque no exista ninguna sesión registrada.

**Criterios de aceptación (EARS)**
- Cuando no exista ninguna sesión y no exista objetivo, el sistema debe mostrar el estado sin objetivo con la invitación a fijarlo y el campo vacío.
- Cuando no exista ninguna sesión y exista objetivo, el sistema debe mostrar “0 / Y min”, una barra vacía y “Faltan Y min”.
- Cuando no exista ninguna sesión y exista objetivo, el sistema debe mostrar el objetivo vigente en el campo.
- Cuando no exista ninguna sesión y exista objetivo, el sistema no debe mostrar “Objetivo cumplido”.
- Cuando todas las sesiones de la semana sean inválidas, el sistema debe tratarlas como ausentes y mostrar 0 minutos acumulados.
- El sistema no debe mostrar “0 / 0 min”, divisiones por cero ni errores cuando no haya objetivo o no haya sesiones.
- El sistema debe mantener los controles de edición disponibles en todos los estados sin sesiones.

### RF-14 — Integridad y compatibilidad
El sistema debe leer las sesiones sin modificarlas y convivir con las funcionalidades existentes sin alterar sus resultados.

**Criterios de aceptación (EARS)**
- El sistema debe tratar las sesiones como datos de solo lectura.
- El sistema no debe crear, editar, mover, migrar ni eliminar sesiones.
- El sistema no debe cambiar el esquema `{ id, fecha, materia, tema, minutos, createdAt }` ni la clave `diario-estudio-v1`.
- Cuando la persona fije, cambie o quite el objetivo, los valores de racha actual, mejor racha, minutos de la semana, mapa de actividad e historial deben permanecer idénticos para las mismas sesiones y la misma fecha.
- El sistema no debe modificar la tarjeta “Minutos esta semana” ni su cálculo.
- El sistema debe permitir que el progreso del objetivo difiera de la tarjeta “Minutos esta semana” cuando existan sesiones heredadas futuras o con decimales, porque la tarjeta existente incluye futuras y no redondea.
- El sistema debe hacer coincidir el progreso del objetivo y la tarjeta “Minutos esta semana” cuando todas las sesiones de la semana hayan sido creadas por el formulario, es decir, sean enteras y no futuras.
- El sistema debe documentar y verificar la diferencia esperada sin migrar ni normalizar sesiones heredadas.
- El sistema no debe cambiar el comportamiento del formulario, del bloqueo de fechas futuras, del mapa ni del historial.
- La corrección de integración de `saveSessions()` no debe cambiar la validación del formulario de sesiones.
- Un error en la clave del objetivo no debe impedir registrar sesiones ni alterar el funcionamiento de las secciones existentes.
- Un error de lectura de las sesiones no debe provocar que la funcionalidad del objetivo escriba en `diario-estudio-v1`.

## Requisitos no funcionales

- **RNF-1 — Rendimiento**: con hasta 10.000 sesiones almacenadas, el recálculo del progreso y la actualización de la tarjeta deben producir resultados correctos y no deben provocar un bloqueo perceptible en la verificación manual. El cálculo debe recorrer las sesiones una sola vez y no debe crear un nodo del DOM por sesión. No se fija un umbral duro de tiempo.
- **RNF-2 — Idioma y formato de la sección nueva**: todas las etiquetas, atajos, mensajes y textos de estado de la sección “Objetivo semanal” deben estar en español y en tuteo, sin texto en inglés. Los minutos de esta sección deben mostrarse como números enteros sin decimales y sin separador de miles. Los textos de las secciones existentes no se modifican.
- **RNF-3 — Contraste y accesibilidad**: el texto, los controles, los mensajes y la barra de progreso deben cumplir contraste WCAG 2.1 AA; el foco debe ser visible; el estado no debe depender solo del color; los controles nuevos deben tener áreas táctiles de al menos 44 × 44 px. Lighthouse de accesibilidad debe mantenerse en 100.
- **RNF-4 — Estabilidad de consola**: la carga, el guardado de sesiones, la edición del objetivo, el quitado, la validación y los datos corruptos controlados no deben producir excepciones no controladas. Si la clave del objetivo no existe, no se registra `console.warn`. Si la clave existe pero es ilegible o inválida, se registra exactamente un `console.warn` por carga; una lectura fallida de `localStorage` se trata como clave ilegible y se avisa exactamente una vez. Se mantiene el `console.warn` ya existente por la lectura de sesiones. Un fallo de guardado o quitado puede registrar un `console.error` controlado. Los avisos no deben repetirse en cada render.
- **RNF-5 — Integridad de datos**: la funcionalidad no debe borrar, migrar, reparar ni sobrescribir datos existentes. Solo debe escribir la clave `diario-estudio-goal-v1` tras una acción explícita de guardado o quitado, y debe conservar el valor original cuando la lectura sea inválida o falle, salvo que la persona guarde o quite el objetivo explícitamente. Al guardar, debe escribir exactamente `{ objetivoMinutos }` y descartar propiedades adicionales.
- **RNF-6 — Compatibilidad**: la nueva sección no debe cambiar los cálculos, los textos ni la interacción de rachas, minutos semanales, mapa de actividad, formulario o historial. La tarjeta “Minutos esta semana” conserva su cálculo y puede diferir del progreso del objetivo según lo definido en RF-14. La verificación debe incluir una prueba de regresión que documente esa diferencia esperada.
- **RNF-7 — Testabilidad**: la lógica de semana, progreso, redondeo, validación y evaluación de estados debe ser pura y exportable a Node en un módulo nuevo o reutilizando `heatmap.js`, con `today` y un adaptador de storage inyectables. Debe reutilizar `parseDateKey`, `startOfWeekMonday` y el redondeo de minutos existentes para no duplicar reglas.

## Casos límite

- Semana que cruza un cambio de mes: se calcula correctamente de lunes a domingo.
- Semana que cruza un cambio de año: se calcula correctamente sin desplazar días.
- Cambio de horario de verano o de zona horaria: la semana y las sesiones se determinan en fecha local y no se desplaza la fecha registrada.
- Sesión del domingo a las 23:59 y sesión del lunes a las 00:00: cada una pertenece a su semana local.
- Sesión de hoy: cuenta para el progreso.
- Sesión con fecha futura dentro de la semana en curso: se ignora para el progreso y no se elimina.
- Sesión con fecha fuera de la semana en curso: se ignora para el progreso y no se elimina.
- Varias sesiones el mismo día: se suman después de redondear cada una.
- Minutos decimales como 29,4; 29,5 y 29,6: se redondean a 29, 30 y 30 respectivamente.
- Minutos 0,4: redondean a 0 y no suman.
- Sesión con minutos `true`, `[45]`, `null`, `{}` o un objeto: se ignora.
- Sesión con minutos en cadena numérica como `"45"` o `" 45 "`: se aplica `trim`, se interpreta como 45 y se redondea.
- Sesión con minutos en cadena vacía, con solo espacios o no numérica como `"abc"`: se ignora.
- Entrada de sesión que no sea objeto, como `null`, un array o un string: se ignora.
- Fecha con formato incorrecto o inexistente como `2026-02-30`: se ignora.
- Todas las sesiones de la semana inválidas: progreso 0.
- Sin sesiones y sin objetivo: estado sin objetivo, campo vacío y sin “0 / 0 min”.
- Sin sesiones y con objetivo: “0 / Y min”, barra vacía, “Faltan Y min” y objetivo visible en el campo.
- Objetivo de 1 minuto: válido.
- Objetivo de 10080 minutos: válido.
- Acumulado menor que el objetivo: “X / Y min” y “Faltan Z min”.
- Faltan exactamente 1 minuto: se muestra “Falta 1 min”.
- Objetivo cumplido exactamente: “Objetivo cumplido”, sin exceso, sin “+0 min”, “X / Y min” visible y barra al 100 %.
- Objetivo superado por 1 minuto: “Objetivo cumplido” y “+1 min”.
- Objetivo superado ampliamente: “Objetivo cumplido”, el texto muestra el exceso real y la barra sigue al 100 %.
- Campo vacío o con solo espacios: quita el objetivo.
- Campo con el texto exacto “0” o “ 0 ”: quita el objetivo.
- Campo con “00”: se rechaza por rango y no quita el objetivo.
- Campo con ceros a la izquierda como “0120”: se acepta como 120.
- Campo con letras, `+120`, `-120`, `120.5`, `1,200`, `1e2`, `1 200` o espacios internos: se rechaza con el mensaje de formato y no quita el objetivo.
- Campo con 10081 o más: se rechaza con el mensaje de rango y no quita el objetivo.
- Campo inválido: conserva el texto inválido, el objetivo vigente y el progreso; no modifica el almacenamiento.
- Carga con objetivo: el campo muestra el objetivo vigente.
- Guardado exitoso: el campo muestra el valor guardado.
- Quitado exitoso: el campo queda vacío.
- Guardado fallido: el campo conserva el valor intentado.
- Quitado fallido: el campo muestra el objetivo vigente.
- Guardar una sesión con un borrador no guardado en el campo de objetivo: el borrador no se sobrescribe.
- Clave del objetivo ausente: estado sin objetivo, sin `console.warn` y sin sobrescritura.
- Clave del objetivo presente y válida: se usa sin `console.warn`.
- Clave del objetivo presente con JSON inválido, `null`, array, cadena, objeto sin `objetivoMinutos` o `objetivoMinutos` inválido: estado sin objetivo, exactamente un `console.warn` por carga y sin sobrescritura.
- Clave del objetivo con `objetivoMinutos` como cadena numérica: se considera inválida.
- Clave del objetivo con propiedades adicionales válidas: se ignora el resto y se usa `objetivoMinutos`; un guardado explícito posterior escribe solo `{ objetivoMinutos }`.
- Clave del objetivo eliminada tras un quitado correcto: una carga posterior no genera `console.warn`.
- `localStorage` no disponible o con error al leer el objetivo: estado sin objetivo, exactamente un `console.warn` por carga y pantalla estable.
- Error al guardar el objetivo, por cuota o por permisos: mensaje “No se pudo actualizar el objetivo. Se mantiene el valor anterior.”, objetivo anterior conservado y campo con el valor intentado.
- Error al quitar el objetivo, por cuota o por permisos: mensaje “No se pudo actualizar el objetivo. Se mantiene el valor anterior.”, objetivo anterior conservado y campo con el objetivo vigente.
- Sesiones ilegibles o corruptas: la sección de objetivo sigue visible y usable con progreso 0, sin borrar ni sobrescribir sesiones; el registro de sesiones mantiene el bloqueo de guardado existente de `getSessions()`.
- Recarga de la página: el objetivo persiste y el progreso se recalcula con la semana y las sesiones actuales.
- Cambio de semana con la aplicación abierta: al volver a la pestaña o en la siguiente recalculación se muestra el progreso reiniciado y se conserva el objetivo.
- Quitar y volver a fijar el objetivo en la misma semana: el progreso se calcula con las sesiones existentes.
- Atajo rápido repetido con el mismo valor: se guarda una vez de forma idempotente y no se duplican mensajes ni anuncios.
- Sesiones heredadas futuras o con decimales: el progreso del objetivo difiere de “Minutos esta semana” según las reglas acordadas; la tarjeta existente no se modifica.
- Sesiones creadas por el formulario: progreso del objetivo y “Minutos esta semana” coinciden.
- Vista a 375 px y zoom de texto al 200 %: no hay scroll horizontal ni controles inaccesibles.
- Uso con teclado y lector de pantalla: el campo, el botón y los atajos son operables; las regiones anuncian lo que corresponde sin duplicados.

## Fuera de alcance

- Objetivos por materia, tema, día o tipo de sesión.
- Más de un objetivo simultáneo o un objetivo por semana histórica.
- Historial de objetivos, gráficos de cumplimiento pasado, promedios o comparaciones entre semanas.
- Rachas de cumplimiento del objetivo, insignias, puntos o gamificación.
- Notificaciones, recordatorios o alertas al alcanzar el objetivo.
- Sugerencias automáticas de objetivo o ajuste del objetivo según el histórico.
- Temporizador de medianoche o actualización continua sin interacción. La recalculación al volver a la pestaña mediante `visibilitychange` o `focus` sí está incluida.
- Actualizar el valor por defecto del formulario después de medianoche; es comportamiento existente y no se corrige.
- Sincronización entre dispositivos, cuentas o actualización en vivo entre pestañas.
- Exportación de objetivos o de estadísticas.
- Edición, eliminación o registro de sesiones desde la sección de objetivo.
- Cambios en el esquema de sesiones, en `diario-estudio-v1`, en las rachas, en la tarjeta “Minutos esta semana”, en el mapa de actividad o en el historial.
- Alinear la tarjeta “Minutos esta semana” con el progreso del objetivo o migrar sesiones heredadas futuras o con decimales.
- Cambios en la validación del formulario de sesiones.
- Confirmaciones modales, deshacer o papelera para quitar el objetivo.
- Cambios en la paleta general, en la tipografía o en el diseño de las secciones existentes.

## Criterios de finalización

- Todos los requisitos funcionales y no funcionales están implementados y verificados.
- Las pruebas automáticas existentes pasan y las nuevas cubren: límites de la semana, cálculo y redondeo de minutos, tipos de minutos admitidos y rechazados, redondeo de 0,4 a 0, sesiones futuras y fuera de semana, fechas inválidas, validación del campo con vacío, “0”, “00”, formato y rango, estados sin objetivo, en curso, faltan 1 minuto, cumplido exacto sin `+0 min` y superado con `+N min`, persistencia, ausencia sin warning, clave inválida con un warning, propiedades adicionales, ciclo de vida del campo y evaluación de estados.
- Las pruebas nuevas usan lógica pura exportable a Node, con `today` y un adaptador de storage inyectables, y reutilizan `parseDateKey`, `startOfWeekMonday` y el redondeo de minutos existentes.
- La verificación manual confirma: carga sin objetivo y sin warning, carga con objetivo y campo poblado, progreso en curso, objetivo cumplido exacto, objetivo superado, cambio de objetivo, quitado, persistencia tras recargar y reinicio al volver a la pestaña después de un cambio de semana.
- La verificación manual confirma el ciclo de vida del campo: valor vigente al cargar, valor guardado tras guardar, campo vacío tras quitar, valor intentado tras guardado fallido, objetivo vigente tras quitado fallido, y borrador no guardado conservado al guardar una sesión.
- La verificación manual confirma que un almacenamiento corrupto existente muestra el estado sin objetivo con exactamente un aviso, que una clave ausente no genera aviso y que una carga posterior a un quitado correcto tampoco genera aviso.
- La verificación manual confirma que las sesiones ilegibles muestran progreso 0, no se borra ni se sobrescribe nada y se conserva el bloqueo de guardado existente de `getSessions()`.
- La verificación manual con cuota simulada confirma que un fallo de `saveSessions()` no muestra “Sesión guardada correctamente”, no recalcula el objetivo, no sobrescribe el borrador del campo de objetivo y no altera las sesiones almacenadas.
- La verificación manual con 10.000 sesiones confirma resultados correctos y ausencia de bloqueo perceptible.
- La vista a 375 px no presenta desplazamiento horizontal ni recortes, y el zoom de texto al 200 % mantiene el contenido operativo.
- La sección es operable con teclado y lector de pantalla; el progreso expone rol y valores accesibles; las regiones de formulario y objetivo anuncian lo que corresponde sin duplicados; el foco es visible; Lighthouse de accesibilidad se mantiene en 100.
- La consola no muestra errores no controlados durante la carga, el registro de sesiones, la edición, el quitado ni la validación.
- Las rachas, la tarjeta “Minutos esta semana”, el mapa de actividad y el historial siguen produciendo los mismos resultados antes y después de fijar, cambiar o quitar el objetivo.
- La regresión documenta que el progreso del objetivo y “Minutos esta semana” difieren con sesiones heredadas futuras o decimales, y coinciden con sesiones creadas por el formulario.
- Se verifica que la clave `diario-estudio-v1` conserva exactamente su contenido después de todas las operaciones del objetivo.
- Se verifica que un guardado explícito del objetivo escribe exactamente `{ objetivoMinutos }` y descarta propiedades adicionales.
- La documentación del proyecto queda actualizada.

## Decisiones resueltas

- **Nombre y ubicación**: la sección se llama “Objetivo semanal” y se inserta entre “Rachas” y “Mapa de actividad”, sin mover las demás secciones.
- **Alcance del objetivo**: es un único objetivo global en minutos para la semana en curso. No hay objetivos por materia, por día ni por semana histórica.
- **Semana**: lunes a domingo en fecha local, con la misma convención que el mapa. El objetivo persiste entre semanas y el progreso se calcula solo con la semana actual.
- **Fecha registrada y formulario**: no se desplaza por zona horaria la fecha registrada de una sesión. El valor por defecto del formulario puede quedar obsoleto después de medianoche; es comportamiento existente y queda fuera de alcance. El objetivo usa la fecha local del momento del recálculo.
- **Reinicio semanal**: no se agrega temporizador de medianoche. Se recalcula al cargar, tras un guardado confirmado de sesión, al guardar o quitar el objetivo y al volver a la pestaña mediante `visibilitychange` o `focus`. Cada recalculación usa la fecha local actual.
- **Progreso**: se aceptan solo minutos de tipo `number` finito o `string` numérico con `trim`; se ignoran booleanos, `null`, arrays, objetos, entradas que no sean objetos y fechas inválidas. Se excluyen futuras, se redondea cada sesión con `Math.round` antes de sumar, 0,4 redondea a 0 y no suma, y las sesiones inválidas o fuera de la semana se ignoran sin modificar datos.
- **Convivencia con “Minutos esta semana”**: la tarjeta existente no se modifica. Puede diferir del progreso del objetivo cuando haya sesiones heredadas futuras o con decimales, porque la tarjeta existente incluye futuras y no redondea. Solo coinciden cuando todas las sesiones de la semana fueron creadas por el formulario, es decir, son enteras y no futuras.
- **Textos de estado**: sin objetivo, “Aún no tienes objetivo semanal” y “Fija cuántos minutos quieres estudiar esta semana.”; mientras exista objetivo, “X / Y min” siempre visible; si X < Y, “Faltan Z min” o “Falta 1 min” si Z es 1; si X = Y, “Objetivo cumplido” sin exceso; si X > Y, “Objetivo cumplido” y “+N min” con N mayor que 0.
- **Cumplimiento exacto**: no se muestra “+0 min”. El titular “Objetivo cumplido” se usa tanto en el cumplimiento exacto como en el superado.
- **Barra de progreso**: el ancho visual se limita al 100 %; el texto conserva el acumulado real. El rol es `progressbar`, con `aria-valuemin` 0, `aria-valuemax` igual al objetivo y `aria-valuenow` igual al acumulado limitado al objetivo.
- **Contrato de entrada**: el campo usa `type="text"` con `inputmode="numeric"`; si está dentro de un formulario, se usa `novalidate`. Se valida el string crudo después de `trim`: vacío quita, el texto exacto “0” quita, y cualquier otro valor debe cumplir `^[0-9]+$` y estar entre 1 y 10080. Se rechazan letras, signos, decimales, separadores de miles, notación exponencial y espacios internos con mensaje visible. Un texto inválido nunca se interpreta como vacío ni quita el objetivo. “00” y otros valores que representen 0 pero no sean exactamente “0” se rechazan por rango.
- **Mensajes de validación**: formato inválido, “Ingresa un número entero de minutos mayor que 0.”; fuera de rango, “El objetivo debe estar entre 1 y 10080 minutos.” Un texto inválido conserva el objetivo vigente y el texto en el campo para corrección.
- **Ciclo de vida del campo**: al cargar muestra el objetivo vigente; tras guardado exitoso muestra el valor guardado; tras quitado exitoso queda vacío; tras guardado fallido conserva el valor intentado; tras quitado fallido muestra el objetivo vigente. El campo solo se actualiza al cargar, tras guardar o quitar el objetivo, o ante un error. Guardar una sesión no sobrescribe un borrador no guardado. Solo un vaciado explícito de la persona ejecuta el quitado.
- **Atajos rápidos**: “120 min”, “300 min” y “600 min” actualizan el campo, guardan el objetivo y anuncian “Objetivo semanal guardado.” en una sola acción. Los guardados repetidos del mismo valor son idempotentes y no duplican mensajes ni anuncios.
- **Persistencia**: la clave es `diario-estudio-goal-v1`, con el objeto `{ "objetivoMinutos": <entero entre 1 y 10080> }`. Quitar el objetivo elimina la clave. La ausencia de la clave no genera warning.
- **Clave ausente o inválida**: si la clave no existe, se muestra el estado sin objetivo sin `console.warn`. Si existe pero es ilegible o inválida, se muestra el estado sin objetivo, se registra exactamente un `console.warn` por carga y no se sobrescribe hasta un guardado o quitado explícito. Si `getItem` falla, se trata como clave ilegible y se avisa exactamente una vez; si devuelve `null`, se trata como ausencia y no se avisa. Si la clave existe y es válida, se usa sin aviso.
- **Datos almacenados**: se acepta solo un número entero en `objetivoMinutos`; las cadenas numéricas se consideran inválidas. Las propiedades adicionales se ignoran al leer, pero un guardado explícito escribe exactamente `{ objetivoMinutos }` y las descarta.
- **Fallo de guardado o quitado**: se muestra “No se pudo actualizar el objetivo. Se mantiene el valor anterior.”, se conserva el objetivo vigente y no se deja la tarjeta inconsistente. Tras un guardado fallido, el campo conserva el valor intentado; tras un quitado fallido, el campo muestra el objetivo vigente.
- **Sesiones ilegibles**: el objetivo se mantiene visible y usable, y el progreso se muestra como 0; no se borra ni se sobrescribe la clave de sesiones. Se conserva el bloqueo de guardado existente de `getSessions()` cuando no puede leer el array, para no sobrescribir los datos originales. Un error de la clave del objetivo no activa ese bloqueo (RF-14).
- **Quitar el objetivo**: no hay confirmación modal ni papelera; la acción es inmediata, elimina la clave y muestra “Objetivo semanal eliminado.”. La carga posterior sin clave no genera warning.
- **Formato de minutos y textos**: enteros sin decimales y sin separador de miles. Todos los textos de la sección nueva usan tuteo, por ejemplo “Fija”, “Ingresa” y “selecciona”.
- **Accesibilidad y anuncios**: hay una región `aria-live="polite"` para los mensajes del formulario de sesión y otra para los mensajes y el estado del objetivo. La primera anuncia solo el resultado de guardar sesión; la segunda anuncia guardar o quitar objetivo, errores del objetivo y cambios de progreso. La barra no tiene `aria-live` propio y usa `aria-valuetext` para lectura bajo demanda. No se anuncia cada pulsación y no se duplican anuncios.
- **Integración con guardado de sesión**: `saveSessions()` debe devolver un estado de éxito booleano o equivalente. El manejador del formulario condiciona el recálculo del objetivo y el mensaje “Sesión guardada correctamente” a ese resultado. Es una corrección de integración y no cambia las validaciones del formulario ni el esquema de sesiones.
- **Testabilidad**: la lógica de semana, progreso, redondeo, validación y estados debe ser pura y exportable a Node en un módulo nuevo o reutilizando `heatmap.js`, con `today` y un adaptador de storage inyectables. Debe reutilizar `parseDateKey`, `startOfWeekMonday` y el redondeo de minutos existentes para no duplicar reglas.
- **Compatibilidad**: la funcionalidad solo lee sesiones. No escribe en `diario-estudio-v1`, no migra datos y no altera rachas, tarjeta “Minutos esta semana”, mapa ni historial. La diferencia esperada entre el progreso del objetivo y “Minutos esta semana” se documenta y se verifica.

## Dudas abiertas

Ninguna.
