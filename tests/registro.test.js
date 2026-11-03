// Registro propio (src/services/Registro.gs, decisión 45): la primera vez que alguien entra captura su
// nombre, su puesto y su departamento; sin usuario ni contraseña.
const test = require('node:test');
const assert = require('node:assert');
const { cargarGs } = require('./cargar-gs');

const gs = cargarGs(['src/config/Config.gs', 'src/config/Catalogos.gs', 'src/utils/Texto.gs', 'src/services/Sesion.gs',
  'src/services/Usuarios.gs', 'src/services/AnalisisSolicitud.gs', 'src/services/Puestos.gs', 'src/services/Registro.gs']);
const plano = function (v) { return JSON.parse(JSON.stringify(v)); };

const ACTUALES = {
  usuarios: [
    { ID_USUARIO: 'USR-0001', CORREO: 'ana@ciudadmaderas.com', NOMBRE: 'Ana López', ID_PUESTO: 'PUE-0001', ACTIVO: 'SI' },
    { ID_USUARIO: 'USR-0002', CORREO: 'luis@ciudadmaderas.com', NOMBRE: 'Luis Pérez', ID_PUESTO: '', ACTIVO: 'SI' },
    { ID_USUARIO: 'USR-0003', CORREO: 'baja@ciudadmaderas.com', NOMBRE: 'Dado de baja', ID_PUESTO: '', ACTIVO: 'NO' },
    { ID_USUARIO: 'USR-0004', CORREO: 'sofia@ciudadmaderas.com', NOMBRE: 'Sofía', ID_PUESTO: 'PUE-0001', ACTIVO: 'SI' }
  ],
  perfiles: [
    { ID_USUARIO: 'USR-0001', PERFIL: 'COLABORADOR', ACTIVO: 'SI' },
    { ID_USUARIO: 'USR-0002', PERFIL: 'COLABORADOR', ACTIVO: 'SI' },
    { ID_USUARIO: 'USR-0004', PERFIL: 'ADMINISTRADOR', ACTIVO: 'SI' }
  ],
  usuarioDeptos: [{ ID_USUARIO: 'USR-0001', ID_DEPARTAMENTO: 'DEP-001', PRINCIPAL: 'SI', ACTIVO: 'SI' }],
  puestos: [{ ID_PUESTO: 'PUE-0001', NOMBRE: 'Auxiliar de Compras', SINONIMOS: '', ACTIVO: 'SI' }],
  departamentos: [{ ID_DEPARTAMENTO: 'DEP-001', NOMBRE: 'COMPRAS', ACTIVO: 'SI' }, { ID_DEPARTAMENTO: 'DEP-002', NOMBRE: 'VIEJO', ACTIVO: 'NO' }]
};

test('pendiente: alta solo con correo de la empresa y el registro abierto; nada para quien está completo o de baja', function () {
  const p = function (correo, abierto) { return plano(gs.registroPendiente_(correo, ACTUALES, 'PRODUCCION', abierto !== false)); };
  assert.deepStrictEqual(p('nuevo@ciudadmaderas.com'), { modo: 'ALTA', idUsuario: '', nombre: '', puesto: '', faltaPuesto: true, faltaDepartamento: true });
  assert.strictEqual(p('nuevo@ciudadmaderas.com', false), null, 'registro cerrado: lo da de alta el administrador');
  assert.strictEqual(p('alguien@gmail.com'), null, 'de otro dominio, no');
  assert.strictEqual(p('baja@ciudadmaderas.com'), null, 'de baja: lo reactiva el administrador');
  assert.strictEqual(p('ANA@ciudadmaderas.com '), null, 'completo');
  assert.strictEqual(p(''), null);
});

test('pendiente: completar el puesto, y el departamento solo si es colaborador', function () {
  const luis = plano(gs.registroPendiente_('luis@ciudadmaderas.com', ACTUALES, 'PRODUCCION', true));
  assert.deepStrictEqual(luis, { modo: 'COMPLETAR', idUsuario: 'USR-0002', nombre: 'Luis Pérez', puesto: '', faltaPuesto: true, faltaDepartamento: true });
  const sinDepto = Object.assign({}, ACTUALES, { usuarioDeptos: [] });
  const ana = plano(gs.registroPendiente_('ana@ciudadmaderas.com', sinDepto, 'PRODUCCION', true));
  assert.deepStrictEqual([ana.faltaPuesto, ana.faltaDepartamento, ana.puesto], [false, true, 'Auxiliar de Compras']);
  assert.strictEqual(gs.registroPendiente_('sofia@ciudadmaderas.com', sinDepto, 'PRODUCCION', true), null, 'administradora: sin departamento está bien');
});

test('plan: nombre en el alta, puesto del catálogo o nuevo, y un departamento activo', function () {
  const alta = gs.registroPendiente_('nuevo@ciudadmaderas.com', ACTUALES, 'PRODUCCION', true);
  const ok = plano(gs.planRegistro_({ nombre: ' Mario  Ruiz ', puesto: 'auxiliar de compras', idDepartamento: 'DEP-001' }, alta, ACTUALES));
  assert.deepStrictEqual([ok.errores, ok.nombre, ok.idDepartamento, ok.puesto.idPuesto, ok.puesto.nuevo], [[], 'Mario Ruiz', 'DEP-001', 'PUE-0001', false]);
  const nuevo = plano(gs.planRegistro_({ nombre: 'Mario Ruiz', puesto: 'Jefe de Tesorería', idDepartamento: 'DEP-001' }, alta, ACTUALES));
  assert.deepStrictEqual([nuevo.errores, nuevo.puesto.nuevo, nuevo.puesto.nombre], [[], true, 'Jefe de Tesorería']);
  const mal = gs.planRegistro_({ nombre: 'M', puesto: '', idDepartamento: 'DEP-002' }, alta, ACTUALES).errores.join(' ');
  assert.ok(/nombre completo/.test(mal) && /puesto/.test(mal) && /departamento/.test(mal), mal);
  const completar = gs.registroPendiente_('luis@ciudadmaderas.com', ACTUALES, 'PRODUCCION', true);
  assert.deepStrictEqual(plano(gs.planRegistro_({ puesto: 'Auxiliar de Compras', idDepartamento: 'DEP-001' }, completar, ACTUALES)).errores, [],
    'al completar no se pide el nombre');
});

test('pantalla: los departamentos y puestos activos, por nombre', function () {
  gs.nombreDirectorio_ = function () { return 'Mario Ruiz'; };
  const alta = gs.registroPendiente_('nuevo@ciudadmaderas.com', ACTUALES, 'PRODUCCION', true);
  const r = plano(gs.pantallaRegistro_(alta, 'nuevo@ciudadmaderas.com', ACTUALES.departamentos, ACTUALES.puestos));
  assert.deepStrictEqual([r.nombre, r.departamentos, r.puestos], ['Mario Ruiz', [{ id: 'DEP-001', nombre: 'COMPRAS' }], ['Auxiliar de Compras']]);
});
