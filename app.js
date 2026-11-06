const STORAGE_KEY = 'diario-estudio-v1';

// Elementos del DOM
const studyForm = document.getElementById('studyForm');
const fechaInput = document.getElementById('fecha');
const materiaInput = document.getElementById('materia');
const temaInput = document.getElementById('tema');
const minutosInput = document.getElementById('minutos');
const formMessage = document.getElementById('formMessage');
const historyList = document.getElementById('historyList');
const historyEmpty = document.getElementById('historyEmpty');
const streakDisplay = document.getElementById('streakDisplay');
const bestStreakDisplay = document.getElementById('bestStreakDisplay');
const weeklyMinutesDisplay = document.getElementById('weeklyMinutesDisplay');
const weeklyMinutesDetail = document.getElementById('weeklyMinutesDetail');
const heatmapGrid = document.getElementById('heatmapGrid');
const heatmapLegend = document.getElementById('heatmapLegend');
const heatmapDetail = document.getElementById('heatmapDetail');
const heatmapSection = document.querySelector('.heatmap-section');

const HEATMAP_DEFAULT_DETAIL = 'Seleccioná un día para ver el detalle.';
let heatmapDaysByKey = new Map();
let pinnedHeatmapDateKey = null;
let storageReadFailed = false;
let storageWarningShown = false;

// Inicializar fecha con fecha actual
function initializeDate() {
    const today = new Date();
    // Usar formato YYYY-MM-DD para input type date (evita problemas UTC)
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    fechaInput.value = `${year}-${month}-${day}`;
}

function warnStorageRead(error) {
    if (storageWarningShown) {
        return;
    }

    storageWarningShown = true;
    console.warn(
        'No se pudieron leer las sesiones guardadas. Se muestra el mapa vacío y no se modifican los datos existentes.',
        error
    );
}

// Obtener sesiones desde localStorage
function getSessions() {
    try {
        const data = localStorage.getItem(STORAGE_KEY);
        if (!data) {
            storageReadFailed = false;
            return [];
        }

        const sessions = JSON.parse(data);
        if (!Array.isArray(sessions)) {
            storageReadFailed = true;
            warnStorageRead(new Error('El almacenamiento no contiene una lista de sesiones.'));
            return [];
        }

        storageReadFailed = false;
        return sessions;
    } catch (error) {
        storageReadFailed = true;
        warnStorageRead(error);
        return [];
    }
}

// Guardar sesiones en localStorage
function saveSessions(sessions) {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions));
    } catch (error) {
        console.error('Error al guardar sesiones:', error);
        showFormMessage('Error al guardar la sesión', 'error');
    }
}

// Mostrar mensaje en el formulario
function showFormMessage(message, type) {
    formMessage.textContent = message;
    formMessage.className = 'form-message';
    if (type === 'success') {
        formMessage.classList.add('success');
    } else if (type === 'error') {
        formMessage.classList.add('error');
    }
    // Limpiar mensaje después de 3 segundos
    setTimeout(() => {
        formMessage.textContent = '';
        formMessage.className = 'form-message';
    }, 3000);
}

// Formatear fecha para mostrar (evita UTC)
function formatDateForDisplay(dateString) {
    // Parsear la fecha como local (YYYY-MM-DD)
    const [year, month, day] = dateString.split('-').map(Number);
    const date = new Date(year, month - 1, day);
    return date.toLocaleDateString('es-ES', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });
}

// Renderizar historial
function renderHistory() {
    const sessions = getSessions();
    
    // Ordenar por fecha descendente (más reciente primero)
    const sortedSessions = [...sessions].sort((a, b) => {
        return new Date(b.fecha + 'T00:00:00') - new Date(a.fecha + 'T00:00:00');
    });
    
    // Mostrar/ocultar estado vacío
    if (sortedSessions.length === 0) {
        historyEmpty.classList.remove('hidden');
        historyList.innerHTML = '';
        return;
    }
    
    historyEmpty.classList.add('hidden');
    historyList.innerHTML = '';
    
    sortedSessions.forEach(session => {
        const li = document.createElement('li');
        li.className = 'history-item';
        
        li.innerHTML = `
            <div class="history-item-header">
                <span class="history-item-date">${formatDateForDisplay(session.fecha)}</span>
                <span class="history-item-minutes">${session.minutos} min</span>
            </div>
            <div class="history-item-body">
                <div class="history-item-materia">${escapeHtml(session.materia)}</div>
                <div class="history-item-tema">${escapeHtml(session.tema)}</div>
            </div>
        `;
        
        historyList.appendChild(li);
    });
}

function renderHeatmapLegend() {
    if (!heatmapLegend || typeof Heatmap === 'undefined') {
        return;
    }

    heatmapLegend.innerHTML = '';

    Heatmap.LEVELS.forEach(item => {
        const legendItem = document.createElement('span');
        legendItem.className = 'heatmap-legend-item';
        legendItem.setAttribute('role', 'listitem');

        const swatch = document.createElement('span');
        swatch.className = `heatmap-legend-swatch level-${item.level}`;
        swatch.setAttribute('aria-hidden', 'true');

        const label = document.createElement('span');
        label.textContent = item.label;

        legendItem.appendChild(swatch);
        legendItem.appendChild(label);
        heatmapLegend.appendChild(legendItem);
    });

    const futureItem = document.createElement('span');
    futureItem.className = 'heatmap-legend-item';
    futureItem.setAttribute('role', 'listitem');

    const futureSwatch = document.createElement('span');
    futureSwatch.className = 'heatmap-legend-swatch is-future';
    futureSwatch.setAttribute('aria-hidden', 'true');

    const futureLabel = document.createElement('span');
    futureLabel.textContent = 'Futuro';

    futureItem.appendChild(futureSwatch);
    futureItem.appendChild(futureLabel);
    heatmapLegend.appendChild(futureItem);
}

function renderHeatmap() {
    if (!heatmapGrid || typeof Heatmap === 'undefined') {
        return;
    }

    const sessions = getSessions();
    const days = Heatmap.buildHeatmapDays(sessions, new Date());

    heatmapDaysByKey = new Map(days.map(day => [day.dateKey, day]));
    pinnedHeatmapDateKey = null;
    heatmapGrid.innerHTML = '';

    days.forEach(day => {
        const cell = document.createElement(day.isFuture ? 'span' : 'button');
        const stateClasses = [`level-${day.level}`];

        if (day.isFuture) {
            stateClasses.push('is-future');
        }

        if (day.isToday) {
            stateClasses.push('is-today');
        }

        cell.className = `heatmap-cell ${stateClasses.join(' ')}`;
        cell.dataset.dateKey = day.dateKey;

        if (day.isFuture) {
            cell.setAttribute('aria-hidden', 'true');
        } else {
            cell.type = 'button';
            cell.tabIndex = -1;
            cell.setAttribute('aria-label', Heatmap.getAccessibleLabel(day));
        }

        heatmapGrid.appendChild(cell);
    });

    const firstCell = heatmapGrid.querySelector('button.heatmap-cell');
    if (firstCell) {
        firstCell.tabIndex = 0;
    }

    renderHeatmapLegend();

    if (heatmapDetail) {
        heatmapDetail.textContent = HEATMAP_DEFAULT_DETAIL;
    }
}

function getHeatmapCell(target) {
    if (!(target instanceof Element)) {
        return null;
    }

    return target.closest('.heatmap-cell');
}

function getHeatmapDayFromCell(cell) {
    if (!cell || !cell.dataset.dateKey) {
        return null;
    }

    return heatmapDaysByKey.get(cell.dataset.dateKey) || null;
}

function showHeatmapDetail(day) {
    if (!heatmapDetail || !day || day.isFuture) {
        return;
    }

    heatmapDetail.textContent = Heatmap.formatDetail(day);
}

function setHeatmapDefaultDetail() {
    if (heatmapDetail) {
        heatmapDetail.textContent = HEATMAP_DEFAULT_DETAIL;
    }
}

function resetHeatmapSelection() {
    pinnedHeatmapDateKey = null;
    setHeatmapDefaultDetail();
}

function restoreHeatmapDetail() {
    if (!pinnedHeatmapDateKey) {
        setHeatmapDefaultDetail();
        return;
    }

    const day = heatmapDaysByKey.get(pinnedHeatmapDateKey);
    if (day) {
        showHeatmapDetail(day);
    } else {
        resetHeatmapSelection();
    }
}

function focusHeatmapCell(cells, index) {
    const target = cells[index];
    if (!target) {
        return;
    }

    target.tabIndex = 0;
    target.focus();
}

if (heatmapGrid) {
    heatmapGrid.addEventListener('pointerover', event => {
        const cell = getHeatmapCell(event.target);
        const day = getHeatmapDayFromCell(cell);

        if (day) {
            showHeatmapDetail(day);
        }
    });

    heatmapGrid.addEventListener('pointerout', event => {
        const cell = getHeatmapCell(event.target);
        if (!cell || cell.contains(event.relatedTarget)) {
            return;
        }

        restoreHeatmapDetail();
    });

    heatmapGrid.addEventListener('focusin', event => {
        const cell = getHeatmapCell(event.target);
        if (!cell || cell.tagName !== 'BUTTON') {
            return;
        }

        const cells = Array.from(heatmapGrid.querySelectorAll('button.heatmap-cell'));
        cells.forEach(item => {
            item.tabIndex = -1;
        });
        cell.tabIndex = 0;

        const day = getHeatmapDayFromCell(cell);
        if (day) {
            showHeatmapDetail(day);
        }
    });

    heatmapGrid.addEventListener('focusout', event => {
        if (heatmapGrid.contains(event.relatedTarget)) {
            return;
        }

        restoreHeatmapDetail();
    });

    heatmapGrid.addEventListener('click', event => {
        const cell = getHeatmapCell(event.target);
        if (!cell || cell.tagName !== 'BUTTON') {
            return;
        }

        const day = getHeatmapDayFromCell(cell);
        if (!day) {
            return;
        }

        pinnedHeatmapDateKey = day.dateKey;
        showHeatmapDetail(day);
    });

    heatmapGrid.addEventListener('keydown', event => {
        const cell = getHeatmapCell(event.target);
        if (!cell || cell.tagName !== 'BUTTON') {
            return;
        }

        const cells = Array.from(heatmapGrid.querySelectorAll('button.heatmap-cell'));
        const currentIndex = cells.indexOf(cell);
        if (currentIndex === -1) {
            return;
        }

        let targetIndex = currentIndex;

        switch (event.key) {
            case 'ArrowRight':
                targetIndex = currentIndex + 7;
                break;
            case 'ArrowLeft':
                targetIndex = currentIndex - 7;
                break;
            case 'ArrowDown':
                targetIndex = currentIndex + 1;
                break;
            case 'ArrowUp':
                targetIndex = currentIndex - 1;
                break;
            case 'Home':
                targetIndex = 0;
                break;
            case 'End':
                targetIndex = cells.length - 1;
                break;
            default:
                return;
        }

        event.preventDefault();

        if (targetIndex >= 0 && targetIndex < cells.length) {
            focusHeatmapCell(cells, targetIndex);
        }
    });
}

document.addEventListener('click', event => {
    if (!pinnedHeatmapDateKey || !heatmapSection) {
        return;
    }

    if (!heatmapSection.contains(event.target)) {
        resetHeatmapSelection();
    }
});

document.addEventListener('keydown', event => {
    if (event.key === 'Escape') {
        resetHeatmapSelection();
    }
});

// Escapar HTML para evitar XSS
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Calcular racha actual de días consecutivos
function calculateStreak() {
    const sessions = getSessions();
    
    if (sessions.length === 0) {
        streakDisplay.textContent = '0';
        return;
    }
    
    // Obtener fechas únicas en formato YYYY-MM-DD (solo las que no son futuras)
    const today = new Date();
    const todayYear = today.getFullYear();
    const todayMonth = today.getMonth();
    const todayDay = today.getDate();
    const todayDateString = `${todayYear}-${String(todayMonth + 1).padStart(2, '0')}-${String(todayDay).padStart(2, '0')}`;
    
    // Filtrar sesiones válidas: fechas que no son futuras
    const validDates = sessions
        .map(s => s.fecha)
        .filter(dateStr => {
            if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return false;
            // Comparar con hoy (sin horas) para ignorar futuras
            const [y, m, d] = dateStr.split('-').map(Number);
            const sessionDate = new Date(y, m - 1, d);
            const todayDate = new Date(todayYear, todayMonth, todayDay);
            // Ignorar fechas futuras
            if (sessionDate > todayDate) return false;
            return true;
        });
    
    if (validDates.length === 0) {
        streakDisplay.textContent = '0';
        return;
    }
    
    // Obtener fechas únicas ordenadas descendentemente
    const uniqueDates = [...new Set(validDates)].sort((a, b) => {
        return new Date(b + 'T00:00:00') - new Date(a + 'T00:00:00');
    });
    
    // Contar días consecutivos empezando desde hoy hacia atrás
    let streak = 0;
    let expectedDate = new Date(todayYear, todayMonth, todayDay);
    
    for (let i = 0; i < uniqueDates.length + 10; i++) { // Límite razonable
        const expectedYear = expectedDate.getFullYear();
        const expectedMonth = expectedDate.getMonth();
        const expectedDay = expectedDate.getDate();
        const expectedStr = `${expectedYear}-${String(expectedMonth + 1).padStart(2, '0')}-${String(expectedDay).padStart(2, '0')}`;
        
        // Verificar si hay sesión en esta fecha esperada
        if (uniqueDates.includes(expectedStr)) {
            streak++;
            // Ir al día anterior
            expectedDate.setDate(expectedDate.getDate() - 1);
        } else {
            // Si no hay sesión hoy o en este día esperado y no hemos contado aún,
            // verificar si es hoy y no hay sesión aún - la racha puede romperse
            // Pero si ya hemos contado al menos 1, romper cuando falte un día
            if (streak === 0) {
                // Verificar si hay sesión ayer o días anteriores - empezar desde el primer día encontrado
                // Buscar en la lista única la primera fecha que coincida con un patrón consecutivo
                // Recalcular desde la fecha más reciente encontrada hacia atrás
                break;
            } else {
                break;
            }
        }
    }
    
    // Si streak es 0, verificar desde la fecha más reciente hacia atrás
    if (streak === 0 && uniqueDates.length > 0) {
        streak = 1;
        let currentDate = new Date(uniqueDates[0] + 'T00:00:00');
        for (let i = 1; i < uniqueDates.length; i++) {
            const prevDate = new Date(currentDate);
            prevDate.setDate(prevDate.getDate() - 1);
            const prevStr = `${prevDate.getFullYear()}-${String(prevDate.getMonth() + 1).padStart(2, '0')}-${String(prevDate.getDate()).padStart(2, '0')}`;
            if (uniqueDates.includes(prevStr)) {
                streak++;
                currentDate = prevDate;
            } else {
                break;
            }
        }
    }
    
    if (streakDisplay) {
        streakDisplay.textContent = streak.toString();
    }
}

// Calcular mejor racha histórica de días consecutivos
function calculateBestStreak() {
    const sessions = getSessions();

    if (sessions.length === 0) {
        if (bestStreakDisplay) {
            bestStreakDisplay.textContent = '0';
        }
        return;
    }

    const today = new Date();
    const todayYear = today.getFullYear();
    const todayMonth = today.getMonth();
    const todayDay = today.getDate();
    const todayDate = new Date(todayYear, todayMonth, todayDay);

    // Filtrar fechas válidas: no futuras, formato YYYY-MM-DD
    const validDates = sessions
        .map(s => s.fecha)
        .filter(dateStr => {
            if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return false;
            const [y, m, d] = dateStr.split('-').map(Number);
            const sessionDate = new Date(y, m - 1, d);
            if (sessionDate > todayDate) return false;
            return true;
        });

    if (validDates.length === 0) {
        if (bestStreakDisplay) {
            bestStreakDisplay.textContent = '0';
        }
        return;
    }

    // Fechas únicas ordenadas ascendentemente
    const uniqueDatesSet = new Set(validDates);
    const uniqueDates = Array.from(uniqueDatesSet).sort((a, b) => {
        return new Date(a + 'T00:00:00') - new Date(b + 'T00:00:00');
    });

    let bestStreak = 0;
    let currentStreak = 1;

    if (uniqueDates.length === 1) {
        bestStreak = 1;
    } else {
        for (let i = 1; i < uniqueDates.length; i++) {
            const prevDate = new Date(uniqueDates[i - 1] + 'T00:00:00');
            const currDate = new Date(uniqueDates[i] + 'T00:00:00');
            const nextDay = new Date(prevDate);
            nextDay.setDate(nextDay.getDate() + 1);

            // Comparar solo fecha (año/mes/día)
            if (
                nextDay.getFullYear() === currDate.getFullYear() &&
                nextDay.getMonth() === currDate.getMonth() &&
                nextDay.getDate() === currDate.getDate()
            ) {
                currentStreak++;
            } else {
                if (currentStreak > bestStreak) {
                    bestStreak = currentStreak;
                }
                currentStreak = 1;
            }
        }
        if (currentStreak > bestStreak) {
            bestStreak = currentStreak;
        }
    }

    if (bestStreakDisplay) {
        bestStreakDisplay.textContent = bestStreak.toString();
    }
}

// Formatear detalle de minutos (horas cuando supera 60 min)
function formatMinutesDetail(totalMinutes) {
    if (totalMinutes < 60) {
        return 'minutos estudiados';
    }
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    return minutes === 0 ? `${hours} h` : `${hours} h ${minutes} min`;
}

// Calcular total de minutos estudiados en la semana actual (lunes a domingo)
function calculateWeeklyMinutes() {
    const sessions = getSessions();

    const today = new Date();
    const todayDate = new Date(today.getFullYear(), today.getMonth(), today.getDate());

    // La semana empieza el lunes (0 = domingo, 1 = lunes, ...)
    const daysSinceMonday = (todayDate.getDay() + 6) % 7;
    const startOfWeek = new Date(todayDate);
    startOfWeek.setDate(todayDate.getDate() - daysSinceMonday);
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 7);

    const total = sessions.reduce((sum, session) => {
        if (!/^\d{4}-\d{2}-\d{2}$/.test(session.fecha)) return sum;
        const [y, m, d] = session.fecha.split('-').map(Number);
        const sessionDate = new Date(y, m - 1, d);
        if (sessionDate < startOfWeek || sessionDate >= endOfWeek) return sum;
        const minutes = Number(session.minutos);
        return Number.isFinite(minutes) ? sum + minutes : sum;
    }, 0);

    if (weeklyMinutesDisplay) {
        weeklyMinutesDisplay.textContent = total.toString();
    }
    if (weeklyMinutesDetail) {
        weeklyMinutesDetail.textContent = formatMinutesDetail(total);
    }
}

// Manejar envío del formulario
studyForm.addEventListener('submit', (e) => {
    e.preventDefault();
    
    const fecha = fechaInput.value;
    const materia = materiaInput.value.trim();
    const tema = temaInput.value.trim();
    const minutos = parseInt(minutosInput.value, 10);
    
    // Validación básica
    if (!fecha) {
        showFormMessage('Por favor selecciona una fecha', 'error');
        fechaInput.focus();
        return;
    }
    
    if (!materia) {
        showFormMessage('Por favor ingresa una materia', 'error');
        materiaInput.focus();
        return;
    }
    
    if (!tema) {
        showFormMessage('Por favor ingresa un tema', 'error');
        temaInput.focus();
        return;
    }
    
    if (isNaN(minutos) || minutos < 1 || minutos > 600) {
        showFormMessage('Los minutos deben estar entre 1 y 600', 'error');
        minutosInput.focus();
        return;
    }
    
    // Verificar que la fecha no sea futura
    const today = new Date();
    const todayYear = today.getFullYear();
    const todayMonth = today.getMonth();
    const todayDay = today.getDate();
    const todayDate = new Date(todayYear, todayMonth, todayDay);
    
    const [y, m, d] = fecha.split('-').map(Number);
    const sessionDate = new Date(y, m - 1, d);
    
    if (sessionDate > todayDate) {
        showFormMessage('No se permiten fechas futuras', 'error');
        fechaInput.focus();
        return;
    }
    
    // Crear sesión
    const session = {
        id: Date.now().toString(),
        fecha: fecha,
        materia: materia,
        tema: tema,
        minutos: minutos,
        createdAt: new Date().toISOString()
    };
    
    // Guardar sin sobrescribir datos que no se pudieron leer
    const sessions = getSessions();
    if (storageReadFailed) {
        showFormMessage('No se pudieron leer los datos guardados. No se guardó la sesión para no sobrescribirlos.', 'error');
        return;
    }

    sessions.push(session);
    saveSessions(sessions);
    
    // Mostrar mensaje de éxito
    showFormMessage('Sesión guardada correctamente', 'success');
    
    // Limpiar formulario excepto fecha
    materiaInput.value = '';
    temaInput.value = '';
    minutosInput.value = '';
    materiaInput.focus();
    
    // Actualizar vista
    renderHistory();
    calculateStreak();
    calculateBestStreak();
    calculateWeeklyMinutes();
    renderHeatmap();
});

// Inicializar la aplicación
function init() {
    initializeDate();
    renderHistory();
    calculateStreak();
    calculateBestStreak();
    calculateWeeklyMinutes();
    renderHeatmap();
}

// Ejecutar al cargar el DOM
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}
