// Catálogo de departamentos, áreas y subáreas: conversión del Excel de Procesos
// (tools/catalogo/catalogo.js), importación a la base (src/services/Catalogos.gs) y árbol de la pantalla.
const test = require('node:test');
const assert = require('node:assert');
const path = require('path');
const { leerXlsx } = require('../tools/lib/xlsx');
const { catalogoDesdeRenglones, pendientesDesdeRenglones } = require('../tools/catalogo/catalogo');
const { cargarGs } = require('./cargar-gs');

const plano = function (v) { return JSON.parse(JSON.stringify(v)); };
const ARCHIVO = path.join(__dirname, '..', 'docs', 'insumos', 'catalogo-departamentos-areas.xlsx');
const hojas = leerXlsx(ARCHIVO);
const catalogo = catalogoDesdeRenglones(hojas['Catálogo para códigos']);
const depto = function (nombre) { return catalogo.departamentos.filter(function (d) { return d.nombre === nombre; })[0]; };
const gs = cargarGs(['src/utils/Texto.gs', 'src/services/Catalogos.gs', 'src/config/CatalogoInicial.gs'], {}, ['CATALOGO_INICIAL']);

// ─────────────────────────────── El archivo de Procesos ───────────────────────────────

test('el archivo de Procesos trae 37 departamentos, 204 áreas y 28 subáreas', function () {
  const areas = catalogo.departamentos.reduce(function (n, d) { return n + d.areas.length; }, 0);
  const subareas = catalogo.departamentos.reduce(function (n, d) {
    return n + d.areas.reduce(function (m, a) { return m + a.subareas.length; }, 0);
  }, 0);
  assert.deepStrictEqual([catalogo.departamentos.length, areas, subareas], [37, 204, 28]);
});

test('src/config/CatalogoInicial.gs está al día con el Excel (se genera con npm run catalogo)', function () {
  assert.deepStrictEqual(plano(gs.CATALOGO_INICIAL), plano(catalogo.departamentos));
});

test('dentro de un departamento no se repite nombre + clave de un área (así empata la importación)', function () {
  catalogo.departamentos.forEach(function (d) {
    const llaves = d.areas.map(function (a) { return a.nombre.toUpperCase() + '|' + a.clave; });
    assert.strictEqual(new Set(llaves).size, llaves.length, d.nombre);
  });
});

test('Capital Humano tiene dos SUBDIRECCION (06 de baja y 09 activa) y la importación crea las dos', function () {
  const subdirecciones = depto('CAPITAL HUMANO').areas.filter(function (a) { return a.nombre === 'SUBDIRECCION'; });
  assert.deepStrictEqual(subdirecciones.map(function (a) { return a.clave + ':' + a.activo; }), ['06:NO', '09:SI']);
  const p = gs.planImportacionCatalogo_([depto('CAPITAL HUMANO')], vacio, contador());
  assert.strictEqual(p.areas.filter(function (a) { return a.NOMBRE === 'SUBDIRECCION'; }).length, 2);
  const otraVez = gs.planImportacionCatalogo_([depto('CAPITAL HUMANO')],
    { departamentos: p.departamentos, areas: p.areas, subareas: p.subareas }, contador());
  assert.strictEqual(otraVez.areas.length, 0);
});

test('Procesos es subárea de Análisis de Datos y Procesos: hereda CI04 y guarda su clave anterior CI02', function () {
  const adyp = depto('CONTROL INTERNO').areas.filter(function (a) { return a.clave === '04'; })[0];
  assert.strictEqual(adyp.nombre, 'ANÁLISIS DE DATOS Y PROCESOS');
  const procesos = adyp.subareas.filter(function (s) { return s.nombre === 'PROCESOS'; })[0];
  assert.strictEqual(procesos.claveAnterior, 'CI02');
});

test('las áreas «(OBSOLETO)» quedan dadas de baja y sin el prefijo en el nombre', function () {
  const comunicacion = depto('CAPITAL HUMANO').areas.filter(function (a) { return a.clave === '03'; })[0];
  assert.deepStrictEqual([comunicacion.nombre, comunicacion.activo], ['COMUNICACION', 'NO']);
  assert.ok(/YA NO PERTENECE/.test(comunicacion.observaciones));
  const bajas = catalogo.departamentos.reduce(function (n, d) { return n + d.areas.filter(function (a) { return a.activo === 'NO'; }).length; }, 0);
  assert.strictEqual(bajas, 5);
});

test('se avisan las claves compartidas que el archivo deja pendientes y se listan sus pendientes', function () {
  ['CI01', 'FCM00', 'FN03', 'nomenclatura CO'].forEach(function (t) {
    assert.ok(catalogo.avisos.some(function (a) { return a.indexOf(t) !== -1; }), t);
  });
  const pendientes = pendientesDesdeRenglones(hojas['Cambios de nombres']);
  assert.strictEqual(pendientes.length, 13);
  assert.ok(pendientes.every(function (p) { return p.indexOf('PENDIENTE:') === 0; }));
});

// ─────────────────────────────── Reglas de la conversión ───────────────────────────────

const ENCABEZADO = ['Departamento', 'Nomenclatura', 'Área', 'Clave de área', 'Subárea', 'Cuerpo del código', 'Nivel',
  'Origen de clave', 'Clave anterior subárea', 'Observación'];

test('se detiene si el cuerpo del código no es nomenclatura + clave a dos dígitos', function () {
  assert.throws(function () {
    catalogoDesdeRenglones([['Título'], ENCABEZADO, ['TI', 'TI', 'SOPORTE', '3', '', 'TI3', 'Área']]);
  }, /no es TI \+ 03/);
});

test('se detiene si una subárea apunta a un área que no existe', function () {
  assert.throws(function () {
    catalogoDesdeRenglones([ENCABEZADO, ['TI', 'TI', 'SOPORTE', '3', 'MESA', 'TI03', 'Subárea']]);
  }, /no está antes en el archivo/);
});

test('las notas sin valor se quitan y las útiles se conservan', function () {
  const r = catalogoDesdeRenglones([ENCABEZADO,
    ['TI', 'TI', 'DESARROLLO', '2', '', 'TI02', 'Área', 'Clave validada contra catálogo unificado adjunto', '', 'Estatus origen: Activo; Agregado de reporte']]);
  assert.strictEqual(r.departamentos[0].areas[0].observaciones, 'Agregado de reporte');
});

// ─────────────────────────────── Importación a la base ───────────────────────────────

const MINI = [
  { nombre: 'CONTROL INTERNO', clave: 'CI', areas: [
    { nombre: 'CONTROL INTERNO', clave: '01', activo: 'SI', observaciones: '', subareas: [] },
    { nombre: 'ANÁLISIS DE DATOS Y PROCESOS', clave: '04', activo: 'SI', observaciones: '', subareas: [
      { nombre: 'PROCESOS', claveAnterior: 'CI02', observaciones: '' }] }
  ] },
  { nombre: 'TI', clave: 'TI', areas: [{ nombre: 'DESARROLLO', clave: '02', activo: 'SI', observaciones: '', subareas: [] }] }
];
const contador = function () {
  const n = {};
  return function (serie) { n[serie] = (n[serie] || 0) + 1; return serie + '-' + n[serie]; };
};
const vacio = { departamentos: [], areas: [], subareas: [] };

test('con la base vacía crea todo y liga cada área a su departamento y cada subárea a su área', function () {
  const p = gs.planImportacionCatalogo_(MINI, vacio, contador());
  assert.deepStrictEqual([p.departamentos.length, p.areas.length, p.subareas.length], [2, 3, 1]);
  assert.deepStrictEqual(plano(p.areas[1]), { ID_AREA: 'ARE-2', ID_DEPARTAMENTO: 'DEP-1', NOMBRE: 'ANÁLISIS DE DATOS Y PROCESOS',
    CLAVE_CODIGO: '04', ACTIVO: 'SI', OBSERVACIONES: '' });
  assert.strictEqual(p.subareas[0].ID_AREA, 'ARE-2');
});

test('correrla otra vez no duplica nada', function () {
  const primera = gs.planImportacionCatalogo_(MINI, vacio, contador());
  const base = { departamentos: primera.departamentos, areas: primera.areas, subareas: primera.subareas };
  const segunda = gs.planImportacionCatalogo_(MINI, base, contador());
  assert.deepStrictEqual([segunda.departamentos.length, segunda.areas.length, segunda.subareas.length], [0, 0, 0]);
  assert.deepStrictEqual(plano(segunda.existentes), { departamentos: 2, areas: 3, subareas: 1 });
});

test('empata sin importar acentos ni mayúsculas, y si la base tiene otra clave la respeta y avisa', function () {
  const base = {
    departamentos: [{ ID_DEPARTAMENTO: 'DEP-9', NOMBRE: 'Control Interno', CLAVE_CODIGO: 'CI' }],
    areas: [{ ID_AREA: 'ARE-9', ID_DEPARTAMENTO: 'DEP-9', NOMBRE: 'Analisis de datos y procesos', CLAVE_CODIGO: '05' }],
    subareas: []
  };
  const p = gs.planImportacionCatalogo_(MINI, base, contador());
  assert.deepStrictEqual(plano(p.areas.map(function (a) { return a.NOMBRE; })), ['CONTROL INTERNO', 'DESARROLLO']);
  assert.strictEqual(p.subareas[0].ID_AREA, 'ARE-9');
  assert.strictEqual(p.avisos.length, 1);
  assert.ok(/«05».*«04»/.test(p.avisos[0]));
});

test('el catálogo inicial completo se importa sin avisos sobre una base vacía', function () {
  const p = gs.planImportacionCatalogo_(gs.CATALOGO_INICIAL, vacio, contador());
  assert.deepStrictEqual([p.departamentos.length, p.areas.length, p.subareas.length, p.avisos.length], [37, 204, 28, 0]);
});

// ─────────────────────────────── Árbol de la pantalla ───────────────────────────────

test('arbolCatalogo_: arma el cuerpo del código, ordena y marca las bajas', function () {
  const arbol = plano(gs.arbolCatalogo_(
    [{ ID_DEPARTAMENTO: 'D2', NOMBRE: 'TI', CLAVE_CODIGO: 'TI', ACTIVO: 'SI' },
      { ID_DEPARTAMENTO: 'D1', NOMBRE: 'Control Interno', CLAVE_CODIGO: 'CI', ACTIVO: 'SI' }],
    [{ ID_AREA: 'A2', ID_DEPARTAMENTO: 'D1', NOMBRE: 'ADyP', CLAVE_CODIGO: '04', ACTIVO: 'SI', OBSERVACIONES: '' },
      { ID_AREA: 'A1', ID_DEPARTAMENTO: 'D1', NOMBRE: 'Control Interno', CLAVE_CODIGO: '01', ACTIVO: 'NO', OBSERVACIONES: 'x' }],
    [{ ID_SUBAREA: 'S1', ID_AREA: 'A2', NOMBRE: 'Procesos', CLAVE_ANTERIOR: 'CI02', ACTIVO: 'SI', OBSERVACIONES: '' }]));
  assert.deepStrictEqual(arbol.map(function (d) { return d.nombre; }), ['Control Interno', 'TI']);
  assert.deepStrictEqual(arbol[0].areas.map(function (a) { return a.cuerpo + ':' + a.activo; }), ['CI01:false', 'CI04:true']);
  assert.strictEqual(arbol[0].areas[1].subareas[0].claveAnterior, 'CI02');
});
