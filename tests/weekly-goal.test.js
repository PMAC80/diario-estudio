const test = require('node:test');
const assert = require('node:assert/strict');

const Heatmap = require('../heatmap.js');
const {
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
} = require('../weekly-goal.js');

const SESSIONS_KEY = 'diario-estudio-v1';
const SESSIONS_VALUE = JSON.stringify([
    {
        id: 'session-1',
        fecha: '2026-11-05',
        materia: 'Matemática',
        tema: 'Derivadas',
        minutos: 120,
        createdAt: '2026-11-05T10:00:00.000Z'
    }
]);

function createRecordingStorage(initial = {}) {
    const data = new Map(Object.entries(initial));
    const calls = { get: [], set: [], remove: [] };

    return {
        calls,
        getItem(key) {
            calls.get.push(key);
            return data.has(key) ? data.get(key) : null;
        },
        setItem(key, value) {
            calls.set.push({ key, value });
            data.set(key, value);
        },
        removeItem(key) {
            calls.remove.push(key);
            data.delete(key);
        },
        has(key) {
            return data.has(key);
        },
        get(key) {
            return data.get(key);
        },
        getData() {
            return Object.fromEntries(data);
        }
    };
}

test('las constantes de la clave y el rango son exactas', () => {
    assert.equal(GOAL_STORAGE_KEY, 'diario-estudio-goal-v1');
    assert.equal(MIN_GOAL_MINUTES, 1);
    assert.equal(MAX_GOAL_MINUTES, 10080);
});

test('GOAL_MESSAGES contiene los textos exactos del plan', () => {
    assert.deepEqual(GOAL_MESSAGES, {
        format: 'Ingresa un número entero de minutos mayor que 0.',
        range: 'El objetivo debe estar entre 1 y 10080 minutos.',
        saved: 'Objetivo semanal guardado.',
        removed: 'Objetivo semanal eliminado.',
        storageError: 'No se pudo actualizar el objetivo. Se mantiene el valor anterior.'
    });
});

test('los textos del estado sin objetivo y los rótulos son exactos', () => {
    assert.deepEqual(NO_GOAL_TEXTS, {
        title: 'Aún no tienes objetivo semanal',
        hint: 'Fija cuántos minutos quieres estudiar esta semana.'
    });
    assert.equal(STATUS_MET_TEXT, 'Objetivo cumplido');
    assert.equal(PROGRESS_LABEL, 'Progreso del objetivo semanal');
});

test('parseGoalInput quita con vacío, solo espacios y el texto exacto 0', () => {
    assert.deepEqual(parseGoalInput(''), { action: 'remove' });
    assert.deepEqual(parseGoalInput('   '), { action: 'remove' });
    assert.deepEqual(parseGoalInput('\t\n'), { action: 'remove' });
    assert.deepEqual(parseGoalInput('0'), { action: 'remove' });
    assert.deepEqual(parseGoalInput(' 0 '), { action: 'remove' });
    assert.deepEqual(parseGoalInput('\t0\n'), { action: 'remove' });
});

test('parseGoalInput acepta el rango completo y normaliza ceros a la izquierda', () => {
    assert.deepEqual(parseGoalInput('1'), { action: 'save', value: 1 });
    assert.deepEqual(parseGoalInput('10080'), { action: 'save', value: 10080 });
    assert.deepEqual(parseGoalInput('0120'), { action: 'save', value: 120 });
    assert.deepEqual(parseGoalInput('0001'), { action: 'save', value: 1 });
    assert.deepEqual(parseGoalInput(' 120 '), { action: 'save', value: 120 });
    assert.deepEqual(parseGoalInput('000000000300'), { action: 'save', value: 300 });
});

test('parseGoalInput rechaza por rango los ceros no exactos y los valores fuera del límite', () => {
    assert.deepEqual(parseGoalInput('00'), {
        action: 'invalid',
        reason: 'range',
        message: 'El objetivo debe estar entre 1 y 10080 minutos.'
    });
    assert.deepEqual(parseGoalInput('000'), {
        action: 'invalid',
        reason: 'range',
        message: 'El objetivo debe estar entre 1 y 10080 minutos.'
    });
    assert.deepEqual(parseGoalInput('10081'), {
        action: 'invalid',
        reason: 'range',
        message: 'El objetivo debe estar entre 1 y 10080 minutos.'
    });
    assert.deepEqual(parseGoalInput('9'.repeat(100)), {
        action: 'invalid',
        reason: 'range',
        message: 'El objetivo debe estar entre 1 y 10080 minutos.'
    });
});

test('parseGoalInput rechaza por formato letras, signos, decimales y separadores', () => {
    const formatMessage = 'Ingresa un número entero de minutos mayor que 0.';
    const invalidInputs = [
        'abc',
        '12a',
        '+120',
        '-120',
        '120.5',
        '1,200',
        '1e2',
        '1 200',
        '1\t200',
        ' 12 0 '
    ];

    invalidInputs.forEach(rawValue => {
        assert.deepEqual(parseGoalInput(rawValue), {
            action: 'invalid',
            reason: 'format',
            message: formatMessage
        }, `debería rechazar ${JSON.stringify(rawValue)}`);
    });
});

test('parseGoalInput no interpreta valores no string como vacío ni como quitado', () => {
    const formatMessage = 'Ingresa un número entero de minutos mayor que 0.';

    [null, undefined, 120, true, [], {}].forEach(rawValue => {
        assert.deepEqual(parseGoalInput(rawValue), {
            action: 'invalid',
            reason: 'format',
            message: formatMessage
        });
    });
});

test('isValidGoal acepta solo enteros entre 1 y 10080', () => {
    assert.equal(isValidGoal(1), true);
    assert.equal(isValidGoal(300), true);
    assert.equal(isValidGoal(10080), true);
});

test('isValidGoal rechaza cadenas, decimales, no finitos, booleanos y colecciones', () => {
    const invalidValues = [
        0,
        -1,
        10081,
        1.5,
        NaN,
        Infinity,
        -Infinity,
        '120',
        '',
        '1',
        null,
        undefined,
        true,
        false,
        [],
        [120],
        {},
        { objetivoMinutos: 120 },
        new Number(120)
    ];

    invalidValues.forEach(value => {
        assert.equal(isValidGoal(value), false, `debería rechazar ${String(value)}`);
    });
});

test('parseStoredGoal acepta únicamente un entero válido en objetivoMinutos', () => {
    assert.equal(parseStoredGoal('{"objetivoMinutos":1}'), 1);
    assert.equal(parseStoredGoal('{"objetivoMinutos":10080}'), 10080);
    assert.equal(parseStoredGoal('{"objetivoMinutos":300}'), 300);
    assert.equal(
        parseStoredGoal('{"objetivoMinutos":300,"extra":true,"otra":"cosa"}'),
        300
    );
});

test('parseStoredGoal ignora propiedades adicionales y no las devuelve', () => {
    const result = parseStoredGoal('{"extra":true,"objetivoMinutos":120,"otra":"cosa"}');

    assert.equal(result, 120);
    assert.equal(typeof result, 'number');
});

test('parseStoredGoal rechaza JSON inválido, formas incorrectas y valores no válidos', () => {
    const invalidRawValues = [
        null,
        undefined,
        '',
        '{',
        'null',
        '[]',
        '"texto"',
        '120',
        'true',
        '{}',
        '{"objetivoMinutos":null}',
        '{"objetivoMinutos":"120"}',
        '{"objetivoMinutos":true}',
        '{"objetivoMinutos":[]}',
        '{"objetivoMinutos":{}}',
        '{"objetivoMinutos":0}',
        '{"objetivoMinutos":10081}',
        '{"objetivoMinutos":1.5}'
    ];

    invalidRawValues.forEach(rawValue => {
        assert.equal(
            parseStoredGoal(rawValue),
            null,
            `debería rechazar ${String(rawValue)}`
        );
    });
});

test('readGoal distingue missing y no escribe en el adaptador', () => {
    const storage = createRecordingStorage();
    const result = readGoal(storage);

    assert.deepEqual(result, { status: 'missing', goal: null });
    assert.deepEqual(storage.calls.get, [GOAL_STORAGE_KEY]);
    assert.deepEqual(storage.calls.set, []);
    assert.deepEqual(storage.calls.remove, []);
});

test('readGoal trata undefined devuelto por getItem como missing', () => {
    const storage = {
        getItem() {
            return undefined;
        }
    };

    assert.deepEqual(readGoal(storage), { status: 'missing', goal: null });
});

test('readGoal devuelve valid con el entero almacenado e ignora extras', () => {
    const storage = createRecordingStorage({
        [GOAL_STORAGE_KEY]: '{"objetivoMinutos":300,"extra":true}'
    });
    const result = readGoal(storage);

    assert.deepEqual(result, { status: 'valid', goal: 300 });
    assert.deepEqual(storage.calls.set, []);
    assert.deepEqual(storage.calls.remove, []);
});

test('readGoal devuelve invalid para contenido ilegible o inválido', () => {
    const invalidRawValues = [
        '{',
        'null',
        '[]',
        '"texto"',
        '{}',
        '{"objetivoMinutos":"120"}',
        '{"objetivoMinutos":0}',
        '{"objetivoMinutos":10081}'
    ];

    invalidRawValues.forEach(rawValue => {
        const storage = createRecordingStorage({ [GOAL_STORAGE_KEY]: rawValue });
        const result = readGoal(storage);

        assert.deepEqual(result, { status: 'invalid', goal: null });
        assert.deepEqual(storage.calls.set, []);
        assert.deepEqual(storage.calls.remove, []);
    });
});

test('readGoal devuelve unreadable si el adaptador falta o getItem lanza', () => {
    assert.deepEqual(readGoal(null), { status: 'unreadable', goal: null });
    assert.deepEqual(readGoal(undefined), { status: 'unreadable', goal: null });
    assert.deepEqual(readGoal({}), { status: 'unreadable', goal: null });
    assert.deepEqual(readGoal({ getItem: 'no es una función' }), {
        status: 'unreadable',
        goal: null
    });
    assert.deepEqual(readGoal({
        getItem() {
            throw new Error('sin permisos');
        }
    }), { status: 'unreadable', goal: null });
});

test('las funciones del módulo no registran avisos por consola', () => {
    const originalWarn = console.warn;
    const originalError = console.error;
    const warnings = [];
    const errors = [];

    console.warn = (...args) => warnings.push(args);
    console.error = (...args) => errors.push(args);

    try {
        readGoal(null);
        readGoal(createRecordingStorage());
        readGoal(createRecordingStorage({ [GOAL_STORAGE_KEY]: '{' }));
        readGoal(createRecordingStorage({ [GOAL_STORAGE_KEY]: '{"objetivoMinutos":300}' }));
        saveGoal(null, 300);
        saveGoal(createRecordingStorage(), 0);
        removeGoal(null);
        removeGoal({
            removeItem() {
                throw new Error('sin permisos');
            }
        });
    } finally {
        console.warn = originalWarn;
        console.error = originalError;
    }

    assert.deepEqual(warnings, []);
    assert.deepEqual(errors, []);
});

test('saveGoal escribe exactamente el JSON canónico de 1 y 10080', () => {
    const storage = createRecordingStorage();

    assert.equal(saveGoal(storage, 1), true);
    assert.deepEqual(storage.calls.set, [
        { key: GOAL_STORAGE_KEY, value: '{"objetivoMinutos":1}' }
    ]);
    assert.equal(storage.get(GOAL_STORAGE_KEY), '{"objetivoMinutos":1}');

    assert.equal(saveGoal(storage, 10080), true);
    assert.deepEqual(storage.calls.set[1], {
        key: GOAL_STORAGE_KEY,
        value: '{"objetivoMinutos":10080}'
    });
});

test('saveGoal rechaza valores inválidos sin escribir', () => {
    const storage = createRecordingStorage();
    const invalidValues = [
        0,
        10081,
        1.5,
        NaN,
        Infinity,
        '120',
        null,
        true,
        [],
        {},
        { objetivoMinutos: 120 }
    ];

    invalidValues.forEach(value => {
        assert.equal(saveGoal(storage, value), false);
    });

    assert.deepEqual(storage.calls.set, []);
    assert.deepEqual(storage.calls.get, []);
    assert.deepEqual(storage.calls.remove, []);
    assert.deepEqual(storage.getData(), {});
});

test('saveGoal devuelve false si el adaptador falta, no tiene setItem o lanza', () => {
    assert.equal(saveGoal(null, 300), false);
    assert.equal(saveGoal(undefined, 300), false);
    assert.equal(saveGoal({}, 300), false);
    assert.equal(saveGoal({ setItem: 'no es una función' }, 300), false);
    assert.equal(saveGoal({
        setItem() {
            throw new Error('cuota excedida');
        }
    }, 300), false);
});

test('saveGoal conserva el objetivo anterior si setItem lanza', () => {
    const storage = createRecordingStorage({
        [GOAL_STORAGE_KEY]: '{"objetivoMinutos":120}'
    });
    storage.setItem = () => {
        throw new Error('cuota excedida');
    };

    assert.equal(saveGoal(storage, 300), false);
    assert.equal(storage.get(GOAL_STORAGE_KEY), '{"objetivoMinutos":120}');
    assert.deepEqual(storage.calls.set, []);
});

test('saveGoal nunca toca la clave de sesiones', () => {
    const storage = createRecordingStorage({ [SESSIONS_KEY]: SESSIONS_VALUE });

    assert.equal(saveGoal(storage, 300), true);
    assert.equal(storage.get(SESSIONS_KEY), SESSIONS_VALUE);
    assert.deepEqual(storage.calls.get, []);
    assert.equal(storage.calls.set.some(call => call.key === SESSIONS_KEY), false);
    assert.deepEqual(storage.calls.remove, []);
});

test('removeGoal elimina solo la clave del objetivo y conserva las sesiones', () => {
    const storage = createRecordingStorage({
        [GOAL_STORAGE_KEY]: '{"objetivoMinutos":300}',
        [SESSIONS_KEY]: SESSIONS_VALUE
    });

    assert.equal(removeGoal(storage), true);
    assert.equal(storage.has(GOAL_STORAGE_KEY), false);
    assert.equal(storage.get(SESSIONS_KEY), SESSIONS_VALUE);
    assert.deepEqual(storage.calls.remove, [GOAL_STORAGE_KEY]);
    assert.deepEqual(storage.calls.set, []);
    assert.deepEqual(storage.calls.get, []);
});

test('removeGoal devuelve false si el adaptador falta, no tiene removeItem o lanza', () => {
    assert.equal(removeGoal(null), false);
    assert.equal(removeGoal(undefined), false);
    assert.equal(removeGoal({}), false);
    assert.equal(removeGoal({ removeItem: 'no es una función' }), false);
    assert.equal(removeGoal({
        removeItem() {
            throw new Error('sin permisos');
        }
    }), false);
});

test('las operaciones del objetivo mantienen íntegra la clave de sesiones', () => {
    const storage = createRecordingStorage({
        [SESSIONS_KEY]: SESSIONS_VALUE,
        [GOAL_STORAGE_KEY]: '{"objetivoMinutos":120}'
    });

    readGoal(storage);
    saveGoal(storage, 300);
    removeGoal(storage);

    assert.equal(storage.get(SESSIONS_KEY), SESSIONS_VALUE);
    assert.equal(
        storage.calls.get.some(key => key === SESSIONS_KEY),
        false
    );
    assert.equal(
        storage.calls.set.some(call => call.key === SESSIONS_KEY),
        false
    );
    assert.equal(
        storage.calls.remove.some(key => key === SESSIONS_KEY),
        false
    );
});

function createSession(fecha, minutos) {
    return { fecha, minutos };
}

test('getGoalWeek devuelve de lunes a domingo la semana local del jueves', () => {
    const today = new Date(2026, 10, 5);

    assert.deepEqual(getGoalWeek(today), {
        startKey: '2026-11-02',
        endKey: '2026-11-08',
        todayKey: '2026-11-05'
    });
});

test('getGoalWeek incluye el lunes y el domingo cuando hoy cae en esos días', () => {
    assert.deepEqual(getGoalWeek(new Date(2026, 10, 2)), {
        startKey: '2026-11-02',
        endKey: '2026-11-08',
        todayKey: '2026-11-02'
    });

    assert.deepEqual(getGoalWeek(new Date(2026, 10, 8)), {
        startKey: '2026-11-02',
        endKey: '2026-11-08',
        todayKey: '2026-11-08'
    });
});

test('getGoalWeek devuelve null con una fecha inválida o que no es Date', () => {
    assert.equal(getGoalWeek(new Date(NaN)), null);
    assert.equal(getGoalWeek('2026-11-05'), null);
    assert.equal(getGoalWeek(null), null);
    assert.equal(getGoalWeek(undefined), null);
    assert.equal(getGoalWeek({}), null);
});

test('calculateGoalProgress incluye el lunes y hoy y excluye futuros y fuera de semana', () => {
    const today = new Date(2026, 10, 5);
    const sessions = [
        createSession('2026-11-01', 100),
        createSession('2026-11-02', 10),
        createSession('2026-11-03', 20),
        createSession('2026-11-05', 30),
        createSession('2026-11-06', 100),
        createSession('2026-11-08', 100),
        createSession('2026-11-09', 100)
    ];

    assert.deepEqual(calculateGoalProgress(sessions, today), {
        weekStartKey: '2026-11-02',
        weekEndKey: '2026-11-08',
        todayKey: '2026-11-05',
        minutes: 60
    });
});

test('calculateGoalProgress incluye el domingo cuando hoy es domingo', () => {
    const today = new Date(2026, 10, 8);
    const sessions = [
        createSession('2026-11-01', 100),
        createSession('2026-11-02', 10),
        createSession('2026-11-08', 20),
        createSession('2026-11-09', 100)
    ];

    assert.deepEqual(calculateGoalProgress(sessions, today), {
        weekStartKey: '2026-11-02',
        weekEndKey: '2026-11-08',
        todayKey: '2026-11-08',
        minutes: 30
    });
});

test('calculateGoalProgress incluye el lunes y excluye los días futuros de la misma semana', () => {
    const today = new Date(2026, 10, 2);
    const sessions = [
        createSession('2026-11-01', 100),
        createSession('2026-11-02', 15),
        createSession('2026-11-08', 20)
    ];

    assert.equal(calculateGoalProgress(sessions, today).minutes, 15);
});

test('calculateGoalProgress suma varias sesiones del mismo día tras redondear cada una', () => {
    const today = new Date(2026, 10, 5);
    const sessions = [
        createSession('2026-11-02', 10),
        createSession('2026-11-02', '20'),
        createSession('2026-11-02', 29.5),
        createSession('2026-11-05', 0.4),
        createSession('2026-11-05', 0.5)
    ];

    // 10 + 20 + 30 + 0 (0.4 no suma) + 1 = 61
    assert.equal(calculateGoalProgress(sessions, today).minutes, 61);
});

test('calculateGoalProgress redondea 29.4, 29.5, 29.6 y descarta 0.4', () => {
    const today = new Date(2026, 10, 5);
    const sessions = [
        createSession('2026-11-02', 29.4),
        createSession('2026-11-03', 29.5),
        createSession('2026-11-04', 29.6),
        createSession('2026-11-05', 0.4)
    ];

    assert.equal(calculateGoalProgress(sessions, today).minutes, 89);
});

test('calculateGoalProgress acepta números y cadenas con espacios y rechaza tipos inválidos', () => {
    const today = new Date(2026, 10, 5);
    const sessions = [
        createSession('2026-11-02', 45),
        createSession('2026-11-02', '45'),
        createSession('2026-11-02', ' 45 '),
        createSession('2026-11-02', '29.5'),
        createSession('2026-11-02', 1.4),
        createSession('2026-11-02', true),
        createSession('2026-11-02', false),
        createSession('2026-11-02', null),
        createSession('2026-11-02', [45]),
        createSession('2026-11-02', { minutos: 45 }),
        createSession('2026-11-02', ''),
        createSession('2026-11-02', '   '),
        createSession('2026-11-02', 'abc'),
        createSession('2026-11-02', NaN),
        createSession('2026-11-02', Infinity),
        createSession('2026-11-02', -Infinity),
        createSession('2026-11-02', -5),
        createSession('2026-11-02', 0),
        createSession('2026-11-02', 0.4),
        createSession('2026-11-02', -0.5),
        createSession('2026-11-02', undefined)
    ];

    // 45 + 45 + 45 + 30 + 1 = 166
    assert.equal(calculateGoalProgress(sessions, today).minutes, 166);
});

test('calculateGoalProgress ignora fechas inválidas y formatos incorrectos', () => {
    const today = new Date(2026, 10, 5);
    const sessions = [
        createSession('2026-11-02', 10),
        createSession('2026-02-30', 100),
        createSession('05/11/2026', 100),
        createSession('2026-1-5', 100),
        createSession('', 100),
        createSession(null, 100),
        createSession(20261105, 100),
        createSession({}, 100)
    ];

    assert.equal(calculateGoalProgress(sessions, today).minutes, 10);
});

test('calculateGoalProgress devuelve 0 sin sesiones, con un no array o con todas inválidas', () => {
    const today = new Date(2026, 10, 5);
    const emptyWeek = {
        weekStartKey: '2026-11-02',
        weekEndKey: '2026-11-08',
        todayKey: '2026-11-05',
        minutes: 0
    };

    assert.deepEqual(calculateGoalProgress([], today), emptyWeek);
    assert.deepEqual(calculateGoalProgress(null, today), emptyWeek);
    assert.deepEqual(calculateGoalProgress(undefined, today), emptyWeek);
    assert.deepEqual(calculateGoalProgress({}, today), emptyWeek);
    assert.deepEqual(calculateGoalProgress('sesiones', today), emptyWeek);
    assert.deepEqual(calculateGoalProgress([
        null,
        [],
        'sesión',
        createSession('2026-02-30', 100),
        createSession('2026-11-02', 'abc')
    ], today), emptyWeek);
});

test('calculateGoalProgress devuelve claves null y 0 minutos con una fecha inválida', () => {
    assert.deepEqual(calculateGoalProgress([createSession('2026-11-02', 10)], new Date(NaN)), {
        weekStartKey: null,
        weekEndKey: null,
        todayKey: null,
        minutes: 0
    });
});

test('calculateGoalProgress calcula bien una semana que cruza mes y año', () => {
    const today = new Date(2026, 0, 1);
    const week = getGoalWeek(today);

    assert.deepEqual(week, {
        startKey: '2025-12-29',
        endKey: '2026-01-04',
        todayKey: '2026-01-01'
    });

    const sessions = [
        createSession('2025-12-28', 100),
        createSession('2025-12-29', 5),
        createSession('2026-01-01', 10),
        createSession('2026-01-04', 100),
        createSession('2026-01-05', 100)
    ];

    assert.equal(calculateGoalProgress(sessions, today).minutes, 15);

    const lastDay = new Date(2026, 0, 4);
    const lastDaySessions = [
        createSession('2025-12-29', 5),
        createSession('2026-01-04', 10)
    ];

    assert.equal(calculateGoalProgress(lastDaySessions, lastDay).minutes, 15);
});

test('calculateGoalProgress incluye el 29 de febrero de un año bisiesto', () => {
    const today = new Date(2024, 1, 29);

    assert.deepEqual(getGoalWeek(today), {
        startKey: '2024-02-26',
        endKey: '2024-03-03',
        todayKey: '2024-02-29'
    });

    const sessions = [
        createSession('2024-02-26', 5),
        createSession('2024-02-29', 10),
        createSession('2024-03-03', 100)
    ];

    assert.equal(calculateGoalProgress(sessions, today).minutes, 15);
});

test('calculateGoalProgress suma 10.000 sesiones sin mutar la entrada', () => {
    const today = new Date(2026, 10, 5);
    const sessions = [];

    for (let index = 0; index < 10000; index++) {
        sessions.push(createSession('2026-11-03', 1));
    }

    const snapshot = JSON.stringify(sessions);

    assert.equal(calculateGoalProgress(sessions, today).minutes, 10000);
    assert.equal(JSON.stringify(sessions), snapshot);
});

test('calculateGoalProgress reutiliza parseMinutes y startOfWeekMonday de Heatmap', () => {
    const today = new Date(2026, 10, 5);
    const sessions = [
        createSession('2026-11-02', ' 30 '),
        createSession('2026-11-03', 29.5),
        createSession('2026-11-05', 45)
    ];

    const expected = sessions.reduce((total, session) => {
        const minutes = Heatmap.parseMinutes(session.minutos);
        return minutes === null ? total : total + minutes;
    }, 0);

    const week = getGoalWeek(today);
    const monday = Heatmap.startOfWeekMonday(today);

    assert.equal(week.startKey, Heatmap.toDateKey(monday));
    assert.equal(week.endKey, Heatmap.toDateKey(Heatmap.addDays(monday, 6)));
    assert.equal(calculateGoalProgress(sessions, today).minutes, expected);
});

test('evaluateGoal sin objetivo devuelve no-goal, sin barra y sin división por cero', () => {
    const invalidGoals = [null, undefined, 0, 10081, 1.5, '300', NaN, Infinity];

    invalidGoals.forEach(goal => {
        const view = evaluateGoal({ goal, minutes: 0 });

        assert.equal(view.state, 'no-goal');
        assert.equal(view.goal, null);
        assert.equal(view.progress, null);
        assert.equal(view.statusTitle, NO_GOAL_TEXTS.title);
        assert.equal(view.counterText, '');
        assert.equal(view.remainingText, '');
        assert.equal(view.excessText, '');
        assert.equal(view.remaining, 0);
        assert.equal(view.excess, 0);
        assert.equal(view.percent, 0);
        assert.equal(Number.isNaN(view.percent), false);
    });

    const withMinutes = evaluateGoal({ goal: null, minutes: 500 });
    assert.equal(withMinutes.state, 'no-goal');
    assert.equal(withMinutes.progress, null);
    assert.equal(withMinutes.counterText.includes(' / 0 min'), false);
});

test('evaluateGoal con 0 / 300 muestra la barra vacía y los 300 minutos faltantes', () => {
    const view = evaluateGoal({ goal: 300, minutes: 0 });

    assert.equal(view.state, 'in-progress');
    assert.equal(view.goal, 300);
    assert.equal(view.minutes, 0);
    assert.equal(view.remaining, 300);
    assert.equal(view.excess, 0);
    assert.equal(view.percent, 0);
    assert.equal(view.statusTitle, '');
    assert.equal(view.counterText, '0 / 300 min');
    assert.equal(view.remainingText, 'Faltan 300 min');
    assert.equal(view.excessText, '');
    assert.deepEqual(view.progress, {
        valueMin: 0,
        valueMax: 300,
        valueNow: 0,
        valueText: '0 de 300 minutos; faltan 300 minutos'
    });
});

test('evaluateGoal con 120 / 300 calcula el 40 por ciento y el restante', () => {
    const view = evaluateGoal({ goal: 300, minutes: 120 });

    assert.equal(view.state, 'in-progress');
    assert.equal(view.remaining, 180);
    assert.equal(view.percent, 40);
    assert.equal(view.counterText, '120 / 300 min');
    assert.equal(view.remainingText, 'Faltan 180 min');
    assert.equal(view.progress.valueNow, 120);
    assert.equal(view.progress.valueText, '120 de 300 minutos; faltan 180 minutos');
});

test('evaluateGoal con 299 / 300 usa el singular de 1 minuto', () => {
    const view = evaluateGoal({ goal: 300, minutes: 299 });

    assert.equal(view.state, 'in-progress');
    assert.equal(view.remaining, 1);
    assert.equal(view.remainingText, 'Falta 1 min');
    assert.equal(view.progress.valueText, '299 de 300 minutos; falta 1 minuto');
});

test('evaluateGoal con 300 / 300 cumple sin exceso ni +0 min', () => {
    const view = evaluateGoal({ goal: 300, minutes: 300 });

    assert.equal(view.state, 'met');
    assert.equal(view.remaining, 0);
    assert.equal(view.excess, 0);
    assert.equal(view.percent, 100);
    assert.equal(view.statusTitle, 'Objetivo cumplido');
    assert.equal(view.counterText, '300 / 300 min');
    assert.equal(view.remainingText, '');
    assert.equal(view.excessText, '');
    assert.equal(view.excessText.includes('+0'), false);
    assert.deepEqual(view.progress, {
        valueMin: 0,
        valueMax: 300,
        valueNow: 300,
        valueText: '300 de 300 minutos; objetivo cumplido'
    });
});

test('evaluateGoal con 301 / 300 muestra 1 minuto de exceso y limita valueNow', () => {
    const view = evaluateGoal({ goal: 300, minutes: 301 });

    assert.equal(view.state, 'exceeded');
    assert.equal(view.remaining, 0);
    assert.equal(view.excess, 1);
    assert.equal(view.percent, 100);
    assert.equal(view.statusTitle, 'Objetivo cumplido');
    assert.equal(view.counterText, '301 / 300 min');
    assert.equal(view.remainingText, '');
    assert.equal(view.excessText, '+1 min');
    assert.equal(view.progress.valueNow, 300);
    assert.equal(
        view.progress.valueText,
        '301 de 300 minutos; objetivo cumplido; 1 minuto de exceso'
    );
});

test('evaluateGoal con 600 / 300 conserva el acumulado y limita la barra al 100 por ciento', () => {
    const view = evaluateGoal({ goal: 300, minutes: 600 });

    assert.equal(view.state, 'exceeded');
    assert.equal(view.excess, 300);
    assert.equal(view.percent, 100);
    assert.equal(view.counterText, '600 / 300 min');
    assert.equal(view.excessText, '+300 min');
    assert.equal(view.progress.valueNow, 300);
    assert.equal(
        view.progress.valueText,
        '600 de 300 minutos; objetivo cumplido; 300 minutos de exceso'
    );
});

test('evaluateGoal muestra los minutos sin decimales ni separador de miles', () => {
    const view = evaluateGoal({ goal: 1000, minutes: 1234 });

    assert.equal(view.counterText, '1234 / 1000 min');
    assert.equal(view.counterText.includes('.'), false);
    assert.equal(view.counterText.includes(','), false);
    assert.equal(view.excessText, '+234 min');
    assert.equal(
        view.progress.valueText,
        '1234 de 1000 minutos; objetivo cumplido; 234 minutos de exceso'
    );
});

test('getSavedAnnouncement combina el éxito con el estado del progreso', () => {
    const inProgress = evaluateGoal({ goal: 300, minutes: 120 });
    const met = evaluateGoal({ goal: 300, minutes: 300 });

    assert.equal(
        getSavedAnnouncement(inProgress),
        'Objetivo semanal guardado. 120 de 300 minutos; faltan 180 minutos'
    );
    assert.equal(
        getSavedAnnouncement(met),
        'Objetivo semanal guardado. 300 de 300 minutos; objetivo cumplido'
    );
});

test('getProgressAnnouncement anuncia el progreso y queda vacío sin objetivo', () => {
    const inProgress = evaluateGoal({ goal: 300, minutes: 120 });
    const exceeded = evaluateGoal({ goal: 300, minutes: 301 });
    const noGoal = evaluateGoal({ goal: null, minutes: 0 });

    assert.equal(
        getProgressAnnouncement(inProgress),
        'Progreso del objetivo: 120 de 300 minutos; faltan 180 minutos'
    );
    assert.equal(
        getProgressAnnouncement(exceeded),
        'Progreso del objetivo: 301 de 300 minutos; objetivo cumplido; 1 minuto de exceso'
    );
    assert.equal(getProgressAnnouncement(noGoal), '');
});

// ---------------------------------------------------------------------------
// T6 — Regresión y pruebas de borde
// ---------------------------------------------------------------------------

// Réplica local del cálculo existente de la tarjeta "Minutos esta semana" de app.js.
// Se usa SOLO para documentar la divergencia esperada; nunca para calcular el objetivo.
function legacyWeeklyMinutes(sessions, today) {
    const todayDate = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const daysSinceMonday = (todayDate.getDay() + 6) % 7;
    const startOfWeek = new Date(todayDate);
    startOfWeek.setDate(todayDate.getDate() - daysSinceMonday);
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 7);

    return sessions.reduce((sum, session) => {
        if (!/^\d{4}-\d{2}-\d{2}$/.test(session.fecha)) return sum;
        const [y, m, d] = session.fecha.split('-').map(Number);
        const sessionDate = new Date(y, m - 1, d);
        if (sessionDate < startOfWeek || sessionDate >= endOfWeek) return sum;
        const minutes = Number(session.minutos);
        return Number.isFinite(minutes) ? sum + minutes : sum;
    }, 0);
}

test('calculateGoalProgress procesa 10.000 sesiones con total correcto, sin mutar y sin reloj real', () => {
    const dates = ['2026-11-02', '2026-11-03', '2026-11-04', '2026-11-05'];
    const minutes = [1, 2, ' 3 ', 4.6];
    const sessions = [];

    for (let index = 0; index < 10000; index++) {
        sessions.push(Object.freeze(createSession(
            dates[index % dates.length],
            minutes[index % minutes.length]
        )));
    }

    Object.freeze(sessions);

    const snapshot = JSON.stringify(sessions);
    const RealDate = globalThis.Date;

    class ClockGuardDate extends RealDate {
        constructor(...args) {
            if (args.length === 0) {
                throw new Error('calculateGoalProgress no debe leer el reloj real');
            }
            super(...args);
        }

        static now() {
            throw new Error('calculateGoalProgress no debe leer el reloj real');
        }
    }

    const today = new ClockGuardDate(2026, 10, 5);
    let result;

    globalThis.Date = ClockGuardDate;
    try {
        result = calculateGoalProgress(sessions, today);
    } finally {
        globalThis.Date = RealDate;
    }

    // 2500 ciclos de (1 + 2 + 3 + 5) = 27.500 minutos.
    assert.deepEqual(result, {
        weekStartKey: '2026-11-02',
        weekEndKey: '2026-11-08',
        todayKey: '2026-11-05',
        minutes: 27500
    });
    assert.equal(sessions.length, 10000);
    assert.equal(JSON.stringify(sessions), snapshot);
    assert.deepEqual(calculateGoalProgress(sessions, new Date(2026, 10, 5)), result);
});

test('el fixture heredado documenta la divergencia esperada con la tarjeta Minutos esta semana', () => {
    const today = new Date(2026, 10, 5);
    const sessions = [
        createSession('2026-11-02', 29.5),
        createSession('2026-11-03', 0.4),
        createSession('2026-11-05', 100),
        createSession('2026-11-06', 60),
        createSession('2026-11-08', 45.6),
        createSession('2026-11-01', 500),
        createSession('2026-11-09', 500)
    ];
    const snapshot = JSON.stringify(sessions);
    const goalMinutes = calculateGoalProgress(sessions, today).minutes;

    // El objetivo redondea cada sesión (29.5 -> 30, 0.4 -> nada) y excluye futuros.
    assert.equal(goalMinutes, 130);

    // La tarjeta heredada no redondea e incluye los días futuros de la misma semana.
    assert.equal(legacyWeeklyMinutes(sessions, today), 235.5);
    assert.equal(legacyWeeklyMinutes(sessions, today) - goalMinutes, 105.5);
    assert.notEqual(legacyWeeklyMinutes(sessions, today), goalMinutes);

    // Documentar la diferencia no migra ni normaliza las sesiones de entrada.
    assert.equal(JSON.stringify(sessions), snapshot);
});

test('las sesiones creadas por el formulario coinciden con la tarjeta Minutos esta semana', () => {
    const today = new Date(2026, 10, 5);
    const sessions = [
        createSession('2026-11-02', 120),
        createSession('2026-11-03', 30),
        createSession('2026-11-05', 45)
    ];

    // Sesiones enteras y no futuras: objetivo y tarjeta heredada coinciden.
    assert.equal(calculateGoalProgress(sessions, today).minutes, 195);
    assert.equal(legacyWeeklyMinutes(sessions, today), 195);
});

test('saveGoal escribe un payload canónico y descarta propiedades adicionales al corregir', () => {
    const storage = createRecordingStorage({
        [SESSIONS_KEY]: SESSIONS_VALUE,
        [GOAL_STORAGE_KEY]: '{"objetivoMinutos":300,"extra":true,"otra":"cosa"}'
    });

    assert.deepEqual(readGoal(storage), { status: 'valid', goal: 300 });
    assert.equal(saveGoal(storage, 120), true);
    assert.equal(storage.get(GOAL_STORAGE_KEY), '{"objetivoMinutos":120}');
    assert.deepEqual(storage.calls.set, [
        { key: GOAL_STORAGE_KEY, value: '{"objetivoMinutos":120}' }
    ]);
    assert.equal(storage.get(SESSIONS_KEY), SESSIONS_VALUE);
    assert.equal(storage.calls.get.includes(SESSIONS_KEY), false);
    assert.deepEqual(storage.calls.remove, []);
});

test('el ciclo completo del objetivo no lee, escribe ni elimina la clave de sesiones', () => {
    const storage = createRecordingStorage({
        [SESSIONS_KEY]: SESSIONS_VALUE,
        [GOAL_STORAGE_KEY]: '{"objetivoMinutos":120}'
    });

    assert.deepEqual(readGoal(storage), { status: 'valid', goal: 120 });
    assert.equal(saveGoal(storage, 300), true);
    assert.equal(saveGoal(storage, 600), true);
    assert.equal(removeGoal(storage), true);
    assert.deepEqual(readGoal(storage), { status: 'missing', goal: null });

    assert.equal(storage.get(SESSIONS_KEY), SESSIONS_VALUE);
    const touchedKeys = [
        ...storage.calls.get,
        ...storage.calls.set.map(call => call.key),
        ...storage.calls.remove
    ];
    assert.equal(touchedKeys.includes(SESSIONS_KEY), false);
    assert.deepEqual(storage.calls.remove, [GOAL_STORAGE_KEY]);
});

test('los fallos del adaptador del objetivo no alteran la clave de sesiones', () => {
    const data = new Map([[SESSIONS_KEY, SESSIONS_VALUE]]);
    const calls = { get: [], set: [], remove: [] };
    const storage = {
        getItem(key) {
            calls.get.push(key);
            if (key === GOAL_STORAGE_KEY) throw new Error('lectura bloqueada');
            return data.has(key) ? data.get(key) : null;
        },
        setItem(key, value) {
            calls.set.push({ key, value });
            if (key === GOAL_STORAGE_KEY) throw new Error('escritura bloqueada');
            data.set(key, value);
        },
        removeItem(key) {
            calls.remove.push(key);
            if (key === GOAL_STORAGE_KEY) throw new Error('borrado bloqueado');
            data.delete(key);
        }
    };

    assert.deepEqual(readGoal(storage), { status: 'unreadable', goal: null });
    assert.equal(saveGoal(storage, 300), false);
    assert.equal(removeGoal(storage), false);
    assert.equal(data.get(SESSIONS_KEY), SESSIONS_VALUE);
    assert.equal(calls.get.includes(SESSIONS_KEY), false);
    assert.equal(calls.set.some(call => call.key === SESSIONS_KEY), false);
    assert.equal(calls.remove.includes(SESSIONS_KEY), false);
});

test('readGoal marca invalid cualquier valor no textual guardado en la clave', () => {
    ['', 'undefined', 'NaN', 0, 300, {}, [], true].forEach(value => {
        const storage = {
            getItem() {
                return value;
            }
        };

        assert.deepEqual(
            readGoal(storage),
            { status: 'invalid', goal: null },
            `debería rechazar ${String(value)}`
        );
    });
});

test('removeGoal sin clave vigente es idempotente y conserva las sesiones', () => {
    const storage = createRecordingStorage({ [SESSIONS_KEY]: SESSIONS_VALUE });

    assert.equal(removeGoal(storage), true);
    assert.deepEqual(readGoal(storage), { status: 'missing', goal: null });
    assert.deepEqual(storage.calls.remove, [GOAL_STORAGE_KEY]);
    assert.equal(storage.get(SESSIONS_KEY), SESSIONS_VALUE);
    assert.deepEqual(storage.calls.set, []);
});

test('calculateGoalProgress respeta los límites de semana cuando hoy es lunes', () => {
    const today = new Date(2026, 10, 2);
    const sessions = [
        createSession('2026-11-01', 100),
        createSession('2026-11-02', 10),
        createSession('2026-11-03', 20),
        createSession('2026-11-04', 20),
        createSession('2026-11-05', 20),
        createSession('2026-11-06', 20),
        createSession('2026-11-07', 20),
        createSession('2026-11-08', 20),
        createSession('2026-11-09', 100)
    ];

    assert.deepEqual(calculateGoalProgress(sessions, today), {
        weekStartKey: '2026-11-02',
        weekEndKey: '2026-11-08',
        todayKey: '2026-11-02',
        minutes: 10
    });
});

test('calculateGoalProgress respeta los límites de semana cuando hoy es domingo', () => {
    const today = new Date(2026, 10, 8);
    const sessions = [
        createSession('2026-11-01', 100),
        createSession('2026-11-02', 10),
        createSession('2026-11-03', 10),
        createSession('2026-11-04', 10),
        createSession('2026-11-05', 10),
        createSession('2026-11-06', 10),
        createSession('2026-11-07', 10),
        createSession('2026-11-08', 10),
        createSession('2026-11-09', 100)
    ];

    assert.deepEqual(calculateGoalProgress(sessions, today), {
        weekStartKey: '2026-11-02',
        weekEndKey: '2026-11-08',
        todayKey: '2026-11-08',
        minutes: 70
    });
});

test('calculateGoalProgress cruza el cambio de año sin salir de la semana local', () => {
    const today = new Date(2026, 11, 31);

    assert.deepEqual(getGoalWeek(today), {
        startKey: '2026-12-28',
        endKey: '2027-01-03',
        todayKey: '2026-12-31'
    });

    const sessions = [
        createSession('2026-12-27', 100),
        createSession('2026-12-28', 1),
        createSession('2026-12-29', 1),
        createSession('2026-12-30', 1),
        createSession('2026-12-31', 1),
        createSession('2027-01-01', 100),
        createSession('2027-01-03', 100),
        createSession('2027-01-04', 100)
    ];

    assert.equal(calculateGoalProgress(sessions, today).minutes, 4);
});

test('calculateGoalProgress cruza el cambio de mes dentro de la misma semana', () => {
    const today = new Date(2026, 9, 1);

    assert.deepEqual(getGoalWeek(today), {
        startKey: '2026-09-28',
        endKey: '2026-10-04',
        todayKey: '2026-10-01'
    });

    const sessions = [
        createSession('2026-09-27', 100),
        createSession('2026-09-28', 1),
        createSession('2026-09-30', 2),
        createSession('2026-10-01', 3),
        createSession('2026-10-02', 100),
        createSession('2026-10-04', 100),
        createSession('2026-10-05', 100)
    ];

    assert.equal(calculateGoalProgress(sessions, today).minutes, 6);
});

test('calculateGoalProgress ubica el 29 de febrero bisiesto y el 28 no bisiesto', () => {
    const leapDay = new Date(2028, 1, 29);

    assert.deepEqual(getGoalWeek(leapDay), {
        startKey: '2028-02-28',
        endKey: '2028-03-05',
        todayKey: '2028-02-29'
    });
    assert.equal(calculateGoalProgress([
        createSession('2028-02-27', 100),
        createSession('2028-02-28', 5),
        createSession('2028-02-29', 10),
        createSession('2028-03-05', 100),
        createSession('2028-03-06', 100)
    ], leapDay).minutes, 15);

    const nonLeapDay = new Date(2026, 1, 28);

    assert.deepEqual(getGoalWeek(nonLeapDay), {
        startKey: '2026-02-23',
        endKey: '2026-03-01',
        todayKey: '2026-02-28'
    });
    assert.equal(calculateGoalProgress([
        createSession('2026-02-22', 100),
        createSession('2026-02-23', 1),
        createSession('2026-02-28', 2),
        createSession('2026-02-29', 100),
        createSession('2026-03-01', 100),
        createSession('2026-03-02', 100)
    ], nonLeapDay).minutes, 3);
});

test('calculateGoalProgress ignora fechas imposibles, formatos con relleno y entradas no objeto', () => {
    const today = new Date(2026, 10, 5);
    const sessions = [
        createSession('2026-11-02', 10),
        createSession('2026-02-29', 100),
        createSession('2026-04-31', 100),
        createSession('2026-13-01', 100),
        createSession('2026-00-10', 100),
        createSession('2026-11-00', 100),
        createSession(' 2026-11-02 ', 100),
        createSession('2026-11-2', 100),
        createSession('2026-11-02T00:00:00', 100),
        createSession(20261102, 100),
        createSession(null, 100),
        createSession({}, 100),
        {},
        null,
        undefined,
        [],
        'sesión',
        42,
        true
    ];

    assert.equal(calculateGoalProgress(sessions, today).minutes, 10);
});

test('calculateGoalProgress usa solo la fecha local aunque today traiga hora', () => {
    const today = new Date(2026, 10, 5, 23, 59, 59, 999);
    const sessions = [
        createSession('2026-11-05', 10),
        createSession('2026-11-06', 100)
    ];

    assert.deepEqual(getGoalWeek(today), {
        startKey: '2026-11-02',
        endKey: '2026-11-08',
        todayKey: '2026-11-05'
    });
    assert.equal(calculateGoalProgress(sessions, today).minutes, 10);
});

test('evaluateGoal normaliza minutos ausentes, inválidos y fraccionarios', () => {
    assert.equal(evaluateGoal().state, 'no-goal');
    assert.equal(evaluateGoal(null).state, 'no-goal');
    assert.equal(evaluateGoal('texto').state, 'no-goal');
    assert.equal(evaluateGoal([]).state, 'no-goal');

    const stringMinutes = evaluateGoal({ goal: 300, minutes: '120' });
    assert.equal(stringMinutes.minutes, 0);
    assert.equal(stringMinutes.counterText, '0 / 300 min');
    assert.equal(stringMinutes.remainingText, 'Faltan 300 min');

    assert.equal(evaluateGoal({ goal: 300, minutes: NaN }).minutes, 0);
    assert.equal(evaluateGoal({ goal: 300, minutes: Infinity }).minutes, 0);
    assert.equal(evaluateGoal({ goal: 300, minutes: -20 }).minutes, 0);
    assert.equal(evaluateGoal({ goal: 300, minutes: null }).minutes, 0);
    assert.equal(evaluateGoal({ goal: 300, minutes: 0.4 }).minutes, 0);
    assert.equal(evaluateGoal({ goal: 300, minutes: 0.5 }).minutes, 1);
    assert.equal(evaluateGoal({ goal: 300, minutes: 120.4 }).minutes, 120);
    assert.equal(evaluateGoal({ goal: 300, minutes: 120.5 }).minutes, 121);
    assert.equal(evaluateGoal({ goal: 300, minutes: 120.5 }).remainingText, 'Faltan 179 min');
});

test('los anuncios toleran vistas incompletas y sin barra', () => {
    assert.equal(getSavedAnnouncement(null), GOAL_MESSAGES.saved);
    assert.equal(getSavedAnnouncement({}), GOAL_MESSAGES.saved);
    assert.equal(getSavedAnnouncement({ progress: null }), GOAL_MESSAGES.saved);
    assert.equal(
        getSavedAnnouncement(evaluateGoal({ goal: null, minutes: 0 })),
        GOAL_MESSAGES.saved
    );
    assert.equal(getProgressAnnouncement(null), '');
    assert.equal(getProgressAnnouncement({}), '');
    assert.equal(getProgressAnnouncement({ progress: null }), '');
    assert.equal(getProgressAnnouncement({ progress: {} }), '');
});

test('parseGoalInput rechaza notación alternativa, signos y dígitos no ASCII', () => {
    const invalidInputs = [
        '0x10',
        '0b10',
        '0o10',
        '1_000',
        '+0',
        '-0',
        '+1',
        '1.',
        '.5',
        '１２０',
        '١٢٠',
        '³'
    ];

    invalidInputs.forEach(rawValue => {
        assert.deepEqual(parseGoalInput(rawValue), {
            action: 'invalid',
            reason: 'format',
            message: GOAL_MESSAGES.format
        }, `debería rechazar ${rawValue}`);
    });
});

test('parseGoalInput distingue ceros con espacios y normaliza ceros a la izquierda', () => {
    assert.deepEqual(parseGoalInput(' 00 '), {
        action: 'invalid',
        reason: 'range',
        message: GOAL_MESSAGES.range
    });
    assert.deepEqual(parseGoalInput('0000'), {
        action: 'invalid',
        reason: 'range',
        message: GOAL_MESSAGES.range
    });
    assert.deepEqual(parseGoalInput('0.0'), {
        action: 'invalid',
        reason: 'format',
        message: GOAL_MESSAGES.format
    });
    assert.deepEqual(parseGoalInput(' 0001 '), { action: 'save', value: 1 });
    assert.deepEqual(parseGoalInput('000300'), { action: 'save', value: 300 });
});
