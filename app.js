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

// Inicializar fecha con fecha actual
function initializeDate() {
    const today = new Date();
    // Usar formato YYYY-MM-DD para input type date (evita problemas UTC)
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    fechaInput.value = `${year}-${month}-${day}`;
}

// Obtener sesiones desde localStorage
function getSessions() {
    try {
        const data = localStorage.getItem(STORAGE_KEY);
        if (!data) return [];
        const sessions = JSON.parse(data);
        return Array.isArray(sessions) ? sessions : [];
    } catch (error) {
        console.error('Error al leer sesiones:', error);
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
    
    // Guardar
    const sessions = getSessions();
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
});

// Inicializar la aplicación
function init() {
    initializeDate();
    renderHistory();
    calculateStreak();
    calculateBestStreak();
}

// Ejecutar al cargar el DOM
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}
