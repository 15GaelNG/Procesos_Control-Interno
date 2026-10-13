// Pruebas del cliente de IA (src/ia/ClienteIA.gs) con Google simulado: reintentos cuando el modelo
// está saturado y cambio al siguiente modelo cuando no responde o no tiene cuota.
const test = require('node:test');
const assert = require('node:assert');
const { cargarGs } = require('./cargar-gs');

function respuesta(codigo, cuerpo) {
  return { getResponseCode: function () { return codigo; }, getContentText: function () { return JSON.stringify(cuerpo); } };
}
const OK = respuesta(200, {
  candidates: [{ content: { parts: [{ text: 'pensando…', thought: true }, { text: '```json\n{"listo":true}\n```' }] } }],
  usageMetadata: { promptTokenCount: 10, candidatesTokenCount: 5 }
});

/** Contexto con Google simulado. `porModelo` dice qué responde cada modelo, en orden de llamada. */
function crear(porModelo, config) {
  const cache = {};
  const usos = [];
  const llamadas = [];
  const gs = cargarGs(['src/config/Config.gs', 'src/ia/ClienteIA.gs'], {
    PropertiesService: { getScriptProperties: function () { return { getProperty: function () { return 'llave-falsa'; } }; } },
    CacheService: { getScriptCache: function () { return {
      get: function (k) { return cache[k] || null; },
      put: function (k, v) { cache[k] = v; },
      remove: function (k) { delete cache[k]; }
    }; } },
    LockService: { getScriptLock: function () { return { waitLock: function () {}, releaseLock: function () {} }; } },
    Utilities: { sleep: function () {}, formatDate: function () { return '20261013'; } },
    Session: { getActiveUser: function () { return { getEmail: function () { return 'yo@empresa.com'; } }; },
      getEffectiveUser: function () { return { getEmail: function () { return 'yo@empresa.com'; } }; } },
    UrlFetchApp: { fetch: function (url) {
      if (url.indexOf(':generateContent') === -1) {
        return respuesta(200, { models: Object.keys(porModelo).map(function (id) {
          return { name: 'models/' + id, supportedGenerationMethods: ['generateContent'] };
        }) });
      }
      const modelo = decodeURIComponent(url.split('/models/')[1].split(':')[0]);
      llamadas.push(modelo);
      return porModelo[modelo].shift();
    } },
    obtenerConfig_: function (clave, porDefecto) { return (config || {})[clave] || porDefecto; },
    agregarFila_: function (hoja, fila) { usos.push(fila); }
  });
  return { gs: gs, usos: usos, llamadas: llamadas, cache: cache };
}

const P = { operacion: 'PRUEBA', sistema: 'reglas', usuario: 'texto' };

test('si un modelo está saturado reintenta una vez y luego pasa al siguiente', function () {
  const c = crear({
    'gemini-3.5-flash': [respuesta(503, {}), respuesta(503, {})],
    'gemini-3.6-flash': [OK]
  });
  const r = c.gs.llamarIAJson_(P);
  assert.strictEqual(r.modelo, 'gemini-3.6-flash');
  assert.deepStrictEqual(JSON.parse(JSON.stringify(r.datos)), { listo: true });
  assert.deepStrictEqual(c.llamadas, ['gemini-3.5-flash', 'gemini-3.5-flash', 'gemini-3.6-flash']);
  assert.strictEqual(c.usos.length, 3);   // cada intento queda en UsoIA
  assert.strictEqual(c.cache['ia-modelo-elegido'], 'gemini-3.6-flash');
});

test('un 503 que se recupera al reintentar se queda con el mismo modelo', function () {
  const c = crear({ 'gemini-3.5-flash': [respuesta(503, {}), OK], 'gemini-3.6-flash': [] });
  assert.strictEqual(c.gs.llamarIAJson_(P).modelo, 'gemini-3.5-flash');
});

test('sin cuota (429) pasa al siguiente modelo sin reintentar', function () {
  const c = crear({ 'gemini-3.5-flash': [respuesta(429, {})], 'gemini-2.5-flash': [OK] });
  const r = c.gs.llamarIAJson_(P);
  assert.strictEqual(r.modelo, 'gemini-2.5-flash');
  assert.deepStrictEqual(c.llamadas, ['gemini-3.5-flash', 'gemini-2.5-flash']);
});

test('una llave inválida (403) no prueba otros modelos', function () {
  const c = crear({ 'gemini-3.5-flash': [respuesta(403, { error: { message: 'API key not valid' } })], 'gemini-3.6-flash': [OK] });
  assert.throws(function () { c.gs.llamarIAJson_(P); }, /llave de la IA no es válida/);
  assert.deepStrictEqual(c.llamadas, ['gemini-3.5-flash']);
});

test('si todos fallan, el error dice qué se intentó', function () {
  const c = crear({ 'gemini-3.5-flash': [respuesta(503, {}), respuesta(503, {})], 'gemini-3.6-flash': [respuesta(429, {})] });
  assert.throws(function () { c.gs.llamarIAJson_(P); }, /Intentos: gemini-3\.5-flash: HTTP 503 · gemini-3\.5-flash: HTTP 503 · gemini-3\.6-flash: HTTP 429/);
});

test('con IA_MODELO fijo en Config solo se usa ese modelo', function () {
  const c = crear({ 'gemini-2.5-flash': [OK], 'gemini-3.5-flash': [OK] }, { IA_MODELO: 'gemini-2.5-flash' });
  assert.strictEqual(c.gs.llamarIAJson_(P).modelo, 'gemini-2.5-flash');
  assert.deepStrictEqual(c.llamadas, ['gemini-2.5-flash']);
});

test('el último modelo que funcionó se intenta primero', function () {
  const c = crear({ 'gemini-3.5-flash': [OK], 'gemini-3.6-flash': [OK] });
  c.cache['ia-modelo-elegido'] = 'gemini-3.6-flash';
  assert.strictEqual(c.gs.llamarIAJson_(P).modelo, 'gemini-3.6-flash');
});
