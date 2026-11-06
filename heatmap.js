(function (root, factory) {
    const api = factory();

    if (typeof module === 'object' && module.exports) {
        module.exports = api;
    }

    if (root) {
        root.Heatmap = api;
    }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
    'use strict';

    const DATE_KEY_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;
    const DISPLAY_DATE_FORMATTER = new Intl.DateTimeFormat('es-ES', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric'
    });
    const LEVELS = [
        { level: 0, label: 'Sin estudio' },
        { level: 1, label: '1–29 min' },
        { level: 2, label: '30–59 min' },
        { level: 3, label: '60–119 min' },
        { level: 4, label: '120+ min' }
    ];

    function parseDateKey(key) {
        if (typeof key !== 'string') {
            return null;
        }

        const match = DATE_KEY_PATTERN.exec(key);
        if (!match) {
            return null;
        }

        const year = Number(match[1]);
        const month = Number(match[2]);
        const day = Number(match[3]);

        if (month < 1 || month > 12 || day < 1 || day > 31) {
            return null;
        }

        const date = new Date(0);
        date.setHours(0, 0, 0, 0);
        date.setFullYear(year, month - 1, day);

        if (
            date.getFullYear() !== year ||
            date.getMonth() !== month - 1 ||
            date.getDate() !== day
        ) {
            return null;
        }

        return date;
    }

    function toDateKey(date) {
        if (!(date instanceof Date) || Number.isNaN(date.getTime())) {
            return null;
        }

        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');

        return `${year}-${month}-${day}`;
    }

    function addDays(date, days) {
        const result = new Date(date.getTime());
        result.setDate(result.getDate() + days);
        return result;
    }

    function startOfWeekMonday(date) {
        const result = new Date(date.getTime());
        result.setHours(0, 0, 0, 0);

        const offset = (result.getDay() + 6) % 7;
        result.setDate(result.getDate() - offset);

        return result;
    }

    function getWindowStart(hoy) {
        return addDays(startOfWeekMonday(hoy), -77);
    }

    function buildDateRange(start, count) {
        const dates = [];

        if (!(start instanceof Date) || Number.isNaN(start.getTime())) {
            return dates;
        }

        if (!Number.isInteger(count) || count < 0) {
            return dates;
        }

        for (let index = 0; index < count; index++) {
            dates.push(addDays(start, index));
        }

        return dates;
    }

    function parseMinutes(value) {
        let number;

        if (typeof value === 'number') {
            number = value;
        } else if (typeof value === 'string') {
            const trimmed = value.trim();

            if (trimmed === '') {
                return null;
            }

            number = Number(trimmed);
        } else {
            return null;
        }

        if (!Number.isFinite(number) || number <= 0) {
            return null;
        }

        const rounded = Math.round(number);

        if (rounded <= 0) {
            return null;
        }

        return rounded;
    }

    function aggregateMinutesByDate(sessions) {
        const totals = {};

        if (!Array.isArray(sessions)) {
            return totals;
        }

        sessions.forEach(session => {
            if (session === null || typeof session !== 'object' || Array.isArray(session)) {
                return;
            }

            const date = parseDateKey(session.fecha);
            if (!date) {
                return;
            }

            const minutes = parseMinutes(session.minutos);
            if (minutes === null) {
                return;
            }

            const key = toDateKey(date);
            totals[key] = (totals[key] || 0) + minutes;
        });

        return totals;
    }

    function getLevel(minutes) {
        if (minutes <= 0) {
            return 0;
        }

        if (minutes < 30) {
            return 1;
        }

        if (minutes < 60) {
            return 2;
        }

        if (minutes < 120) {
            return 3;
        }

        return 4;
    }

    function buildHeatmapDays(sessions, hoy) {
        if (!(hoy instanceof Date) || Number.isNaN(hoy.getTime())) {
            return [];
        }

        const today = new Date(hoy.getTime());
        today.setHours(0, 0, 0, 0);

        const todayKey = toDateKey(today);
        const start = getWindowStart(today);
        const dates = buildDateRange(start, 84);
        const totals = aggregateMinutesByDate(sessions);

        return dates.map(date => {
            const dateKey = toDateKey(date);
            const isFuture = date.getTime() > today.getTime();
            const minutes = isFuture ? 0 : (totals[dateKey] || 0);

            return {
                dateKey,
                date,
                minutes,
                level: getLevel(minutes),
                isFuture,
                isToday: dateKey === todayKey
            };
        });
    }

    function formatDetail(day) {
        const dateText = DISPLAY_DATE_FORMATTER.format(day.date);
        const minutesText = day.minutes > 0 ? `${day.minutes} min` : 'Sin estudio';
        return `${dateText} · ${minutesText}`;
    }

    function getAccessibleLabel(day) {
        const dateText = DISPLAY_DATE_FORMATTER.format(day.date);

        if (day.isFuture) {
            return `${dateText}. Día futuro`;
        }

        const minutesText = day.minutes > 0
            ? `${day.minutes} minutos estudiados`
            : 'Sin estudio';

        return `${dateText}. ${minutesText}`;
    }

    return {
        parseDateKey,
        toDateKey,
        addDays,
        startOfWeekMonday,
        getWindowStart,
        buildDateRange,
        parseMinutes,
        aggregateMinutesByDate,
        getLevel,
        buildHeatmapDays,
        formatDetail,
        getAccessibleLabel,
        LEVELS
    };
});
