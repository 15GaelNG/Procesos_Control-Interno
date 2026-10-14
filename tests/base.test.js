// Pruebas del esquema de la base (src/config/Esquema.gs), de la parte de la instalación que no usa
// Google (src/SetupInicial.gs) y de la sesión (src/services/Sesion.gs).
const test = require('node:test');
const assert = require('node:assert');
const { cargarGs } = require('./cargar-gs');

const gs = cargarGs(['src/config/Catalogos.gs', 'src/config/Esquema.gs', 'src/SetupInicial.gs', 'src/services/Sesion.gs'],
  {}, ['ESQUEMA_BD', 'GRUPOS_BD', 'HOJAS_RETIRADAS', 'CORRECCIONES_BD', 'PERFILES', 'ESTADOS', 'TRANSICIONES',
    'NOMBRES_ESTADO', 'NOMBRES_PERFIL']);
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
  assert.deepStrictEqual(plano(hoja('Areas').columnas), ['ID_AREA', 'ID_DEPARTAMENTO', 'NOMBRE', 'CLAVE_CODIGO', 'ACTIVO']);
  ['Solicitudes', 'Documentos'].forEach(function (h) { assert.ok(hoja(h).columnas.indexOf('ID_AREA') !== -1, h); });
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

test('buscarSesion_: reconoce el correo sin importar mayúsculas y da sus perfiles activos y vigentes', function () {
  const s = gs.buscarSesion_('especialista2datos.ci@ciudadmaderas.com', USUARIOS, PERFILES_FILAS);
  assert.deepStrictEqual(plano(s), { registrado: true, correo: 'especialista2datos.ci@ciudadmaderas.com',
    idUsuario: 'USR-0001', nombre: 'Gael Núñez', perfiles: ['ADMINISTRADOR', 'REVISOR'] });
});

test('buscarSesion_: un usuario dado de baja o que no existe no entra', function () {
  assert.strictEqual(gs.buscarSesion_('baja@ciudadmaderas.com', USUARIOS, PERFILES_FILAS).registrado, false);
  assert.strictEqual(gs.buscarSesion_('nadie@ciudadmaderas.com', USUARIOS, PERFILES_FILAS).registrado, false);
});
