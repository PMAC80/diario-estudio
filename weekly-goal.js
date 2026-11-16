(function (root, factory) {
    let heatmap = null;

    if (typeof module === 'object' && module.exports) {
        heatmap = require('./heatmap.js');
    } else if (root && root.Heatmap) {
        heatmap = root.Heatmap;
    }

    if (!heatmap) {
        throw new Error('weekly-goal.js requiere que heatmap.js esté cargado antes.');
    }

    const api = factory(heatmap);

    if (typeof module === 'object' && module.exports) {
        module.exports = api;
    }

    if (root) {
        root.WeeklyGoal = api;
    }
})(typeof globalThis !== 'undefined' ? globalThis : this, function (Heatmap) {
    'use strict';

    const REQUIRED_HEATMAP_FUNCTIONS = [
        'parseDateKey',
        'toDateKey',
        'addDays',
        'startOfWeekMonday',
        'parseMinutes'
    ];

    if (!Heatmap || typeof Heatmap !== 'object') {
        throw new Error('weekly-goal.js requiere que heatmap.js esté cargado antes.');
    }

    REQUIRED_HEATMAP_FUNCTIONS.forEach(name => {
        if (typeof Heatmap[name] !== 'function') {
            throw new Error(`weekly-goal.js requiere Heatmap.${name}.`);
        }
    });

    const GOAL_STORAGE_KEY = 'diario-estudio-goal-v1';
    const MIN_GOAL_MINUTES = 1;
    const MAX_GOAL_MINUTES = 10080;
    const DIGITS_PATTERN = /^[0-9]+$/;

    const GOAL_MESSAGES = {
        format: 'Ingresa un número entero de minutos mayor que 0.',
        range: 'El objetivo debe estar entre 1 y 10080 minutos.',
        saved: 'Objetivo semanal guardado.',
        removed: 'Objetivo semanal eliminado.',
        storageError: 'No se pudo actualizar el objetivo. Se mantiene el valor anterior.'
    };

    const NO_GOAL_TEXTS = {
        title: 'Aún no tienes objetivo semanal',
        hint: 'Fija cuántos minutos quieres estudiar esta semana.'
    };

    const STATUS_MET_TEXT = 'Objetivo cumplido';
    const PROGRESS_LABEL = 'Progreso del objetivo semanal';

    function parseGoalInput(rawValue) {
        if (typeof rawValue !== 'string') {
            return {
                action: 'invalid',
                reason: 'format',
                message: GOAL_MESSAGES.format
            };
        }

        const value = rawValue.trim();

        if (value === '' || value === '0') {
            return { action: 'remove' };
        }

        if (!DIGITS_PATTERN.test(value)) {
            return {
                action: 'invalid',
                reason: 'format',
                message: GOAL_MESSAGES.format
            };
        }

        const minutes = Number(value);

        if (
            !Number.isInteger(minutes) ||
            minutes < MIN_GOAL_MINUTES ||
            minutes > MAX_GOAL_MINUTES
        ) {
            return {
                action: 'invalid',
                reason: 'range',
                message: GOAL_MESSAGES.range
            };
        }

        return { action: 'save', value: minutes };
    }

    function isValidGoal(value) {
        return (
            typeof value === 'number' &&
            Number.isInteger(value) &&
            value >= MIN_GOAL_MINUTES &&
            value <= MAX_GOAL_MINUTES
        );
    }

    function parseStoredGoal(rawString) {
        if (typeof rawString !== 'string') {
            return null;
        }

        let parsed;

        try {
            parsed = JSON.parse(rawString);
        } catch (error) {
            return null;
        }

        if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) {
            return null;
        }

        if (!Object.prototype.hasOwnProperty.call(parsed, 'objetivoMinutos')) {
            return null;
        }

        return isValidGoal(parsed.objetivoMinutos) ? parsed.objetivoMinutos : null;
    }

    function readGoal(storage) {
        if (!storage || typeof storage.getItem !== 'function') {
            return { status: 'unreadable', goal: null };
        }

        let rawValue;

        try {
            rawValue = storage.getItem(GOAL_STORAGE_KEY);
        } catch (error) {
            return { status: 'unreadable', goal: null };
        }

        if (rawValue === null || rawValue === undefined) {
            return { status: 'missing', goal: null };
        }

        const goal = parseStoredGoal(rawValue);

        if (goal === null) {
            return { status: 'invalid', goal: null };
        }

        return { status: 'valid', goal };
    }

    function saveGoal(storage, value) {
        if (!isValidGoal(value)) {
            return false;
        }

        if (!storage || typeof storage.setItem !== 'function') {
            return false;
        }

        try {
            storage.setItem(
                GOAL_STORAGE_KEY,
                JSON.stringify({ objetivoMinutos: value })
            );
            return true;
        } catch (error) {
            return false;
        }
    }

    function removeGoal(storage) {
        if (!storage || typeof storage.removeItem !== 'function') {
            return false;
        }

        try {
            storage.removeItem(GOAL_STORAGE_KEY);
            return true;
        } catch (error) {
            return false;
        }
    }

    function getLocalMidnight(date) {
        const result = new Date(date.getTime());
        result.setHours(0, 0, 0, 0);
        return result;
    }

    function getGoalWeek(today) {
        if (!(today instanceof Date) || Number.isNaN(today.getTime())) {
            return null;
        }

        const todayMidnight = getLocalMidnight(today);
        const monday = Heatmap.startOfWeekMonday(todayMidnight);
        const sunday = Heatmap.addDays(monday, 6);

        return {
            startKey: Heatmap.toDateKey(monday),
            endKey: Heatmap.toDateKey(sunday),
            todayKey: Heatmap.toDateKey(todayMidnight)
        };
    }

    function calculateGoalProgress(sessions, today) {
        const week = getGoalWeek(today);

        if (week === null) {
            return {
                weekStartKey: null,
                weekEndKey: null,
                todayKey: null,
                minutes: 0
            };
        }

        const emptyWeek = {
            weekStartKey: week.startKey,
            weekEndKey: week.endKey,
            todayKey: week.todayKey,
            minutes: 0
        };

        if (!Array.isArray(sessions)) {
            return emptyWeek;
        }

        const todayMidnight = getLocalMidnight(today);
        const monday = Heatmap.startOfWeekMonday(todayMidnight);
        const sunday = Heatmap.addDays(monday, 6);
        const mondayTime = monday.getTime();
        const sundayTime = sunday.getTime();
        const todayTime = todayMidnight.getTime();
        let minutes = 0;

        for (let index = 0; index < sessions.length; index++) {
            const session = sessions[index];

            if (session === null || typeof session !== 'object' || Array.isArray(session)) {
                continue;
            }

            const date = Heatmap.parseDateKey(session.fecha);

            if (date === null) {
                continue;
            }

            const dateTime = date.getTime();

            if (dateTime < mondayTime || dateTime > sundayTime) {
                continue;
            }

            if (dateTime > todayTime) {
                continue;
            }

            const sessionMinutes = Heatmap.parseMinutes(session.minutos);

            if (sessionMinutes === null) {
                continue;
            }

            minutes += sessionMinutes;
        }

        return {
            weekStartKey: week.startKey,
            weekEndKey: week.endKey,
            todayKey: week.todayKey,
            minutes
        };
    }

    function normalizeMinutes(value) {
        if (typeof value !== 'number' || !Number.isFinite(value)) {
            return 0;
        }

        const rounded = Math.round(value);
        return rounded > 0 ? rounded : 0;
    }

    function evaluateGoal(input) {
        const source = input !== null && typeof input === 'object' ? input : {};
        const minutes = normalizeMinutes(source.minutes);
        const goal = isValidGoal(source.goal) ? source.goal : null;

        if (goal === null) {
            return {
                state: 'no-goal',
                goal: null,
                minutes,
                remaining: 0,
                excess: 0,
                percent: 0,
                statusTitle: NO_GOAL_TEXTS.title,
                counterText: '',
                remainingText: '',
                excessText: '',
                progress: null
            };
        }

        const remaining = Math.max(goal - minutes, 0);
        const excess = Math.max(minutes - goal, 0);
        const percent = Math.min(100, (minutes / goal) * 100);
        const counterText = `${minutes} / ${goal} min`;
        let state;
        let statusTitle;
        let remainingText;
        let excessText;
        let valueText;

        if (minutes < goal) {
            state = 'in-progress';
            statusTitle = '';
            remainingText = remaining === 1 ? 'Falta 1 min' : `Faltan ${remaining} min`;
            excessText = '';
            valueText = remaining === 1
                ? `${minutes} de ${goal} minutos; falta 1 minuto`
                : `${minutes} de ${goal} minutos; faltan ${remaining} minutos`;
        } else if (minutes === goal) {
            state = 'met';
            statusTitle = STATUS_MET_TEXT;
            remainingText = '';
            excessText = '';
            valueText = `${minutes} de ${goal} minutos; objetivo cumplido`;
        } else {
            state = 'exceeded';
            statusTitle = STATUS_MET_TEXT;
            remainingText = '';
            excessText = `+${excess} min`;
            valueText = `${minutes} de ${goal} minutos; objetivo cumplido; ${excess} ${excess === 1 ? 'minuto' : 'minutos'} de exceso`;
        }

        return {
            state,
            goal,
            minutes,
            remaining,
            excess,
            percent,
            statusTitle,
            counterText,
            remainingText,
            excessText,
            progress: {
                valueMin: 0,
                valueMax: goal,
                valueNow: Math.min(minutes, goal),
                valueText
            }
        };
    }

    function getSavedAnnouncement(view) {
        if (!view || !view.progress || typeof view.progress.valueText !== 'string') {
            return GOAL_MESSAGES.saved;
        }

        return `${GOAL_MESSAGES.saved} ${view.progress.valueText}`;
    }

    function getProgressAnnouncement(view) {
        if (!view || !view.progress || typeof view.progress.valueText !== 'string') {
            return '';
        }

        return `Progreso del objetivo: ${view.progress.valueText}`;
    }

    return {
        GOAL_STORAGE_KEY,
        MIN_GOAL_MINUTES,
        MAX_GOAL_MINUTES,
        GOAL_MESSAGES,
        NO_GOAL_TEXTS,
        STATUS_MET_TEXT,
        PROGRESS_LABEL,
        parseGoalInput,
        isValidGoal,
        parseStoredGoal,
        readGoal,
        saveGoal,
        removeGoal,
        getGoalWeek,
        calculateGoalProgress,
        evaluateGoal,
        getSavedAnnouncement,
        getProgressAnnouncement
    };
});
