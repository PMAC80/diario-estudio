const test = require('node:test');
const assert = require('node:assert/strict');

const {
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
    LEVELS,
    formatDetail,
    getAccessibleLabel
} = require('../heatmap.js');

test('parseDateKey acepta fechas locales válidas', () => {
    const date = parseDateKey('2026-11-05');
    assert.ok(date instanceof Date);
    assert.equal(date.getFullYear(), 2026);
    assert.equal(date.getMonth(), 10);
    assert.equal(date.getDate(), 5);
});

test('parseDateKey acepta el 29 de febrero de un año bisiesto', () => {
    const date = parseDateKey('2028-02-29');
    assert.ok(date instanceof Date);
    assert.equal(toDateKey(date), '2028-02-29');
});

test('parseDateKey rechaza formatos y fechas inexistentes', () => {
    assert.equal(parseDateKey('2026-2-5'), null);
    assert.equal(parseDateKey('05/11/2026'), null);
    assert.equal(parseDateKey('2026-02-30'), null);
    assert.equal(parseDateKey('2026-13-01'), null);
    assert.equal(parseDateKey('2026-11-05T00:00:00'), null);
    assert.equal(parseDateKey(''), null);
    assert.equal(parseDateKey(null), null);
});

test('toDateKey usa componentes locales y no UTC', () => {
    assert.equal(toDateKey(new Date(2026, 10, 5)), '2026-11-05');
    assert.equal(toDateKey(new Date(2026, 0, 1)), '2026-01-01');
    assert.equal(toDateKey(new Date(2026, 11, 31)), '2026-12-31');
});

test('addDays cruza mes, año y año bisiesto sin perder el día local', () => {
    assert.equal(toDateKey(addDays(new Date(2026, 10, 30), 1)), '2026-12-01');
    assert.equal(toDateKey(addDays(new Date(2026, 11, 31), 1)), '2027-01-01');
    assert.equal(toDateKey(addDays(new Date(2028, 1, 28), 1)), '2028-02-29');
    assert.equal(toDateKey(addDays(new Date(2028, 1, 29), 1)), '2028-03-01');
});

test('startOfWeekMonday devuelve el lunes local de la semana', () => {
    assert.equal(toDateKey(startOfWeekMonday(new Date(2026, 10, 5))), '2026-11-02');
    assert.equal(toDateKey(startOfWeekMonday(new Date(2026, 10, 2))), '2026-11-02');
    assert.equal(toDateKey(startOfWeekMonday(new Date(2026, 10, 8))), '2026-11-02');
});

test('getWindowStart devuelve el lunes de la semana -11', () => {
    assert.equal(toDateKey(getWindowStart(new Date(2026, 10, 5))), '2026-08-17');
});

test('la ventana de 12 semanas son 84 días consecutivos de lunes a domingo', () => {
    const hoy = new Date(2026, 10, 5);
    const inicio = getWindowStart(hoy);
    const dias = buildDateRange(inicio, 84);
    const claves = dias.map(toDateKey);

    assert.equal(dias.length, 84);
    assert.equal(claves[0], '2026-08-17');
    assert.equal(claves[83], '2026-11-08');
    assert.equal(dias[0].getDay(), 1);
    assert.equal(dias[83].getDay(), 0);
    assert.equal(new Set(claves).size, 84);

    for (let index = 1; index < dias.length; index++) {
        assert.equal(toDateKey(addDays(dias[index - 1], 1)), claves[index]);
    }
});

test('parseMinutes acepta números y cadenas numéricas y redondea', () => {
    assert.equal(parseMinutes(30), 30);
    assert.equal(parseMinutes('30'), 30);
    assert.equal(parseMinutes(' 30 '), 30);
    assert.equal(parseMinutes(29.6), 30);
    assert.equal(parseMinutes(2.5), 3);
    assert.equal(parseMinutes(3.5), 4);
    assert.equal(parseMinutes(0.5), 1);
});

test('parseMinutes rechaza valores inválidos o no positivos', () => {
    assert.equal(parseMinutes(0), null);
    assert.equal(parseMinutes(-1), null);
    assert.equal(parseMinutes(0.4), null);
    assert.equal(parseMinutes(NaN), null);
    assert.equal(parseMinutes(Infinity), null);
    assert.equal(parseMinutes(-Infinity), null);
    assert.equal(parseMinutes(''), null);
    assert.equal(parseMinutes('   '), null);
    assert.equal(parseMinutes('abc'), null);
    assert.equal(parseMinutes(true), null);
    assert.equal(parseMinutes(false), null);
    assert.equal(parseMinutes(null), null);
    assert.equal(parseMinutes(undefined), null);
    assert.equal(parseMinutes({}), null);
    assert.equal(parseMinutes([]), null);
});

test('aggregateMinutesByDate suma por día y redondea cada sesión', () => {
    const sessions = [
        { fecha: '2026-11-05', minutos: 29.6 },
        { fecha: '2026-11-05', minutos: '40' },
        { fecha: '2026-11-04', minutos: 120 },
        { fecha: '2026-11-03', minutos: 0.5 }
    ];

    assert.deepEqual(aggregateMinutesByDate(sessions), {
        '2026-11-05': 70,
        '2026-11-04': 120,
        '2026-11-03': 1
    });
});

test('aggregateMinutesByDate ignora sesiones inválidas sin romperse', () => {
    const sessions = [
        null,
        undefined,
        'no es una sesión',
        {},
        { fecha: '2026-02-30', minutos: 30 },
        { fecha: '05/11/2026', minutos: 30 },
        { fecha: '2026-11-05', minutos: -10 },
        { fecha: '2026-11-05', minutos: 0 },
        { fecha: '2026-11-05', minutos: 0.4 },
        { fecha: '2026-11-05', minutos: 'abc' },
        { fecha: '2026-11-05', minutos: NaN },
        { fecha: '2026-11-05', minutos: Infinity },
        { fecha: '2026-11-05', minutos: true },
        { fecha: '2026-11-06', minutos: 45 }
    ];

    assert.deepEqual(aggregateMinutesByDate(sessions), {
        '2026-11-06': 45
    });
});

test('aggregateMinutesByDate devuelve un mapa vacío si no recibe un array', () => {
    assert.deepEqual(aggregateMinutesByDate(null), {});
    assert.deepEqual(aggregateMinutesByDate(undefined), {});
    assert.deepEqual(aggregateMinutesByDate({}), {});
});

test('getLevel aplica los cuatro umbrales y el estado sin estudio', () => {
    assert.equal(getLevel(0), 0);
    assert.equal(getLevel(1), 1);
    assert.equal(getLevel(29), 1);
    assert.equal(getLevel(30), 2);
    assert.equal(getLevel(59), 2);
    assert.equal(getLevel(60), 3);
    assert.equal(getLevel(119), 3);
    assert.equal(getLevel(120), 4);
    assert.equal(getLevel(600), 4);
});

test('buildHeatmapDays devuelve la ventana vacía con hoy y futuros marcados', () => {
    const hoy = new Date(2026, 10, 5);
    const days = buildHeatmapDays([], hoy);

    assert.equal(days.length, 84);
    assert.equal(days[0].dateKey, '2026-08-17');
    assert.equal(days[83].dateKey, '2026-11-08');
    assert.equal(days[83].isFuture, true);
    assert.equal(days[83].minutes, 0);
    assert.equal(days[83].level, 0);

    const hoyDay = days.find(day => day.dateKey === '2026-11-05');
    assert.equal(hoyDay.isToday, true);
    assert.equal(hoyDay.isFuture, false);

    const manana = days.find(day => day.dateKey === '2026-11-06');
    assert.equal(manana.isFuture, true);

    assert.ok(days.every(day => day.minutes === 0 && day.level === 0));
});

test('buildHeatmapDays asigna niveles a sesiones del período', () => {
    const hoy = new Date(2026, 10, 5);
    const days = buildHeatmapDays([
        { fecha: '2026-11-05', minutos: 45 },
        { fecha: '2026-11-04', minutos: 30 },
        { fecha: '2026-11-03', minutos: 60 },
        { fecha: '2026-11-02', minutos: 120 },
        { fecha: '2026-11-01', minutos: 20 },
        { fecha: '2026-11-01', minutos: 40 },
        { fecha: '2026-11-06', minutos: 200 },
        { fecha: '2026-08-16', minutos: 90 },
        { fecha: '2026-11-07', minutos: -5 }
    ], hoy);

    const byKey = Object.fromEntries(days.map(day => [day.dateKey, day]));

    assert.equal(byKey['2026-11-05'].minutes, 45);
    assert.equal(byKey['2026-11-05'].level, 2);
    assert.equal(byKey['2026-11-04'].level, 2);
    assert.equal(byKey['2026-11-03'].level, 3);
    assert.equal(byKey['2026-11-02'].level, 4);
    assert.equal(byKey['2026-11-01'].minutes, 60);
    assert.equal(byKey['2026-11-01'].level, 3);
    assert.equal(byKey['2026-11-06'].isFuture, true);
    assert.equal(byKey['2026-11-06'].minutes, 0);
    assert.equal(byKey['2026-11-06'].level, 0);
    assert.equal(byKey['2026-11-07'].level, 0);
    assert.equal(byKey['2026-08-16'], undefined);
});

test('buildHeatmapDays devuelve una lista vacía con una fecha inválida', () => {
    assert.deepEqual(buildHeatmapDays([], new Date(NaN)), []);
    assert.deepEqual(buildHeatmapDays([], null), []);
});

test('los límites de nivel se alcanzan también al sumar varias sesiones', () => {
    const hoy = new Date(2026, 10, 5);
    const days = buildHeatmapDays([
        { fecha: '2026-11-05', minutos: 29 },
        { fecha: '2026-11-04', minutos: 20 },
        { fecha: '2026-11-04', minutos: 10 },
        { fecha: '2026-11-03', minutos: 50 },
        { fecha: '2026-11-03', minutos: 10 },
        { fecha: '2026-11-02', minutos: 100 },
        { fecha: '2026-11-02', minutos: 20 },
        { fecha: '2026-11-01', minutos: 119 },
        { fecha: '2026-10-31', minutos: 29.6 },
        { fecha: '2026-10-30', minutos: 29.4 },
        { fecha: '2026-10-30', minutos: 0.4 }
    ], hoy);

    const byKey = Object.fromEntries(days.map(day => [day.dateKey, day]));

    assert.equal(byKey['2026-11-05'].level, 1);
    assert.equal(byKey['2026-11-04'].level, 2);
    assert.equal(byKey['2026-11-03'].level, 3);
    assert.equal(byKey['2026-11-02'].level, 4);
    assert.equal(byKey['2026-11-01'].level, 3);
    assert.equal(byKey['2026-10-31'].level, 2);
    assert.equal(byKey['2026-10-30'].level, 1);
});

test('un día con solo sesiones inválidas queda sin estudio', () => {
    const hoy = new Date(2026, 10, 5);
    const days = buildHeatmapDays([
        { fecha: '2026-11-05', minutos: 0 },
        { fecha: '2026-11-05', minutos: -20 },
        { fecha: '2026-11-05', minutos: NaN }
    ], hoy);

    const hoyDay = days.find(day => day.dateKey === '2026-11-05');

    assert.equal(hoyDay.minutes, 0);
    assert.equal(hoyDay.level, 0);
});

test('la ventana cruza correctamente el cambio de año', () => {
    const hoy = new Date(2026, 0, 1);
    const days = buildHeatmapDays([], hoy);

    assert.equal(days.length, 84);
    assert.equal(days[0].dateKey, '2025-10-13');
    assert.equal(days[83].dateKey, '2026-01-04');
    assert.equal(new Set(days.map(day => day.dateKey)).size, 84);
    assert.equal(days[0].date.getDay(), 1);
    assert.equal(days[83].date.getDay(), 0);
});

test('la ventana incluye el 29 de febrero de un año bisiesto', () => {
    const hoy = new Date(2028, 2, 1);
    const days = buildHeatmapDays([], hoy);
    const keys = new Set(days.map(day => day.dateKey));

    assert.equal(days.length, 84);
    assert.equal(keys.has('2028-02-29'), true);
    assert.equal(days[0].dateKey, '2027-12-13');
    assert.equal(days[83].dateKey, '2028-03-05');
});

test('buildHeatmapDays no modifica las sesiones de entrada', () => {
    const sessions = [
        { fecha: '2026-11-05', minutos: 45 },
        { fecha: '2026-11-04', minutos: 30 }
    ];
    const copy = sessions.map(session => ({ ...session }));

    buildHeatmapDays(sessions, new Date(2026, 10, 5));

    assert.deepEqual(sessions, copy);
});

test('buildHeatmapDays procesa 10.000 sesiones sin perder la ventana', () => {
    const hoy = new Date(2026, 10, 5);
    const sessions = Array.from({ length: 10000 }, () => ({
        fecha: '2026-11-05',
        minutos: 45
    }));

    const days = buildHeatmapDays(sessions, hoy);
    const hoyDay = days.find(day => day.dateKey === '2026-11-05');

    assert.equal(days.length, 84);
    assert.equal(hoyDay.minutes, 450000);
    assert.equal(hoyDay.level, 4);
});

test('LEVELS describe los cinco estados de la leyenda', () => {
    assert.deepEqual(LEVELS.map(item => item.level), [0, 1, 2, 3, 4]);
    assert.deepEqual(LEVELS.map(item => item.label), [
        'Sin estudio',
        '1–29 min',
        '30–59 min',
        '60–119 min',
        '120+ min'
    ]);
});

test('formatDetail muestra fecha y minutos o el estado sin estudio', () => {
    const hoy = new Date(2026, 10, 5);
    const days = buildHeatmapDays([
        { fecha: '2026-11-05', minutos: 45 },
        { fecha: '2026-11-04', minutos: 0 }
    ], hoy);

    const conEstudio = days.find(day => day.dateKey === '2026-11-05');
    const sinEstudio = days.find(day => day.dateKey === '2026-11-04');

    assert.equal(formatDetail(conEstudio), 'jueves, 5 de noviembre de 2026 · 45 min');
    assert.equal(formatDetail(sinEstudio), 'miércoles, 4 de noviembre de 2026 · Sin estudio');
});

test('getAccessibleLabel incluye fecha y minutos o sin estudio', () => {
    const hoy = new Date(2026, 10, 5);
    const days = buildHeatmapDays([
        { fecha: '2026-11-05', minutos: 45 },
        { fecha: '2026-11-04', minutos: 0 }
    ], hoy);

    const conEstudio = days.find(day => day.dateKey === '2026-11-05');
    const sinEstudio = days.find(day => day.dateKey === '2026-11-04');

    assert.equal(
        getAccessibleLabel(conEstudio),
        'jueves, 5 de noviembre de 2026. 45 minutos estudiados'
    );
    assert.equal(
        getAccessibleLabel(sinEstudio),
        'miércoles, 4 de noviembre de 2026. Sin estudio'
    );
});
