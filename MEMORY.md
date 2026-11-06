# MEMORY.md

## Estado
- Proyecto: Diario de Estudio (prototipo funcional)
- Archivos: index.html, styles.css, app.js, heatmap.js, tests/heatmap.test.js, AGENTS.md, MEMORY.md
- Storage: localStorage `diario-estudio-v1`
- Sin dependencias, sin build
- Spec 001 (mapa de actividad): T1–T17 completadas y verificadas.

## Implementado
- Formulario para registrar sesión (Fecha, Materia, Tema, Minutos) con validación
- Historial de sesiones en lista limpia, ordenado desc por fecha
- Cálculo y visualización de racha actual de días consecutivos
- Cálculo y visualización de mejor racha histórica
- Minutos totales de la semana actual (lunes a domingo)
- Persistencia en localStorage
- Bloqueo de fechas futuras
- Manejo de fechas sin desfase UTC (parseo local)
- Diseño responsive y accesible
- Mapa de actividad de 12 semanas (84 días) con niveles por minutos, leyenda, detalle accesible, días futuros atenuados y navegación por teclado/toque
- Actualización del mapa al cargar y después de guardar una sesión
- Almacenamiento corrupto: mapa vacío, `console.warn` una vez y bloqueo de guardado para no sobrescribir datos
- Tests puros del mapa: 26 pruebas con `node --test`

## Verificación
- `node --test`: 26/26 pruebas pasan.
- Chrome DevTools: carga vacía, tres sesiones, actualización tras guardar, persistencia, fuera de ventana, hover/foco/toque, cierre de detalle, futuros no interactivos, teclado y consola sin errores.
- Almacenamiento corrupto: JSON inválido conserva el valor original, mapa vacío y un único warning.
- Rendimiento: render del mapa con 10.000 sesiones en ~68 ms.
- Móvil 375 px: 84 celdas, 12 columnas, sin scroll horizontal.
- Lighthouse móvil: accesibilidad 100, best practices 100. Los avisos de SEO/agentic no aplican a una app local `file://`.

## Pendiente / Notas
- Sin pendientes funcionales conocidos.
- Sin linting.
- Verificación manual: abrir index.html, registrar sesiones y comprobar rachas, historial, minutos semanales y mapa.
