// Tablero de indicadores (src/services/Tablero.gs, decisión 30).
const test = require('node:test');
const assert = require('node:assert');
const { cargarGs } = require('./cargar-gs');

const gs = cargarGs(['src/config/Config.gs', 'src/config/Catalogos.gs', 'src/utils/Texto.gs', 'src/services/Usuarios.gs',
  'src/services/Solicitudes.gs', 'src/services/Tablero.gs']);
const plano = function (v) { return JSON.parse(JSON.stringify(v)); };

const AHORA = new Date(2026, 9, 29, 12, 0);
const T = { departamentos: [{ ID_DEPARTAMENTO: 'D1', NOMBRE: 'COMPRAS' }, { ID_DEPARTAMENTO: 'D2', NOMBRE: 'CONTROL INTERNO' }],
  usuarios: [{ ID_USUARIO: 'R1', NOMBRE: 'Paola' }, { ID_USUARIO: 'R2', NOMBRE: 'Carlos' }] };
function s(id, estado, cambios) {
  return Object.assign({ ID_SOLICITUD: id, NOMBRE_DOCUMENTO: 'Proceso ' + id, ESTADO: estado, ID_DEPARTAMENTO: 'D1', ELABORO_ID: 'U1',
    ELABORO_NOMBRE: 'Ana', REVISION: '0', FECHA_ELABORACION: new Date(2026, 9, 1) }, cambios);
}
const SOLICITUDES = [
  s('S1', 'BORRADOR'),
  s('S2', 'EN_REVISION', { REVISION: '1', FECHA_ENVIO_REVISION: new Date(2026, 9, 20), REVISOR_ASIGNADO_ID: 'R1' }),
  s('S3', 'EN_REVISION', { REVISION: '2', FECHA_ENVIO_REVISION: new Date(2026, 9, 25), ID_DEPARTAMENTO: 'D2' }),
  s('S4', 'DEVUELTO', { REVISION: '1', ELABORO_ID: 'U2', ELABORO_NOMBRE: 'Luis' }),
  s('S5', 'AUTORIZADO', { REVISION: '1', FECHA_ELABORACION: new Date(2026, 8, 1), FECHA_ENVIO_REVISION: new Date(2026, 8, 10),
    FECHA_REVISION: new Date(2026, 8, 14), REVISO_ID: 'R2', FECHA_AUTORIZACION: new Date(2026, 8, 21) }),
  s('S6', 'CANCELADO')
];

test('totales por etapa; las canceladas solo aparte', function () {
  const r = plano(gs.tablero_(SOLICITUDES, T, AHORA, function () { return 'hoy'; }));
  assert.deepStrictEqual(r.totales, { total: 5, enCaptura: 1, conObservaciones: 1, enRevision: 2, sinAsignar: 1, enCH: 0,
    autorizadas: 1, noProcedentes: 0, canceladas: 1 });
  assert.deepStrictEqual(r.etapas.map(function (e) { return e.estado + ':' + e.n; }),
    ['BORRADOR:1', 'CONFIRMADO:0', 'EN_REVISION:2', 'DEVUELTO:1', 'EN_AUTORIZACION_CH:0', 'AUTORIZADO:1', 'NO_PROCEDENTE:0']);
});

test('tiempos promedio, devoluciones y lo que más lleva esperando', function () {
  const r = plano(gs.tablero_(SOLICITUDES, T, AHORA, function () { return 'hoy'; }));
  assert.deepStrictEqual(r.tiempos, { revision: 4, autorizacion: 7, total: 20 });
  assert.deepStrictEqual(r.devoluciones, { enviadas: 4, conDevolucion: 2, porcentaje: 50 });
  assert.deepStrictEqual(r.esperando.map(function (x) { return x.id + ':' + x.dias + ':' + x.revisor; }), ['S2:9:Paola', 'S3:4:']);
});

test('por departamento, colaborador y revisor; y por mes', function () {
  const r = plano(gs.tablero_(SOLICITUDES, T, AHORA, function () { return 'hoy'; }));
  assert.deepStrictEqual(r.departamentos.map(function (d) { return [d.nombre, d.total, d.enCurso, d.autorizadas]; }),
    [['COMPRAS', 4, 3, 1], ['CONTROL INTERNO', 1, 1, 0]]);
  assert.deepStrictEqual(r.colaboradores.map(function (c) { return [c.nombre, c.total, c.devueltas]; }), [['Ana', 4, 1], ['Luis', 1, 1]]);
  assert.deepStrictEqual(r.revisores, [{ nombre: 'Carlos', asignadas: 0, vobos: 1, promedioDias: 4 }, { nombre: 'Paola', asignadas: 1, vobos: 0, promedioDias: null }]);
  assert.deepStrictEqual(r.porMes.slice(-2), [{ mes: 'sep 2026', creadas: 1, autorizadas: 1 }, { mes: 'oct 2026', creadas: 4, autorizadas: 0 }]);
  assert.strictEqual(r.porMes.length, 6);
});
