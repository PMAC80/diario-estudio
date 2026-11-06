---
name: local-dates
description: Manejo de fechas del Diario de Estudio. Úsala al tocar fechas o rachas.
---
## Reglas
- Fechas como texto AAAA-MM-DD en hora local.
- Para hoy: getFullYear(), getMonth() + 1 y getDate().
- Nunca new Date("AAAA-MM-DD") ni toISOString().
- Sumar días con setDate(), no con milisegundos.
