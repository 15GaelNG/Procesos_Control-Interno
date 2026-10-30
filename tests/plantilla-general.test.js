// Todos los tipos de documento usan la misma plantilla si no tienen la suya (Documentos.gs, decisión 36).
const test = require('node:test');
const assert = require('node:assert');
const { cargarGs } = require('./cargar-gs');

function conPlantillas(porNombre) {
  return cargarGs(['src/config/Config.gs', 'src/config/Catalogos.gs', 'src/services/Documentos.gs'], {
    DriveApp: {
      getFolderById: function () { return {}; },
      getFileById: function (id) {
        if (id === 'ROTA') throw new Error('no existe');
        return { id: id, isTrashed: function () { return false; } };
      }
    },
    propiedadObligatoria_: function () { return 'carpeta'; },
    buscarDocPorNombre_: function (carpeta, nombre) { return porNombre[nombre] || null; }
  });
}
const PROCEDIMIENTO = { ID_TIPO: 'TD-02', NOMBRE: 'Procedimiento', ID_PLANTILLA_PRELIMINAR: 'P-PRE', ID_PLANTILLA_FINAL: 'P-FIN' };
const MANUAL = { ID_TIPO: 'TD-01', NOMBRE: 'Manual', ID_PLANTILLA_PRELIMINAR: '', ID_PLANTILLA_FINAL: '' };
const TIPOS = [MANUAL, PROCEDIMIENTO];

test('un tipo sin plantilla usa la de Procedimiento, preliminar o final', function () {
  const gs = conPlantillas({});
  assert.strictEqual(gs.plantillaDeTipo_(MANUAL, 'PRELIMINAR', TIPOS).id, 'P-PRE');
  assert.strictEqual(gs.plantillaDeTipo_(MANUAL, 'FINAL', TIPOS).id, 'P-FIN');
});

test('si el tipo tiene la suya, se usa la suya (por ID o por nombre)', function () {
  const gs = conPlantillas({ 'Manual - Preliminar': { id: 'M-NOMBRE' } });
  assert.strictEqual(gs.plantillaDeTipo_(MANUAL, 'PRELIMINAR', TIPOS).id, 'M-NOMBRE');
  assert.strictEqual(gs.plantillaDeTipo_(Object.assign({}, MANUAL, { ID_PLANTILLA_FINAL: 'M-FIN' }), 'FINAL', TIPOS).id, 'M-FIN');
});

test('un ID que ya no sirve no estorba; si no hay ninguna, lo dice', function () {
  const gs = conPlantillas({});
  assert.strictEqual(gs.plantillaDeTipo_(Object.assign({}, MANUAL, { ID_PLANTILLA_PRELIMINAR: 'ROTA' }), 'PRELIMINAR', TIPOS).id, 'P-PRE');
  const sinNada = Object.assign({}, PROCEDIMIENTO, { ID_PLANTILLA_PRELIMINAR: '' });
  assert.throws(function () { gs.plantillaDeTipo_(MANUAL, 'PRELIMINAR', [MANUAL, sinNada]); }, /No está la plantilla «Procedimiento - Preliminar»/);
});
