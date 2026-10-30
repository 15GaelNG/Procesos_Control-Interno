// Pruebas del esquema de la base (src/config/Esquema.gs), de la parte de la instalación que no usa
// Google (src/SetupInicial.gs) y de la sesión (src/services/Sesion.gs).
const test = require('node:test');
const assert = require('node:assert');
const { cargarGs } = require('./cargar-gs');

const gs = cargarGs(['src/config/Config.gs', 'src/config/Catalogos.gs', 'src/config/Esquema.gs', 'src/SetupInicial.gs',
  'src/services/Sesion.gs'],
  {}, ['ESQUEMA_BD', 'GRUPOS_BD', 'HOJAS_RETIRADAS', 'CORRECCIONES_BD', 'PERFILES', 'ESTADOS', 'TRANSICIONES',
    'NOMBRES_ESTADO', 'NOMBRES_PERFIL', 'MODULOS_APP', 'USUARIOS_DE_PRUEBA']);
const plano = function (v) { return JSON.parse(JSON.stringify(v)); };
const hoja = function (nombre) { return gs.ESQUEMA_BD.filter(function (d) { return d.hoja === nombre; })[0]; };

// ─────────────────────────────── Esquema ───────────────────────────────

test('cada hoja tiene nombre único, grupo válido y columnas sin repetir', function () {
  const nombres = gs.ESQUEMA_BD.map(function (d) { return d.hoja; });
  assert.strictEqual(new Set(nombres).size, nombres.length);
  gs.ESQUEMA_BD.forEach(function (d) {
    assert.ok(gs.GRUPOS_BD[d.grupo], d.hoja + ': grupo ' + d.grupo);
    assert.strictEqual(new Set(d.columnas).size, d.columnas.length, d.hoja + ': columnas repetidas');
    (d.columnasRetiradas || []).forEach(function (c) {
      assert.ok(d.columnas.indexOf(c) === -1, d.hoja + ': ' + c + ' está retirada y en el esquema a la vez');
    });
  });
});

test('las filas semilla tienen tantas celdas como columnas y su ID no se repite', function () {
  gs.ESQUEMA_BD.filter(function (d) { return d.semilla; }).forEach(function (d) {
    d.semilla.forEach(function (f) { assert.strictEqual(f.length, d.columnas.length, d.hoja + ' ' + f[0]); });
    const ids = d.semilla.map(function (f) { return f[0]; });
    assert.strictEqual(new Set(ids).size, ids.length, d.hoja + ': IDs de semilla repetidos');
  });
});

test('las hojas retiradas ya no están en el esquema y las correcciones apuntan a semillas que existen', function () {
  gs.HOJAS_RETIRADAS.forEach(function (r) { assert.ok(!hoja(r.hoja), r.hoja + ' sigue en el esquema'); });
  gs.CORRECCIONES_BD.forEach(function (c) {
    const def = hoja(c.hoja);
    assert.ok(def && def.columnas.indexOf(c.columna) !== -1, c.hoja + '.' + c.columna);
    const fila = def.semilla.filter(function (f) { return f[0] === c.id; })[0];
    assert.strictEqual(fila[def.columnas.indexOf(c.columna)], c.a, 'la semilla ya debe traer el valor corregido');
  });
});

test('prefijos del código documental según Procesos (decisión 11) y solo Procedimiento en el sistema', function () {
  const def = hoja('TiposDocumento');
  const col = function (f, c) { return f[def.columnas.indexOf(c)]; };
  const prefijos = {};
  def.semilla.forEach(function (f) { prefijos[col(f, 'NOMBRE')] = col(f, 'PREFIJO_CODIGO'); });
  assert.deepStrictEqual(prefijos, { 'Manual': 'M', 'Procedimiento': 'P', 'Protocolo': 'PRO', 'Política': 'PL',
    'Formato': 'F', 'Diagrama de proceso': 'DP' });
  const enSistema = def.semilla.filter(function (f) { return col(f, 'EN_SISTEMA') === 'SI'; }).map(function (f) { return col(f, 'NOMBRE'); });
  assert.deepStrictEqual(plano(enSistema), ['Procedimiento']);
});

test('el código se puede armar: departamentos y áreas tienen su clave', function () {
  assert.ok(hoja('Departamentos').columnas.indexOf('CLAVE_CODIGO') !== -1);
  assert.deepStrictEqual(plano(hoja('Areas').columnas), ['ID_AREA', 'ID_DEPARTAMENTO', 'NOMBRE', 'CLAVE_CODIGO', 'ACTIVO', 'OBSERVACIONES']);
  assert.deepStrictEqual(plano(hoja('Subareas').columnas), ['ID_SUBAREA', 'ID_AREA', 'NOMBRE', 'CLAVE_ANTERIOR', 'ACTIVO', 'OBSERVACIONES']);
  ['Solicitudes', 'Documentos'].forEach(function (h) {
    ['ID_AREA', 'ID_SUBAREA'].forEach(function (c) { assert.ok(hoja(h).columnas.indexOf(c) !== -1, h + '.' + c); });
  });
});

// ─────────────────────────────── Estados ───────────────────────────────

test('sin autorizador interno: no hay perfil AUTORIZADOR y la solicitud pasa por EN_AUTORIZACION_CH', function () {
  assert.ok(!gs.PERFILES.AUTORIZADOR);
  assert.ok(gs.TRANSICIONES.EN_REVISION.indexOf('EN_AUTORIZACION_CH') !== -1);
  assert.deepStrictEqual(plano(gs.TRANSICIONES.EN_AUTORIZACION_CH), ['AUTORIZADO', 'DEVUELTO']);
});

test('cada estado tiene transiciones y nombre en pantalla, y cada transición va a un estado que existe', function () {
  Object.keys(gs.ESTADOS).forEach(function (e) {
    assert.ok(gs.TRANSICIONES[e], 'faltan transiciones de ' + e);
    assert.ok(gs.NOMBRES_ESTADO[e], 'falta nombre de ' + e);
    gs.TRANSICIONES[e].forEach(function (destino) { assert.ok(gs.ESTADOS[destino], e + ' → ' + destino); });
  });
  Object.keys(gs.PERFILES).forEach(function (p) { assert.ok(gs.NOMBRES_PERFIL[p], 'falta nombre de ' + p); });
});

// ─────────────────────────────── Instalación ───────────────────────────────

const DEF = {
  columnas: ['ID', 'NOMBRE', 'PREFIJO', 'NUEVA'],
  semilla: [['T1', 'Uno', 'A', 'SI'], ['T2', 'Dos', 'B', 'NO'], ['T3', 'Tres', 'C', 'NO']]
};

test('planSemilla_: agrega las filas que faltan en el orden real de la hoja', function () {
  const p = gs.planSemilla_(DEF, ['NOMBRE', 'ID', 'PREFIJO', 'NUEVA'], []);
  assert.deepStrictEqual(plano(p.nuevas[0]), ['Uno', 'T1', 'A', 'SI']);
  assert.strictEqual(p.nuevas.length, 3);
});

test('planSemilla_: llena celdas vacías de filas existentes sin tocar lo que ya tiene valor', function () {
  const filas = [['T1', 'Uno', '', ''], ['T2', 'Dos', 'X', '']];   // T2 con prefijo cambiado a mano
  const p = gs.planSemilla_(DEF, DEF.columnas, filas);
  assert.deepStrictEqual(plano(p.celdas), [
    { fila: 0, columna: 2, valor: 'A' }, { fila: 0, columna: 3, valor: 'SI' }, { fila: 1, columna: 3, valor: 'NO' }
  ]);
  assert.deepStrictEqual(plano(p.nuevas), [['T3', 'Tres', 'C', 'NO']]);
});

test('soloSemillaOriginal_: una hoja retirada se borra solo si nadie le capturó nada', function () {
  const cadenas = gs.HOJAS_RETIRADAS.filter(function (r) { return r.hoja === 'CadenasAutorizacion'; })[0];
  const original = [['CAD-01', '', '', 1, 'Responsable del área', '', 'SI'], ['CAD-02', '', '', '2', 'Dirección', '', 'SI']];
  assert.ok(gs.soloSemillaOriginal_([], cadenas.semillaOriginal));
  assert.ok(gs.soloSemillaOriginal_(original, cadenas.semillaOriginal));
  const conUsuario = [['CAD-01', '', '', '1', 'Responsable del área', 'USR-0003', 'SI']];
  assert.ok(!gs.soloSemillaOriginal_(conUsuario, cadenas.semillaOriginal));
  assert.ok(!gs.soloSemillaOriginal_([['X-1', 'algo']], []));
});

// ─────────────────────────────── Sesión ───────────────────────────────

const USUARIOS = [
  { ID_USUARIO: 'USR-0001', CORREO: 'Especialista2Datos.CI@ciudadmaderas.com ', NOMBRE: 'Gael Núñez', ACTIVO: 'SI' },
  { ID_USUARIO: 'USR-0002', CORREO: 'baja@ciudadmaderas.com', NOMBRE: 'Persona de baja', ACTIVO: 'NO' }
];
const PERFILES_FILAS = [
  { ID_USUARIO: 'USR-0001', PERFIL: 'ADMINISTRADOR', ACTIVO: 'SI' },
  { ID_USUARIO: 'USR-0001', PERFIL: 'REVISOR', ACTIVO: 'SI' },
  { ID_USUARIO: 'USR-0001', PERFIL: 'REVISOR', ACTIVO: 'SI' },
  { ID_USUARIO: 'USR-0001', PERFIL: 'COLABORADOR', ACTIVO: 'NO' },
  { ID_USUARIO: 'USR-0001', PERFIL: 'AUTORIZADOR', ACTIVO: 'SI' },
  { ID_USUARIO: 'USR-0002', PERFIL: 'COLABORADOR', ACTIVO: 'SI' }
];

test('buscarSesion_: reconoce el correo sin importar mayúsculas y da sus perfiles activos y vigentes, sin repetir', function () {
  const s = gs.buscarSesion_('especialista2datos.ci@ciudadmaderas.com', USUARIOS, PERFILES_FILAS);
  assert.deepStrictEqual(plano(s), { registrado: true, correo: 'especialista2datos.ci@ciudadmaderas.com',
    idUsuario: 'USR-0001', nombre: 'Gael Núñez', perfiles: ['REVISOR', 'ADMINISTRADOR'] });
});

test('buscarSesion_: un usuario dado de baja o que no existe no entra', function () {
  assert.strictEqual(gs.buscarSesion_('baja@ciudadmaderas.com', USUARIOS, PERFILES_FILAS).registrado, false);
  assert.strictEqual(gs.buscarSesion_('nadie@ciudadmaderas.com', USUARIOS, PERFILES_FILAS).registrado, false);
});

// ─────────────────────────────── Ver como (solo PRUEBAS) ───────────────────────────────

const USUARIOS_VC = USUARIOS.concat([
  { ID_USUARIO: 'USR-0003', CORREO: 'colaborador.uno@procesos.test', NOMBRE: 'Ana López (prueba)', ACTIVO: 'SI' }
]);
const PERFILES_VC = PERFILES_FILAS.concat([{ ID_USUARIO: 'USR-0003', PERFIL: 'COLABORADOR', ACTIVO: 'SI' }]);
const ADMIN = gs.buscarSesion_('especialista2datos.ci@ciudadmaderas.com', USUARIOS_VC, PERFILES_VC);
const COLAB = gs.buscarSesion_('colaborador.uno@procesos.test', USUARIOS_VC, PERFILES_VC);

test('ver como: un administrador en PRUEBAS entra como otro usuario y queda registrado quién está detrás', function () {
  const s = gs.elegirSesion_('PRUEBAS', ADMIN, 'USR-0003', USUARIOS_VC, PERFILES_VC);
  assert.strictEqual(s.correo, 'colaborador.uno@procesos.test');
  assert.deepStrictEqual(plano(s.perfiles), ['COLABORADOR']);
  assert.strictEqual(s.verComo.correoReal, 'especialista2datos.ci@ciudadmaderas.com');
});

test('ver como: no existe en PRODUCCIÓN ni para quien no es administrador', function () {
  assert.throws(function () { gs.elegirSesion_('PRODUCCION', ADMIN, 'USR-0003', USUARIOS_VC, PERFILES_VC); }, /administrador, en el ambiente de pruebas/);
  assert.throws(function () { gs.elegirSesion_('PRUEBAS', COLAB, 'USR-0001', USUARIOS_VC, PERFILES_VC); }, /administrador/);
  assert.ok(!gs.puedeVerComo_('PRODUCCION', ADMIN));
});

test('ver como: no se puede entrar como un usuario dado de baja o inexistente', function () {
  assert.throws(function () { gs.elegirSesion_('PRUEBAS', ADMIN, 'USR-0002', USUARIOS_VC, PERFILES_VC); }, /dado de baja/);
  assert.throws(function () { gs.elegirSesion_('PRUEBAS', ADMIN, 'USR-9999', USUARIOS_VC, PERFILES_VC); }, /no existe/);
});

test('usuariosParaVerComo_: solo activos, ordenados por nombre y con sus perfiles', function () {
  const lista = plano(gs.usuariosParaVerComo_(USUARIOS_VC, PERFILES_VC));
  assert.deepStrictEqual(lista.map(function (u) { return u.idUsuario; }), ['USR-0003', 'USR-0001']);
  assert.deepStrictEqual(lista[1].perfiles, ['REVISOR', 'ADMINISTRADOR']);
});

// ─────────────────────────────── Pantallas por perfil ───────────────────────────────

const ids = function (perfiles) { return plano(gs.modulosDe_(perfiles)).map(function (m) { return m.id; }); };

test('cada perfil ve solo sus pantallas (requerimiento §1 y decisión 10)', function () {
  assert.deepStrictEqual(ids(['COLABORADOR']), ['inicio', 'mis-solicitudes', 'nueva']);
  assert.deepStrictEqual(ids(['REVISOR']), ['inicio', 'revision', 'envios-ch', 'inventario']);
  assert.deepStrictEqual(ids(['ADMINISTRADOR']), ['inicio', 'tablero', 'revision', 'inventario', 'usuarios', 'catalogos', 'puestos', 'plantillas', 'bitacora']);
  assert.deepStrictEqual(ids(['SOPORTE_CI']), ['inicio', 'tablero', 'inventario', 'solicitudes', 'usuarios', 'catalogos', 'puestos', 'plantillas', 'bitacora']);
  assert.deepStrictEqual(ids([]), ['inicio']);
});

test('Soporte CI consulta todo pero no tiene ninguna pantalla para capturar, revisar ni registrar en CH', function () {
  ['mis-solicitudes', 'nueva', 'revision', 'envios-ch'].forEach(function (id) {
    assert.ok(ids(['SOPORTE_CI']).indexOf(id) === -1, id);
  });
});

test('el administrador ve la bandeja solo para reasignar (no revisa: eso lo prueba usuarios.test.js); dos perfiles suman', function () {
  const bandeja = plano(gs.MODULOS_APP).filter(function (m) { return m.id === 'revision'; })[0];
  assert.ok(/solo reasigna/.test(bandeja.descripcion));
  assert.deepStrictEqual(ids(['REVISOR', 'COLABORADOR']), ['inicio', 'mis-solicitudes', 'nueva', 'revision', 'envios-ch', 'inventario']);
});

test('requierePerfil_ detiene a quien no tiene el perfil', function () {
  assert.strictEqual(gs.requierePerfil_(COLAB, ['COLABORADOR']), COLAB);
  assert.throws(function () { gs.requierePerfil_(COLAB, ['REVISOR']); }, /perfil no permite/);
  assert.throws(function () { gs.requierePerfil_({ registrado: false, perfiles: [] }, ['COLABORADOR']); }, /dada de alta/);
});

test('las pantallas tienen ID único, perfiles que existen, y las que están en construcción dicen qué harán', function () {
  const vistos = {};
  gs.MODULOS_APP.forEach(function (m) {
    assert.ok(!vistos[m.id], 'repetido ' + m.id);
    vistos[m.id] = true;
    m.perfiles.forEach(function (p) { assert.ok(gs.PERFILES[p], m.id + ': perfil ' + p); });
    if (m.fase) assert.ok(m.acciones && m.acciones.length, m.id + ' sin acciones');
  });
});

test('los usuarios de prueba usan el dominio reservado .test y perfiles que existen', function () {
  gs.USUARIOS_DE_PRUEBA.forEach(function (u) {
    assert.ok(/@[a-z.]+\.test$/.test(u.correo), u.correo);
    u.perfiles.forEach(function (p) { assert.ok(gs.PERFILES[p], u.correo + ': ' + p); });
  });
  const todos = [].concat.apply([], gs.USUARIOS_DE_PRUEBA.map(function (u) { return u.perfiles; }));
  Object.keys(gs.PERFILES).forEach(function (p) { assert.ok(todos.indexOf(p) !== -1, 'ningún usuario de prueba es ' + p); });
});
