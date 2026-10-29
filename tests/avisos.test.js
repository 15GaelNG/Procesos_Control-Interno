// Avisos por correo (src/services/Avisos.gs, decisión 27): a quién llegan (en pruebas, los usuarios de
// prueba no tienen buzón) y qué dicen.
const test = require('node:test');
const assert = require('node:assert');
const { cargarGs } = require('./cargar-gs');

const gs = cargarGs(['src/config/Config.gs', 'src/config/Catalogos.gs', 'src/services/Avisos.gs']);
const plano = function (v) { return JSON.parse(JSON.stringify(v)); };

test('destinatarios: sin repetidos ni direcciones malas; los de prueba solo en PRUEBAS, a quien hizo la acción', function () {
  const lista = ['Procesos.CI@ciudadmaderas.com', 'procesos.ci@ciudadmaderas.com', '', 'no-es-correo', 'revisor@procesos.test', 'ana@procesos.test'];
  assert.deepStrictEqual(plano(gs.destinatariosAviso_(lista, 'PRUEBAS', 'gael@ciudadmaderas.com')),
    { para: ['procesos.ci@ciudadmaderas.com', 'gael@ciudadmaderas.com'], redirigidos: ['revisor@procesos.test', 'ana@procesos.test'] });
  assert.deepStrictEqual(plano(gs.destinatariosAviso_(lista, 'PRODUCCION', 'gael@ciudadmaderas.com')),
    { para: ['procesos.ci@ciudadmaderas.com'], redirigidos: [] });
  assert.deepStrictEqual(plano(gs.destinatariosAviso_(['ana@procesos.test'], 'PRUEBAS', '')), { para: [], redirigidos: [] });
});

test('devuelta: lista las observaciones por atender y lleva el botón a la solicitud', function () {
  const c = gs.contenidoAviso_('DEVUELTA', { ID_SOLICITUD: 'SOL-2026-0007', NOMBRE_DOCUMENTO: 'Alta <de> proveedores',
    observaciones: [{ nombreApartado: 'Actividad 2', texto: 'Falta quién autoriza' }] }, 'https://app/exec?vista=solicitud&id=SOL-2026-0007%3Avista');
  assert.strictEqual(c.asunto, 'Procesos te devolvió «Alta <de> proveedores» con observaciones');
  assert.ok(c.html.indexOf('<strong>Actividad 2:</strong> Falta quién autoriza') !== -1);
  assert.ok(c.html.indexOf('Alta &lt;de&gt; proveedores') !== -1, 'el nombre va escapado en el HTML');
  assert.ok(c.html.indexOf('href="https://app/exec?vista=solicitud&amp;id=SOL-2026-0007%3Avista"') !== -1);
});

test('cada aviso tiene su asunto; uno desconocido es un error', function () {
  const f = { ID_SOLICITUD: 'SOL-1', NOMBRE_DOCUMENTO: 'Alta', ELABORO_NOMBRE: 'Ana', REVISION: '2', CODIGO: 'P-CI04-001', VERSION: '0.0',
    AUTORIZO_NOMBRE: 'Lic. Soto', COMENTARIO_CH: 'Falta firma', MOTIVO_CIERRE: 'Ya existe' };
  assert.deepStrictEqual(['NUEVA_REVISION', 'VOBO', 'AUTORIZADA', 'RECHAZADA_CH', 'NO_PROCEDENTE'].map(function (t) { return gs.contenidoAviso_(t, f, '').asunto; }), [
    'Nueva solicitud para revisar: Alta (SOL-1)', '«Alta» tiene el Vo.Bo. de Procesos', '«Alta» fue autorizado',
    'CH no autorizó «Alta»', 'Procesos cerró «Alta» como no procedente']);
  assert.throws(function () { gs.contenidoAviso_('OTRO', f, ''); }, /desconocido/);
});
