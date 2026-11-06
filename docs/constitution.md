# Constitución

1. **Stack**: HTML/CSS/JS vanilla, sin dependencias ni build; se abre `index.html` directo.
2. **Spec y código**: todo cambio actualiza `AGENTS.md`/`MEMORY.md`; nada fuera de spec sin aprobación.
3. **Lógica**: fechas locales `AAAA-MM-DD` (nunca `new Date(string)` ni `toISOString()`); rachas ignoran futuras y cuentan días únicos.
4. **Interfaz**: a 375 px sin scroll horizontal, accesible (labels, `aria-live`) y consola sin errores.
5. **Tests**: ninguna funcionalidad sin verificación; mínimo manual con Chrome DevTools (alta, ambas rachas, persistencia, fechas futuras).
6. **Datos e idioma**: no borrar ni migrar `diario-estudio-v1` sin consentimiento; UI, mensajes y docs en español; escapar datos del usuario.
