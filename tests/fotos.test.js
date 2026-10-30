// Fotos de perfil de Google (src/services/Fotos.gs, decisión 40).
const test = require('node:test');
const assert = require('node:assert');
const { cargarGs } = require('./cargar-gs');

const plano = function (v) { return JSON.parse(JSON.stringify(v)); };

function persona(correo, fotos) {
  return { emailAddresses: [{ value: correo }], photos: fotos };
}

// Un directorio y una caché de mentira; `pedidas` guarda a quién se le preguntó al directorio.
function preparar(directorio, enCache) {
  const pedidas = [];
  const memoria = Object.assign({}, enCache);
  const gs = cargarGs(['src/config/Config.gs', 'src/services/Fotos.gs'], {
    People: { People: { searchDirectoryPeople: function (o) { pedidas.push(o.query); return directorio(o.query); } } },
    CacheService: { getScriptCache: function () {
      return {
        getAll: function (claves) { const r = {}; claves.forEach(function (c) { if (c in memoria) r[c] = memoria[c]; }); return r; },
        put: function (c, v) { memoria[c] = v; }
      };
    } }
  });
  return { gs: gs, pedidas: pedidas, memoria: memoria };
}

test('foto de la respuesta: la de esa persona, sin la silueta genérica, del tamaño del avatar', function () {
  const { gs } = preparar(function () { return {}; });
  const correo = 'ana@x.mx';
  assert.strictEqual(gs.fotoDeRespuesta_({ people: [persona('ANA@x.mx ', [
    { url: 'https://g/otra=s100' }, { url: 'https://g/a=s100-c', metadata: { primary: true } }])] }, correo), 'https://g/a=s96-c');
  assert.strictEqual(gs.fotoDeRespuesta_({ people: [persona(correo, [{ url: 'https://g/sin-tamano' }])] }, correo), 'https://g/sin-tamano=s96-c');
  assert.strictEqual(gs.fotoDeRespuesta_({ people: [persona(correo, [{ url: 'https://g/silueta=s100', default: true }])] }, correo), '');
  assert.strictEqual(gs.fotoDeRespuesta_({ people: [persona('luis@x.mx', [{ url: 'https://g/l=s100' }])] }, correo), '', 'otra persona no cuenta');
  assert.strictEqual(gs.fotoDeRespuesta_({}, correo), '');
});

test('fotos: lo de la caché no va al directorio, sin repetir, y también se recuerda a quien no tiene foto', function () {
  const p = preparar(function (c) {
    return c === 'con@x.mx' ? { people: [persona(c, [{ url: 'https://g/c=s100' }])] } : {};
  }, { 'foto_ya@x.mx': JSON.stringify({ url: 'https://g/ya=s96-c' }), 'foto_nada@x.mx': JSON.stringify({ url: '' }) });
  const r = plano(p.gs.fotosDe_(['ya@x.mx', 'NADA@x.mx', 'con@x.mx', 'con@x.mx ', 'sin@x.mx', '']));
  assert.deepStrictEqual(r, { fotos: { 'ya@x.mx': 'https://g/ya=s96-c', 'nada@x.mx': '', 'con@x.mx': 'https://g/c=s96-c', 'sin@x.mx': '' }, faltan: 0 });
  assert.deepStrictEqual(p.pedidas, ['con@x.mx', 'sin@x.mx']);
  assert.strictEqual(p.memoria['foto_sin@x.mx'], JSON.stringify({ url: '' }));
});

test('fotos: tope por llamada; las que faltan llegan en la siguiente', function () {
  const p = preparar(function () { return {}; });
  const correos = [];
  for (let i = 0; i < 30; i++) correos.push('u' + i + '@x.mx');
  const primera = plano(p.gs.fotosDe_(correos));
  assert.strictEqual(Object.keys(primera.fotos).length, 25);
  assert.strictEqual(primera.faltan, 5);
  const segunda = plano(p.gs.fotosDe_(correos));
  assert.strictEqual(Object.keys(segunda.fotos).length, 30);
  assert.strictEqual(segunda.faltan, 0);
  assert.strictEqual(p.pedidas.length, 30);
});

test('fotos: si el directorio falla no insiste ni recuerda el fallo', function () {
  const p = preparar(function () { throw new Error('sin permiso'); }, { 'foto_ya@x.mx': JSON.stringify({ url: 'https://g/ya=s96-c' }) });
  const r = plano(p.gs.fotosDe_(['ya@x.mx', 'a@x.mx', 'b@x.mx']));
  assert.deepStrictEqual(r, { fotos: { 'ya@x.mx': 'https://g/ya=s96-c' }, faltan: 0 });
  assert.deepStrictEqual(p.pedidas, ['a@x.mx']);
  assert.ok(!('foto_a@x.mx' in p.memoria));
});
