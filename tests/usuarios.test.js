// Usuarios y perfiles (src/services/Usuarios.gs), reglas de revisión (Sesion.gs) y bitácora
// (Bitacora.gs). Reglas de la decisión 19: sin superusuario, Soporte CI solo consulta, nadie revisa lo
// suyo, nadie cambia sus propios perfiles, siempre queda un administrador, todo queda en la bitácora.
const test = require('node:test');
const assert = require('node:assert');
const { cargarGs } = require('./cargar-gs');

const gs = cargarGs(['src/config/Config.gs', 'src/config/Catalogos.gs', 'src/services/Sesion.gs', 'src/services/Usuarios.gs',
  'src/services/Bitacora.gs'], {}, ['NOMBRES_ACCION']);
const plano = function (v) { return JSON.parse(JSON.stringify(v)); };

function base() {
  return {
    usuarios: [
      { _fila: 2, ID_USUARIO: 'USR-0001', CORREO: 'gael@ciudadmaderas.com', NOMBRE: 'Gael Núñez', ACTIVO: 'SI' },
      { _fila: 3, ID_USUARIO: 'USR-0002', CORREO: 'ana@ciudadmaderas.com', NOMBRE: 'Ana López', ACTIVO: 'SI' },
      { _fila: 4, ID_USUARIO: 'USR-0003', CORREO: 'baja@ciudadmaderas.com', NOMBRE: 'Persona de baja', ACTIVO: 'NO' },
      { _fila: 5, ID_USUARIO: 'USR-0004', CORREO: 'sofia@ciudadmaderas.com', NOMBRE: 'Sofía Torres', ACTIVO: 'SI' }
    ],
    perfiles: [
      { _fila: 2, ID_USUARIO: 'USR-0001', PERFIL: 'ADMINISTRADOR', ACTIVO: 'SI' },
      { _fila: 3, ID_USUARIO: 'USR-0002', PERFIL: 'COLABORADOR', ACTIVO: 'SI' },
      { _fila: 4, ID_USUARIO: 'USR-0003', PERFIL: 'COLABORADOR', ACTIVO: 'SI' },
      { _fila: 5, ID_USUARIO: 'USR-0004', PERFIL: 'ADMINISTRADOR', ACTIVO: 'SI' }
    ],
    usuarioDeptos: [
      { _fila: 2, ID_USUARIO: 'USR-0002', ID_DEPARTAMENTO: 'DEP-001', PRINCIPAL: 'SI', ACTIVO: 'SI' },
      { _fila: 3, ID_USUARIO: 'USR-0002', ID_DEPARTAMENTO: 'DEP-003', PRINCIPAL: 'NO', ACTIVO: 'SI' }
    ],
    departamentos: [
      { ID_DEPARTAMENTO: 'DEP-001', NOMBRE: 'CONTROL INTERNO', ACTIVO: 'SI' },
      { ID_DEPARTAMENTO: 'DEP-002', NOMBRE: 'TI', ACTIVO: 'SI' },
      { ID_DEPARTAMENTO: 'DEP-003', NOMBRE: 'ARCHIVO VIEJO', ACTIVO: 'NO' }
    ]
  };
}
const GAEL = { registrado: true, idUsuario: 'USR-0001', correo: 'gael@ciudadmaderas.com', perfiles: ['ADMINISTRADOR'] };
const SOFIA = { registrado: true, idUsuario: 'USR-0004', correo: 'sofia@ciudadmaderas.com', perfiles: ['ADMINISTRADOR'] };
const ana = function (cambios) {
  return Object.assign({ idUsuario: 'USR-0002', correo: 'ana@ciudadmaderas.com', nombre: 'Ana López', activo: true,
    perfiles: ['COLABORADOR'], departamentos: ['DEP-001', 'DEP-003'], principal: 'DEP-001' }, cambios);
};
const plan = function (datos, sesion, ambiente) { return gs.planGuardarUsuario_(datos, base(), sesion || GAEL, ambiente || 'PRODUCCION'); };

// ─────────────────────────────── Lista ───────────────────────────────

test('listaUsuarios_: cada persona con sus perfiles y departamentos, el principal primero', function () {
  const lista = plano(gs.listaUsuarios_(base().usuarios, base().perfiles, base().usuarioDeptos, base().departamentos));
  assert.deepStrictEqual(lista.map(function (u) { return u.nombre; }), ['Ana López', 'Gael Núñez', 'Persona de baja', 'Sofía Torres']);
  assert.deepStrictEqual(lista[0].departamentos, [{ id: 'DEP-001', nombre: 'CONTROL INTERNO', principal: true },
    { id: 'DEP-003', nombre: 'ARCHIVO VIEJO', principal: false }]);
  assert.strictEqual(lista[2].activo, false);
});

// ─────────────────────────────── Altas ───────────────────────────────

test('alta válida: correo en minúsculas, perfiles y departamentos con el primero como principal', function () {
  const p = plan({ correo: ' Luis@CiudadMaderas.com ', nombre: '  Luis   Ramírez ', perfiles: ['REVISOR', 'COLABORADOR'],
    departamentos: ['DEP-002', 'DEP-001'] });
  assert.deepStrictEqual(plano(p.errores), []);
  assert.deepStrictEqual(plano(p.usuario), { CORREO: 'luis@ciudadmaderas.com', NOMBRE: 'Luis Ramírez', ID_PUESTO: '', ACTIVO: 'SI' });
  assert.deepStrictEqual(plano(p.perfilesAgregar), ['COLABORADOR', 'REVISOR']);
  assert.deepStrictEqual(plano(p.deptosAgregar), [{ ID_DEPARTAMENTO: 'DEP-002', PRINCIPAL: 'SI' }, { ID_DEPARTAMENTO: 'DEP-001', PRINCIPAL: 'NO' }]);
  assert.ok(/^Alta de luis@ciudadmaderas\.com: perfiles Colaborador, Revisor de Procesos; departamentos \+TI \+CONTROL INTERNO/.test(p.detalle));
});

test('alta: solo correos de Ciudad Maderas; los de prueba (.test) solo en el ambiente de pruebas', function () {
  const datos = { nombre: 'X', perfiles: ['COLABORADOR'] };
  assert.ok(/@ciudadmaderas\.com/.test(plan(Object.assign({ correo: 'x@gmail.com' }, datos)).errores.join()));
  assert.ok(plan(Object.assign({ correo: 'x@procesos.test' }, datos)).errores.length);
  assert.deepStrictEqual(plano(plan(Object.assign({ correo: 'x@procesos.test' }, datos), GAEL, 'PRUEBAS').errores), []);
  assert.ok(/correo válido/.test(plan(Object.assign({ correo: 'no es correo' }, datos)).errores.join()));
});

test('alta: no se repite un correo, ni siquiera de alguien dado de baja', function () {
  assert.ok(/Ya existe un usuario con ese correo\./.test(plan({ correo: 'ANA@ciudadmaderas.com', nombre: 'Ana', perfiles: ['COLABORADOR'] }).errores.join()));
  assert.ok(/dado de baja/.test(plan({ correo: 'baja@ciudadmaderas.com', nombre: 'X', perfiles: ['COLABORADOR'] }).errores.join()));
});

test('alta: hace falta nombre y al menos un perfil que exista (ya no hay AUTORIZADOR)', function () {
  const e = plan({ correo: 'x@ciudadmaderas.com', nombre: ' ', perfiles: [] }).errores.join(' ');
  assert.ok(/nombre/.test(e) && /al menos un perfil/.test(e));
  assert.ok(/Perfil desconocido: AUTORIZADOR/.test(plan({ correo: 'x@ciudadmaderas.com', nombre: 'X', perfiles: ['AUTORIZADOR'] }).errores.join()));
});

test('alta: no se asigna un departamento dado de baja', function () {
  const p = plan({ correo: 'x@ciudadmaderas.com', nombre: 'X', perfiles: ['COLABORADOR'], departamentos: ['DEP-003'] });
  assert.ok(/ARCHIVO VIEJO está dado de baja/.test(p.errores.join()));
});

// ─────────────────────────────── Cambios ───────────────────────────────

test('cambio de perfiles: agrega el nuevo y da de baja (no borra) el que se quita', function () {
  const p = plan(ana({ perfiles: ['REVISOR'] }));
  assert.deepStrictEqual(plano(p.perfilesAgregar), ['REVISOR']);
  assert.deepStrictEqual(plano(p.perfilesQuitar), [3]);
  assert.strictEqual(p.detalle, 'ana@ciudadmaderas.com: perfiles +Revisor de Procesos −Colaborador');
});

test('cambio de departamentos: quita, agrega y cambia el principal; uno dado de baja que ya tenía se puede conservar', function () {
  const p = plan(ana({ departamentos: ['DEP-003', 'DEP-002'], principal: 'DEP-003' }));
  assert.deepStrictEqual(plano(p.errores), []);
  assert.deepStrictEqual(plano(p.deptosAgregar), [{ ID_DEPARTAMENTO: 'DEP-002', PRINCIPAL: 'NO' }]);
  assert.deepStrictEqual(plano(p.deptosQuitar), [2]);
  assert.deepStrictEqual(plano(p.deptosPrincipal), [{ _fila: 3, PRINCIPAL: 'SI' }]);
  assert.ok(/departamentos \+TI −CONTROL INTERNO; principal: ARCHIVO VIEJO/.test(p.detalle));
});

test('dar de baja y reactivar; si no cambió nada, no se escribe', function () {
  const baja = plan(ana({ activo: false }));
  assert.deepStrictEqual(plano(baja.usuario), { ACTIVO: 'NO' });
  assert.ok(/dado de baja/.test(baja.detalle));
  assert.strictEqual(plan(ana()).sinCambios, true);
});

test('el correo no se cambia: es con el que la persona entra a Google', function () {
  assert.ok(/no se puede cambiar/.test(plan(ana({ correo: 'otra@ciudadmaderas.com' })).errores.join()));
});

// ─────────────────────────────── Reglas de la decisión 19 ───────────────────────────────

test('nadie cambia sus propios perfiles ni se da de baja; su nombre sí lo puede corregir', function () {
  const yo = { idUsuario: 'USR-0001', correo: 'gael@ciudadmaderas.com', nombre: 'Gael Núñez', activo: true, perfiles: ['ADMINISTRADOR'], departamentos: [] };
  assert.ok(/tus propios perfiles/.test(plan(Object.assign({}, yo, { perfiles: ['ADMINISTRADOR', 'REVISOR'] })).errores.join()));
  assert.ok(/darte de baja/.test(plan(Object.assign({}, yo, { activo: false })).errores.join()));
  assert.deepStrictEqual(plano(plan(Object.assign({}, yo, { nombre: 'Jesús Gael Núñez' })).errores), []);
});

test('otro administrador sí puede darle perfiles a alguien más', function () {
  const p = plan({ idUsuario: 'USR-0001', correo: 'gael@ciudadmaderas.com', nombre: 'Gael Núñez', activo: true,
    perfiles: ['REVISOR', 'ADMINISTRADOR'], departamentos: [] }, SOFIA);
  assert.deepStrictEqual(plano(p.errores), []);
  assert.deepStrictEqual(plano(p.perfilesAgregar), ['REVISOR']);
});

test('siempre queda al menos un administrador activo', function () {
  const b = base();
  b.perfiles = b.perfiles.filter(function (p) { return p.ID_USUARIO !== 'USR-0004'; });
  const p = gs.planGuardarUsuario_({ idUsuario: 'USR-0001', correo: 'gael@ciudadmaderas.com', nombre: 'Gael Núñez', activo: false,
    perfiles: ['ADMINISTRADOR'], departamentos: [] }, b, SOFIA, 'PRODUCCION');
  assert.ok(/al menos un administrador activo/.test(p.errores.join()));
});

test('nadie revisa lo suyo: un revisor no puede revisar una solicitud que él elaboró', function () {
  const carlos = { registrado: true, idUsuario: 'USR-0005', perfiles: ['COLABORADOR', 'REVISOR'] };
  assert.strictEqual(gs.puedeRevisarSolicitud_(carlos, { ELABORO_ID: 'USR-0005' }), false);
  assert.strictEqual(gs.puedeRevisarSolicitud_(carlos, { ELABORO_ID: 'USR-0002' }), true);
  assert.strictEqual(gs.puedeRevisarSolicitud_(GAEL, { ELABORO_ID: 'USR-0002' }), false, 'el administrador no revisa');
  const soporte = { registrado: true, idUsuario: 'USR-0009', perfiles: ['SOPORTE_CI'] };
  assert.strictEqual(gs.puedeRevisarSolicitud_(soporte, { ELABORO_ID: 'USR-0002' }), false, 'Soporte CI no revisa');
});

// ─────────────────────────────── Bitácora ───────────────────────────────

test('la bitácora anota siempre a la persona real, aunque esté usando «Ver como»', function () {
  const comoAna = { correo: 'colaborador.uno@procesos.test', verComo: { correoReal: 'gael@ciudadmaderas.com' } };
  const f = plano(gs.filaBitacora_(comoAna, 'CAMBIO_USUARIO', 'algo', '', '', '', 'hoy'));
  assert.strictEqual(f.USUARIO, 'gael@ciudadmaderas.com');
  assert.strictEqual(f.DETALLE, '[viendo como colaborador.uno@procesos.test] algo');
  assert.strictEqual(plano(gs.filaBitacora_(GAEL, 'ALTA_USUARIO', 'x', '', '', '', 'hoy')).USUARIO, 'gael@ciudadmaderas.com');
});

test('entradasBitacora_: lo más reciente primero, con tope, fecha en texto y nombre de la acción', function () {
  const filas = [
    { _fila: 2, FECHA: new Date(2026, 9, 14, 9, 0), USUARIO: 'a', ACCION: 'ALTA_USUARIO', DETALLE: 'uno' },
    { _fila: 3, FECHA: new Date(2026, 9, 20, 9, 0), USUARIO: 'b', ACCION: 'VER_COMO', DETALLE: 'dos' },
    { _fila: 4, FECHA: new Date(2026, 9, 18, 9, 0), USUARIO: 'c', ACCION: 'OTRA_COSA', ID_SOLICITUD: 'SOL-2026-0001',
      ESTADO_ANTERIOR: 'BORRADOR', ESTADO_NUEVO: 'CONFIRMADO' }
  ];
  const e = plano(gs.entradasBitacora_(filas, function (f) { return f.getDate() + '/' + (f.getMonth() + 1); }, 2));
  assert.deepStrictEqual(e.map(function (x) { return x.usuario; }), ['b', 'c']);
  assert.deepStrictEqual([e[0].fecha, e[0].nombreAccion], ['20/10', 'Ver como (pruebas)']);
  assert.deepStrictEqual([e[1].nombreAccion, e[1].solicitud, e[1].estados], ['OTRA_COSA', 'SOL-2026-0001', 'BORRADOR → CONFIRMADO']);
});
