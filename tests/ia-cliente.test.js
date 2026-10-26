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
  const cuerpos = [];
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
    UrlFetchApp: { fetch: function (url, opciones) {
      if (url.indexOf(':generateContent') === -1) {
        return respuesta(200, { models: Object.keys(porModelo).map(function (id) {
          return { name: 'models/' + id, supportedGenerationMethods: ['generateContent'] };
        }) });
      }
      const modelo = decodeURIComponent(url.split('/models/')[1].split(':')[0]);
      llamadas.push(modelo);
      cuerpos.push(JSON.parse(opciones.payload));
      const r = porModelo[modelo].shift();
      if (r instanceof Error) throw r;
      return r;
    } },
    obtenerConfig_: function (clave, porDefecto) { return (config || {})[clave] || porDefecto; },
    agregarFila_: function (hoja, fila) { usos.push(fila); }
  });
  return { gs: gs, usos: usos, llamadas: llamadas, cache: cache, cuerpos: cuerpos };
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

// ─────────────────────────────── Topes de la respuesta (26/10/2026) ───────────────────────────────

test('cada llamada pide JSON con temperatura baja y topes de respuesta y de razonamiento', function () {
  const c = crear({ 'gemini-3.5-flash': [OK] });
  c.gs.llamarIAJson_(P);
  const g = c.cuerpos[0].generationConfig;
  assert.deepStrictEqual([g.responseMimeType, g.temperature, g.maxOutputTokens, g.thinkingConfig.thinkingBudget], ['application/json', 0.2, 8192, 1024]);
});

test('si el modelo no acepta el tope de razonamiento (400), repite sin él y lo recuerda', function () {
  const c = crear({ 'gemini-3.5-flash': [respuesta(400, { error: { message: 'Thinking budget is not supported by this model' } }), OK, OK] });
  assert.strictEqual(c.gs.llamarIAJson_(P).modelo, 'gemini-3.5-flash');
  assert.deepStrictEqual(c.cuerpos.map(function (b) { return !!b.generationConfig.thinkingConfig; }), [true, false]);
  assert.strictEqual(c.cache['ia-sin-tope-pensamiento-gemini-3.5-flash'], 'SI');
  c.gs.llamarIAJson_(P);
  assert.strictEqual(c.cuerpos[2].generationConfig.thinkingConfig, undefined, 'la siguiente ya va sin él');
});

test('un 400 que no es por el razonamiento no se repite', function () {
  const c = crear({ 'gemini-3.5-flash': [respuesta(400, { error: { message: 'Invalid JSON payload' } })], 'gemini-3.6-flash': [OK] });
  assert.throws(function () { c.gs.llamarIAJson_(P); }, /rechazó la solicitud \(400\)/);
  assert.deepStrictEqual(c.llamadas, ['gemini-3.5-flash']);
});

test('si Google corta la llamada por tiempo, el mensaje es claro, queda en UsoIA y no se intenta otro modelo', function () {
  const c = crear({ 'gemini-3.5-flash': [new Error('Tiempo de espera: https://generativelanguage.googleapis.com/x')], 'gemini-3.6-flash': [OK] });
  assert.throws(function () { c.gs.llamarIAJson_(P); }, /tardó demasiado en responder/);
  assert.deepStrictEqual([c.llamadas, c.usos[0].RESULTADO], [['gemini-3.5-flash'], 'TIEMPO_AGOTADO']);
});

test('una respuesta cortada por el tope (MAX_TOKENS) se avisa en lugar de intentar leerla', function () {
  const cortada = respuesta(200, { candidates: [{ finishReason: 'MAX_TOKENS', content: { parts: [{ text: '{"actividades": [' }] } }] });
  const c = crear({ 'gemini-3.5-flash': [cortada] });
  assert.throws(function () { c.gs.llamarIAJson_(P); }, /se cortó/);
  assert.strictEqual(c.usos[0].RESULTADO, 'MAX_TOKENS');
});
