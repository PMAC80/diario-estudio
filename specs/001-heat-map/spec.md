# Spec 001 — Mapa de calor de días estudiados

## Contexto y objetivo

El Diario de Estudio ya registra sesiones con fecha, materia, tema y minutos, y muestra rachas y un historial. Hoy no existe una vista que permita percibir de un vistazo la constancia a lo largo del tiempo.

El objetivo es incorporar un mapa de calor tipo GitHub que muestre los días estudiados de las últimas 12 semanas, donde la intensidad del color de cada día aumente con los minutos totales estudiados ese día. La funcionalidad debe ayudar a detectar patrones de constancia sin modificar ni interrumpir el flujo actual de registro.

## Usuarios

- **Persona que registra sus sesiones de estudio**: consulta su constancia reciente y detecta días o semanas con poca actividad.
- **Persona que retoma el hábito**: necesita una señal visual rápida de su progreso reciente.
- **Persona que usa la app en el móvil**: consulta el mapa desde una pantalla estrecha y con interacción táctil.

## Historias de usuario

- **HU-1**: Como persona que estudia, quiero ver un mapa de las últimas 12 semanas para entender de un vistazo mi constancia reciente.
- **HU-2**: Como persona que estudia, quiero que los días con más minutos se vean más intensos para distinguir esfuerzo alto de esfuerzo bajo.
- **HU-3**: Como persona que estudia, quiero consultar la fecha y los minutos de un día concreto para verificar qué registré.
- **HU-4**: Como persona que estudia, quiero que el mapa se actualice al guardar una sesión para ver el efecto de inmediato.
- **HU-5**: Como persona que usa el móvil o el teclado, quiero poder consultar el detalle de cada día sin depender del ratón.
- **HU-6**: Como persona que vuelve tras una pausa, quiero que los días sin estudio y los futuros se distingan claramente para no interpretar mal el mapa.

## Requisitos funcionales

### RF-1 — Período mostrado
El sistema debe mostrar un mapa de calor con una casilla por cada día de las últimas 12 semanas calendario, de lunes a domingo, incluyendo la semana actual.

**Criterios de aceptación (EARS)**
- El sistema debe presentar la sección con el nombre “Mapa de actividad”.
- El sistema debe ubicar el mapa entre la sección de rachas y el formulario de registro.
- El sistema debe mostrar exactamente 84 días: 12 semanas completas de lunes a domingo.
- Cuando la semana actual esté en curso, el sistema debe mostrar la semana actual completa, incluidos los días posteriores a hoy.
- El sistema debe ordenar los días cronológicamente de más antiguo a más reciente.
- El sistema debe determinar el período usando la fecha local del dispositivo, sin desplazamientos por zona horaria.

### RF-2 — Intensidad según minutos totales
El sistema debe asignar a cada día uno de cuatro niveles de intensidad según la suma de minutos de todas las sesiones de ese día: 1–29, 30–59, 60–119 y 120 o más minutos.

**Criterios de aceptación (EARS)**
- Cuando un día tenga entre 1 y 29 minutos sumados, el sistema debe mostrarlo con el nivel de intensidad 1.
- Cuando un día tenga entre 30 y 59 minutos sumados, el sistema debe mostrarlo con el nivel de intensidad 2.
- Cuando un día tenga entre 60 y 119 minutos sumados, el sistema debe mostrarlo con el nivel de intensidad 3.
- Cuando un día tenga 120 minutos o más sumados, el sistema debe mostrarlo con el nivel de intensidad 4.
- Cuando un día tenga varias sesiones, el sistema debe sumar sus minutos antes de asignar el nivel.
- Cuando una sesión tenga minutos decimales, el sistema debe redondearlos al entero más cercano antes de sumar.
- Si la suma de minutos de un día es 0 después del redondeo, el sistema debe mostrarlo como “sin estudio”.
- Si un día tiene minutos en un valor límite (29, 30, 59, 60, 119 o 120), el sistema debe aplicar el nivel correspondiente al intervalo que incluye ese valor.

### RF-3 — Días sin estudio
El sistema debe distinguir visualmente los días sin sesiones de los días con estudio.

**Criterios de aceptación (EARS)**
- Cuando un día del período no tenga sesiones, el sistema debe mostrarlo con el estilo de “sin estudio”, diferente de los cuatro niveles de intensidad.
- El sistema debe mantener visible la casilla de cada día sin estudio, sin omitirla del mapa.

### RF-4 — Días futuros
El sistema debe tratar los días posteriores a hoy como días futuros, atenuados y no interactivos.

**Criterios de aceptación (EARS)**
- Mientras un día sea posterior a hoy, el sistema debe mostrarlo atenuado.
- Mientras un día sea posterior a hoy, el sistema no debe mostrar su detalle ni permitir interacción con él.
- Si existiera una sesión almacenada con fecha futura, el sistema debe ignorarla a efectos visuales y no debe modificar ni eliminar esa sesión.
- El sistema debe distinguir visualmente un día futuro de un día pasado sin estudio.

### RF-5 — Detalle por día
El sistema debe permitir consultar la fecha y los minutos totales de cada día no futuro.

**Criterios de aceptación (EARS)**
- Cuando la persona señale un día con el puntero, el sistema debe mostrar su fecha y sus minutos totales, o “Sin estudio” si no tiene sesiones.
- Cuando la persona enfoque un día con el teclado, el sistema debe mostrar el mismo detalle que con el puntero.
- Cuando la persona toque un día en una pantalla táctil, el sistema debe mostrar el mismo detalle que con el puntero.
- Cuando la persona toque otro día o toque fuera del mapa, el sistema debe cerrar el detalle abierto.
- Cuando el día consultado sea futuro, el sistema no debe mostrar detalle.
- El sistema debe expresar los minutos totales como un número entero de minutos.

### RF-6 — Leyenda
El sistema debe mostrar una leyenda que explique la escala de colores.

**Criterios de aceptación (EARS)**
- El sistema debe mostrar una leyenda con los cuatro niveles de intensidad y el estado “sin estudio”.
- El sistema debe asociar cada elemento de la leyenda con su rango de minutos o con el estado “sin estudio”.
- El sistema debe mantener la leyenda visible junto al mapa en todo momento.

### RF-7 — Actualización de datos
El sistema debe reflejar los datos registrados al cargar la vista y después de guardar una sesión.

**Criterios de aceptación (EARS)**
- Cuando la aplicación termine de cargar, el sistema debe mostrar el mapa calculado con las sesiones existentes.
- Cuando la persona guarde una sesión válida, el sistema debe actualizar el mapa sin requerir recargar la página.
- Cuando la persona guarde una sesión con fecha fuera de las últimas 12 semanas, el sistema debe actualizar el mapa sin incluir esa sesión en el período visible.
- Si falla la lectura de las sesiones almacenadas, el sistema debe mostrar el mapa con todos los días sin estudio, registrar un aviso en consola y no debe romper la pantalla ni borrar ni alterar los datos existentes.

### RF-8 — Accesibilidad del mapa
El sistema debe hacer que el mapa sea comprensible y operable sin depender exclusivamente del color o del ratón.

**Criterios de aceptación (EARS)**
- El sistema debe asignar a cada día un nombre accesible que incluya la fecha y sus minutos totales, o “Sin estudio”.
- El sistema debe permitir recorrer los días no futuros con el teclado y mostrar un indicador de foco visible.
- El sistema debe transmitir los niveles de intensidad mediante la leyenda y el detalle, sin depender solo del color.
- El sistema debe anunciar el detalle del día enfocado a las tecnologías de asistencia.
- El sistema no debe incluir los días futuros en el recorrido interactivo.

### RF-9 — Robustez ante datos inválidos
El sistema debe ignorar los datos que no pueda interpretar sin afectar al resto del mapa.

**Criterios de aceptación (EARS)**
- Si una sesión tiene una fecha con formato distinto de `AAAA-MM-DD` o una fecha inexistente, el sistema debe ignorarla para el cálculo del mapa.
- Si una sesión tiene minutos no numéricos, no finitos o menores o iguales a 0, el sistema debe ignorarla para el cálculo del mapa.
- Cuando una sesión tenga minutos decimales positivos, el sistema debe redondearlos al entero más cercano en lugar de ignorarla.
- Si todas las sesiones de un día son inválidas, el sistema debe mostrar ese día como “sin estudio”.
- El sistema no debe modificar, reparar ni eliminar las sesiones inválidas.

### RF-10 — Estado sin sesiones
El sistema debe mostrar el mapa aunque no exista ninguna sesión registrada.

**Criterios de aceptación (EARS)**
- Cuando no exista ninguna sesión, el sistema debe mostrar las 12 semanas con todos los días pasados y presentes como “sin estudio”.
- Cuando no exista ninguna sesión, el sistema debe mantener visibles la leyenda y los días futuros atenuados.

## Requisitos no funcionales

- **RNF-1 — Claridad visual**: los cinco estados (sin estudio y cuatro niveles) deben ser distinguibles entre sí a simple vista, incluida la diferencia entre día futuro y día pasado sin estudio.
- **RNF-2 — Contraste y accesibilidad**: el texto y los elementos interactivos deben cumplir contraste WCAG 2.1 AA, tener foco visible y áreas táctiles adecuadas.
- **RNF-3 — Responsive**: el mapa debe funcionar a 375 px de ancho sin provocar desplazamiento horizontal ni recortes.
- **RNF-4 — Rendimiento**: el mapa debe actualizarse sin bloqueos perceptibles con hasta 10.000 sesiones almacenadas.
- **RNF-5 — Idioma y fechas**: toda la interfaz, la leyenda, el detalle y los mensajes deben estar en español; las fechas deben presentarse en formato local legible y calcularse sin conversión UTC.
- **RNF-6 — Integridad de datos**: la funcionalidad es de solo lectura sobre las sesiones existentes; no debe borrar, mover ni migrar datos.
- **RNF-7 — Estabilidad**: la carga y la interacción con el mapa no deben generar errores en consola.
- **RNF-8 — Consistencia**: el mapa debe convivir con las rachas y el historial sin alterar sus cálculos ni su comportamiento.

## Casos límite

- Varias sesiones el mismo día: se suman antes de asignar intensidad.
- Valores exactos en los límites: 1, 29, 30, 59, 60, 119 y 120 minutos.
- Día con una sesión de 0 minutos o con minutos negativos en datos preexistentes: la sesión se ignora para el mapa.
- Día con minutos decimales positivos en datos preexistentes: se redondean al entero más cercano antes de sumar; si el total queda en 0, se muestra como “sin estudio”.
- Sesiones con fecha anterior al inicio de las 12 semanas: no se muestran, pero no se eliminan.
- Sesiones con fecha futura almacenadas: se ignoran visualmente y no se eliminan.
- Semanas que cruzan un cambio de mes o de año: se muestran y ordenan correctamente.
- Cambio de horario de verano o zona horaria: la fecha del día se determina en hora local y no debe desplazarse.
- Almacenamiento vacío, corrupto o inaccesible: mapa con días “sin estudio”, sin borrar datos y sin errores no controlados.
- Sesión guardada justo después de medianoche: se asigna al día local en que se registra.
- Textos muy largos en el detalle: no deben romper el diseño.
- Navegación por teclado y toque en móvil: el detalle debe ser accesible y descartable.

## Fuera de alcance

- Editar, eliminar o registrar sesiones desde el mapa.
- Filtrar el mapa por materia o tema.
- Ventana temporal configurable o distinta de 12 semanas.
- Comparaciones entre períodos, promedios, objetivos o estadísticas adicionales.
- Exportar el mapa como imagen o datos.
- Notificaciones, recordatorios o gamificación.
- Sincronización entre dispositivos o actualización en vivo entre pestañas.
- Cambios en la lógica de rachas, historial o minutos semanales.
- Cambios en el esquema de datos o en la forma de almacenar las sesiones.
- Selección de paleta, animaciones o detalles visuales concretos.

## Criterios de finalización

- Todos los requisitos funcionales y no funcionales están implementados y verificados.
- Las pruebas automáticas existentes pasan y las nuevas cubren los límites de intensidad, suma de sesiones, días futuros y datos inválidos.
- La verificación manual confirma: carga con y sin sesiones, actualización tras guardar, detalle con ratón, teclado y toque, y leyenda correcta.
- Ante datos corruptos se muestra el mapa vacío con un aviso en consola, sin romper la pantalla.
- La vista a 375 px no presenta desplazamiento horizontal ni recortes.
- La consola no muestra errores durante la carga ni la interacción.
- Las rachas, los minutos semanales y el historial siguen funcionando igual que antes.
- La documentación del proyecto queda actualizada.

## Decisiones resueltas

- Ubicación: entre las rachas y el formulario.
- Minutos 0 o decimales: se ignoran las sesiones con minutos menores o iguales a 0; los decimales positivos se redondean al entero más cercano.
- Cierre del detalle en móvil: al tocar otro día o al tocar fuera del mapa.
- Nombre de la sección: “Mapa de actividad”.
- Datos corruptos: mapa vacío y aviso por consola, sin romper la pantalla.

## Dudas abiertas

Ninguna pendiente.
