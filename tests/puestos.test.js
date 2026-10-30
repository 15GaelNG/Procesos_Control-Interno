// Catálogo de puestos (src/services/Puestos.gs, decisión 34) y «Todas las solicitudes» de Soporte CI.
const test = require('node:test');
const assert = require('node:assert');
const { cargarGs } = require('./cargar-gs');

const gs = cargarGs(['src/config/Config.gs', 'src/config/Catalogos.gs', 'src/utils/Texto.gs', 'src/services/Usuarios.gs',
  'src/services/Solicitudes.gs', 'src/services/AnalisisSolicitud.gs', 'src/services/Puestos.gs']);
const plano = function (v) { return JSON.parse(JSON.stringify(v)); };

const DEPTOS = [{ ID_DEPARTAMENTO: 'DEP-001', NOMBRE: 'COMPRAS' }];
const PUESTOS = [{ ID_PUESTO: 'PUE-0001', NOMBRE: 'Auxiliar de Compras', ID_DEPARTAMENTO: 'DEP-001', SINONIMOS: 'aux. compras', ACTIVO: 'SI' },
  { ID_PUESTO: 'PUE-0002', NOMBRE: 'Puesto viejo', ACTIVO: 'NO' }];

test('lista: activos primero, por nombre, con su departamento', function () {
  assert.deepStrictEqual(plano(gs.listaPuestos_(PUESTOS, DEPTOS)).map(function (p) { return [p.nombre, p.departamento, p.activo]; }),
    [['Auxiliar de Compras', 'COMPRAS', true], ['Puesto viejo', '', false]]);
});

test('guardar: nombre obligatorio y sin repetir, sinónimos limpios, solo lo que cambió', function () {
  assert.deepStrictEqual(plano(gs.planPuesto_({ nombre: ' Jefe  de Compras ', idDepartamento: 'DEP-001', sinonimos: 'jefe, Jefe ;encargado,' }, PUESTOS, DEPTOS)),
    { errores: [], cambios: { NOMBRE: 'Jefe de Compras', ID_DEPARTAMENTO: 'DEP-001', SINONIMOS: 'jefe, encargado', ACTIVO: 'SI' } });
  assert.ok(/Ya existe/.test(gs.planPuesto_({ nombre: 'auxiliar de compras' }, PUESTOS, DEPTOS).errores.join()));
  assert.deepStrictEqual(plano(gs.planPuesto_({ nombre: 'Puesto viejo' }, PUESTOS, DEPTOS)).errores, [], 'uno dado de baja no estorba');
  assert.ok(/nombre del puesto/.test(gs.planPuesto_({ nombre: 'x' }, PUESTOS, DEPTOS).errores.join()));
  assert.ok(/departamento no existe/.test(gs.planPuesto_({ nombre: 'Gerente', idDepartamento: 'DEP-9' }, PUESTOS, DEPTOS).errores.join()));
  assert.deepStrictEqual(plano(gs.planPuesto_({ id: 'PUE-0001', nombre: 'Auxiliar de Compras', idDepartamento: 'DEP-001', sinonimos: 'aux. compras', activo: false }, PUESTOS, DEPTOS).cambios),
    { ACTIVO: 'NO' });
});

test('pegar una lista: un puesto por renglón, sinónimos después de «|», sin repetir', function () {
  const p = plano(gs.planImportarPuestos_('Jefe de Compras | jefe, encargado\nauxiliar de compras\n\nJefe de compras\nContralor', PUESTOS));
  assert.deepStrictEqual(p.nuevos.map(function (x) { return x.NOMBRE + ':' + x.SINONIMOS; }), ['Jefe de Compras:jefe, encargado', 'Contralor:']);
  assert.deepStrictEqual(p.repetidos, ['auxiliar de compras', 'Jefe de compras']);
});

test('mi puesto: lo escribe la persona; se reconoce el del catálogo, si no es nuevo; sin texto vale el que tiene', function () {
  const conPuesto = { ID_PUESTO: 'PUE-0001' };
  const sinPuesto = { ID_PUESTO: '' };
  assert.ok(/Escribe tu puesto/.test(gs.planMiPuesto_('  ', sinPuesto, PUESTOS).errores.join()));
  assert.deepStrictEqual(plano(gs.planMiPuesto_('', conPuesto, PUESTOS)), { errores: [], nombre: 'Auxiliar de Compras', idPuesto: 'PUE-0001', nuevo: false, sinCambios: true });
  assert.ok(gs.planMiPuesto_('auxiliar de compras', conPuesto, PUESTOS).sinCambios);
  assert.deepStrictEqual(plano(gs.planMiPuesto_(' Aux. Compras ', sinPuesto, PUESTOS)), { errores: [], nombre: 'Auxiliar de Compras', idPuesto: 'PUE-0001', nuevo: false, sinCambios: false }, 'por sinónimo');
  assert.deepStrictEqual(plano(gs.planMiPuesto_('Especialista  de Datos', sinPuesto, PUESTOS)), { errores: [], nombre: 'Especialista de Datos', idPuesto: '', nuevo: true, sinCambios: false });
  assert.ok(gs.planMiPuesto_('Puesto viejo', sinPuesto, PUESTOS).nuevo, 'uno dado de baja no cuenta');
  assert.ok(/entre 3/.test(gs.planMiPuesto_('x', sinPuesto, PUESTOS).errores.join()));
});

test('todas las solicitudes: la más reciente primero, con su revisor', function () {
  const t = { tipos: [], departamentos: DEPTOS, areas: [], usuarios: [{ ID_USUARIO: 'USR-3', NOMBRE: 'Paola' }] };
  const r = plano(gs.todasLasSolicitudes_([
    { ID_SOLICITUD: 'S-1', NOMBRE_DOCUMENTO: 'A', ESTADO: 'BORRADOR', TIPO_SOLICITUD: 'NUEVO', FECHA_ACTUALIZACION: new Date(2026, 9, 1) },
    { ID_SOLICITUD: 'S-2', NOMBRE_DOCUMENTO: 'B', ESTADO: 'EN_REVISION', TIPO_SOLICITUD: 'ACTUALIZACION', REVISOR_ASIGNADO_ID: 'USR-3', ID_DEPARTAMENTO: 'DEP-001',
      FECHA_ACTUALIZACION: new Date(2026, 9, 5) }], t, function () { return 'f'; }));
  assert.deepStrictEqual(r.map(function (s) { return [s.id, s.revisor, s.departamento, s.tipoSolicitud]; }),
    [['S-2', 'Paola', 'COMPRAS', 'Actualizar un documento vigente'], ['S-1', '', '', 'Documento nuevo']]);
});
