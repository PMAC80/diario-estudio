# MEMORY.md

## Estado
- Proyecto: Diario de Estudio (prototipo funcional)
- Archivos: index.html, styles.css, app.js, AGENTS.md, MEMORY.md
- Storage: localStorage `diario-estudio-v1`
- Sin dependencias, sin build

## Implementado
- Formulario para registrar sesión (Fecha, Materia, Tema, Minutos) con validación
- Historial de sesiones en lista limpia, ordenado desc por fecha
- Cálculo y visualización de racha actual de días consecutivos
- Cálculo y visualización de mejor racha histórica
- Persistencia en localStorage
- Bloqueo de fechas futuras
- Manejo de fechas sin desfase UTC (parseo local)
- Diseño responsive y accesible

## Pendiente / Notas
- Sin tests
- Sin linting
- Verificación manual: abrir index.html en navegador, verificar ambas rachas, persistencia, fechas futuras bloqueadas, múltiples sesiones mismo día
