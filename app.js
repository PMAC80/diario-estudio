const STORAGE_KEY = 'diario-estudio-v1';
const HISTORY_DATE_FORMATTER = new Intl.DateTimeFormat('es-ES', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
});

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
const goalForm = document.getElementById('goalForm');
const goalInput = document.getElementById('goalMinutes');
const goalStatusTitle = document.getElementById('goalStatusTitle');
const goalHint = document.getElementById('goalHint');
const goalProgress = document.getElementById('goalProgress');
const goalCounter = document.getElementById('goalCounter');
const goalProgressBar = document.getElementById('goalProgressBar');
const goalProgressFill = document.getElementById('goalProgressFill');
const goalRemaining = document.getElementById('goalRemaining');
const goalExcess = document.getElementById('goalExcess');
const goalMessage = document.getElementById('goalMessage');
const goalShortcuts = document.querySelector('.goal-shortcuts');

const HEATMAP_DEFAULT_DETAIL = 'Seleccioná un día para ver el detalle.';
let heatmapDaysByKey = new Map();
let pinnedHeatmapDateKey = null;
let storageReadFailed = false;
let storageWarningShown = false;
let currentGoal = null;
let goalWarningShown = false;
let lastGoalSignature = '';

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
        return true;
    } catch (error) {
        console.error('Error al guardar sesiones:', error);
        showFormMessage('Error al guardar la sesión', 'error');
        return false;
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
    return HISTORY_DATE_FORMATTER.format(date);
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

    // Formatear una vez por fecha y construir el HTML completo antes de
    // asignarlo para no crear y adjuntar nodo por nodo con miles de sesiones.
    const formattedDates = new Map();
    const itemsHtml = [];

    sortedSessions.forEach(session => {
        let formattedDate = formattedDates.get(session.fecha);

        if (formattedDate === undefined) {
            formattedDate = formatDateForDisplay(session.fecha);
            formattedDates.set(session.fecha, formattedDate);
        }

        itemsHtml.push(`<li class="history-item">
            <div class="history-item-header">
                <span class="history-item-date">${formattedDate}</span>
                <span class="history-item-minutes">${session.minutos} min</span>
            </div>
            <div class="history-item-body">
                <div class="history-item-materia">${escapeHtml(session.materia)}</div>
                <div class="history-item-tema">${escapeHtml(session.tema)}</div>
            </div>
        </li>`);
    });

    historyList.innerHTML = itemsHtml.join('');
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

// Obtener localStorage para el objetivo capturando el acceso
function getGoalStorage() {
    try {
        return window.localStorage;
    } catch (error) {
        return null;
    }
}

function warnGoalReadOnce(error) {
    if (goalWarningShown) {
        return;
    }

    goalWarningShown = true;
    console.warn(
        'No se pudo leer el objetivo semanal guardado. Se mantiene sin objetivo y no se sobrescriben los datos existentes.',
        error
    );
}

// Escribir el campo del objetivo (único punto de escritura)
function setGoalField(value) {
    if (!goalInput) {
        return;
    }

    goalInput.value = value;
    goalInput.setAttribute('aria-invalid', 'false');
}

function showGoalMessage(text, type) {
    if (!goalMessage) {
        return;
    }

    if (goalMessage.textContent === text) {
        return;
    }

    goalMessage.textContent = text;
    goalMessage.className = 'goal-message';
    if (type === 'success') {
        goalMessage.classList.add('success');
    } else if (type === 'error') {
        goalMessage.classList.add('error');
    }
}

// Actualizar la tarjeta del objetivo sin leer storage ni tocar el campo
function renderGoal(view) {
    if (
        typeof WeeklyGoal === 'undefined' ||
        !goalStatusTitle ||
        !goalHint ||
        !goalProgress ||
        !goalCounter ||
        !goalProgressBar ||
        !goalProgressFill ||
        !goalRemaining ||
        !goalExcess
    ) {
        return;
    }

    const hasGoal = Boolean(view) && view.state !== 'no-goal';

    if (!hasGoal) {
        goalStatusTitle.textContent = WeeklyGoal.NO_GOAL_TEXTS.title;
        goalStatusTitle.hidden = false;
        goalHint.textContent = WeeklyGoal.NO_GOAL_TEXTS.hint;
        goalHint.hidden = false;
        goalCounter.textContent = '';
        goalRemaining.textContent = '';
        goalExcess.textContent = '';
        goalExcess.hidden = true;
        goalProgressBar.setAttribute('aria-valuemin', '0');
        goalProgressBar.setAttribute('aria-valuemax', '0');
        goalProgressBar.setAttribute('aria-valuenow', '0');
        goalProgressBar.setAttribute('aria-valuetext', '');
        goalProgressFill.style.width = '0%';
        goalProgress.hidden = true;
        return;
    }

    goalStatusTitle.textContent = view.statusTitle;
    goalStatusTitle.hidden = view.statusTitle === '';
    goalHint.textContent = '';
    goalHint.hidden = true;
    goalCounter.textContent = view.counterText;
    goalRemaining.textContent = view.remainingText;
    goalExcess.textContent = view.excessText;
    goalExcess.hidden = view.excess === 0;

    // Fijar los atributos antes de quitar hidden
    goalProgressBar.setAttribute('aria-valuemin', String(view.progress.valueMin));
    goalProgressBar.setAttribute('aria-valuemax', String(view.progress.valueMax));
    goalProgressBar.setAttribute('aria-valuenow', String(view.progress.valueNow));
    goalProgressBar.setAttribute('aria-valuetext', view.progress.valueText);
    goalProgressFill.style.width = `${view.percent}%`;
    goalProgress.hidden = false;
}

// Calcular el estado actual del objetivo usando la fecha del momento
function getGoalState() {
    const sessions = getSessions();
    const progress = WeeklyGoal.calculateGoalProgress(sessions, new Date());
    const view = WeeklyGoal.evaluateGoal({
        goal: currentGoal,
        minutes: progress.minutes
    });

    return {
        view,
        signature: `${progress.weekStartKey}:${progress.minutes}`
    };
}

// Render forzado (guardar o quitar) que además actualiza la firma
function renderGoalState() {
    const state = getGoalState();
    lastGoalSignature = state.signature;
    renderGoal(state.view);
    return state.view;
}

// Recalcular y renderizar solo si cambió la firma semana:minutos
function refreshGoal({ announceProgress }) {
    if (typeof WeeklyGoal === 'undefined') {
        return;
    }

    const state = getGoalState();
    if (state.signature === lastGoalSignature) {
        return;
    }

    lastGoalSignature = state.signature;
    renderGoal(state.view);

    if (!announceProgress || currentGoal === null) {
        return;
    }

    const announcement = WeeklyGoal.getProgressAnnouncement(state.view);
    if (announcement) {
        showGoalMessage(announcement, 'success');
    }
}

// Guardar un objetivo ya validado y centralizar éxito, fallo y ciclo del campo
function applyGoalSave(value) {
    if (!WeeklyGoal.saveGoal(getGoalStorage(), value)) {
        showGoalMessage(WeeklyGoal.GOAL_MESSAGES.storageError, 'error');
        console.error('No se pudo guardar el objetivo semanal en el almacenamiento.');
        return false;
    }

    currentGoal = value;
    setGoalField(String(value));
    const view = renderGoalState();
    showGoalMessage(WeeklyGoal.getSavedAnnouncement(view), 'success');
    return true;
}

function applyGoalRemove() {
    if (!WeeklyGoal.removeGoal(getGoalStorage())) {
        showGoalMessage(WeeklyGoal.GOAL_MESSAGES.storageError, 'error');
        console.error('No se pudo quitar el objetivo semanal del almacenamiento.');
        if (currentGoal !== null) {
            setGoalField(String(currentGoal));
        }
        return false;
    }

    currentGoal = null;
    setGoalField('');
    renderGoalState();
    showGoalMessage(WeeklyGoal.GOAL_MESSAGES.removed, 'success');
    return true;
}

function handleGoalSubmit(event) {
    event.preventDefault();

    if (typeof WeeklyGoal === 'undefined' || !goalInput) {
        return;
    }

    const parsed = WeeklyGoal.parseGoalInput(goalInput.value);

    if (parsed.action === 'remove') {
        if (currentGoal === null) {
            // Quitado idempotente sin objetivo vigente: no escribe ni anuncia
            setGoalField('');
            return;
        }

        applyGoalRemove();
        return;
    }

    if (parsed.action === 'invalid') {
        goalInput.setAttribute('aria-invalid', 'true');
        showGoalMessage(parsed.message, 'error');
        goalInput.focus();
        return;
    }

    if (parsed.action === 'save') {
        if (parsed.value === currentGoal) {
            // Guardado repetido: normaliza el campo sin escribir ni anunciar
            setGoalField(String(parsed.value));
            return;
        }

        applyGoalSave(parsed.value);
    }
}

function handleGoalShortcut(event) {
    if (typeof WeeklyGoal === 'undefined' || !goalInput) {
        return;
    }

    const target = event.target instanceof Element
        ? event.target.closest('.goal-shortcut')
        : null;

    if (!target) {
        return;
    }

    const value = Number(target.dataset.goalMinutes);
    if (!WeeklyGoal.isValidGoal(value)) {
        return;
    }

    setGoalField(String(value));

    if (value === currentGoal) {
        return;
    }

    applyGoalSave(value);
}

// Cargar el objetivo una sola vez al iniciar
function initGoal() {
    if (typeof WeeklyGoal === 'undefined' || !goalInput) {
        return;
    }

    const result = WeeklyGoal.readGoal(getGoalStorage());

    if (result.status === 'invalid' || result.status === 'unreadable') {
        warnGoalReadOnce(new Error(`Estado del objetivo leído: ${result.status}.`));
    }

    currentGoal = result.status === 'valid' ? result.goal : null;
    setGoalField(currentGoal === null ? '' : String(currentGoal));
    refreshGoal({ announceProgress: false });
}

if (goalForm) {
    goalForm.addEventListener('submit', handleGoalSubmit);
}

if (goalShortcuts) {
    goalShortcuts.addEventListener('click', handleGoalShortcut);
}

// Recalcular el objetivo al volver a la pestaña o recibir foco, sin anunciar
document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
        refreshGoal({ announceProgress: false });
    }
});

window.addEventListener('focus', () => {
    refreshGoal({ announceProgress: false });
});

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
    const saved = saveSessions(sessions);
    if (!saved) {
        return;
    }

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
    refreshGoal({ announceProgress: true });
});

// Inicializar la aplicación
function init() {
    initializeDate();
    initGoal();
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
