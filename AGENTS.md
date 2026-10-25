# AGENTS.md

## Repo layout
- `index.html` - UI: form (fecha/materia/tema/minutos), streaks (actual + histórica), history list
- `styles.css` - styles
- `app.js` - logic and localStorage

## How to run
Open `index.html` directly in a browser. No build, no server required.

## Data/storage
- Key: `diario-estudio-v1` (JSON array in localStorage)
- Each session: `{ id, fecha (YYYY-MM-DD), materia, tema, minutos, createdAt }`
- Dates are stored/parsed as local dates (input `type=date` value used directly). Avoid UTC conversion.

## Gotchas
- **Date handling**: Parse `YYYY-MM-DD` by splitting to `new Date(y,m-1,d)`. Don't use `new Date(dateString)` for date-only strings (can shift due to TZ).
- **Future dates**: Form blocks `sessionDate > today` and streak calculations ignore future dates.
- **Streak actual**: Consecutive days counting backward from today. If today has no session, streak starts from most recent consecutive chain going backward (logic in `calculateStreak()`).
- **Mejor racha histórica**: Longitud máxima de días consecutivos con al menos una sesión. Usa fechas locales, ignora futuras, días únicos (múltiples sesiones mismo día = 1 día). Calcula en orden cronológico buscando huecos. Se actualiza al guardar e inicializar.
- **XSS**: `escapeHtml()` used when rendering history.

## Verification
No lint/test/typecheck scripts. Manual: add sessions, verify both streaks update, refresh page (persistence), try future date (blocked), add multiple sessions same day (shouldn't increase streak).
