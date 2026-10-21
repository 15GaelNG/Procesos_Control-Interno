// Catálogo de departamentos, áreas y subáreas: conversión del Excel de Procesos
// (tools/catalogo/catalogo.js), importación a la base (src/services/Catalogos.gs) y árbol de la pantalla.
const test = require('node:test');
const assert = require('node:assert');
const path = require('path');
const { leerXlsx } = require('../tools/lib/xlsx');
const { catalogoDesdeRenglones, hojaDelCatalogo } = require('../tools/catalogo/catalogo');
const { cargarGs } = require('./cargar-gs');

const plano = function (v) { return JSON.parse(JSON.stringify(v)); };
const ARCHIVO = path.join(__dirname, '..', 'docs', 'insumos', 'catalogo-departamentos-areas.xlsx');
const hojas = leerXlsx(ARCHIVO);
const catalogo = catalogoDesdeRenglones(hojas[hojaDelCatalogo(hojas)]);
const depto = function (nombre) { return catalogo.departamentos.filter(function (d) { return d.nombre === nombre; })[0]; };
const area = function (nombreDepto, clave) { return depto(nombreDepto).areas.filter(function (a) { return a.clave === clave; })[0]; };
const gs = cargarGs(['src/utils/Texto.gs', 'src/services/Catalogos.gs', 'src/config/CatalogoInicial.gs'], {}, ['CATALOGO_INICIAL']);

// ─────────────────────────────── El archivo de Procesos ───────────────────────────────

test('la lista maestra de Procesos (21/10/2026) trae 27 departamentos, 147 áreas (17 de baja) y 28 subáreas', function () {
  const areas = catalogo.departamentos.reduce(function (n, d) { return n + d.areas.length; }, 0);
  const bajas = catalogo.departamentos.reduce(function (n, d) { return n + d.areas.filter(function (a) { return a.activo === 'NO'; }).length; }, 0);
  const subareas = catalogo.departamentos.reduce(function (n, d) {
    return n + d.areas.reduce(function (m, a) { return m + a.subareas.length; }, 0);
  }, 0);
  assert.deepStrictEqual([catalogo.departamentos.length, areas, bajas, subareas], [27, 147, 17, 28]);
});

test('src/config/CatalogoInicial.gs está al día con el Excel (se genera con npm run catalogo)', function () {
  assert.deepStrictEqual(plano(gs.CATALOGO_INICIAL), plano(catalogo.departamentos));
});

test('dentro de un departamento cada clave es de una sola área (así empata la importación)', function () {
  catalogo.departamentos.forEach(function (d) {
    const claves = d.areas.map(function (a) { return a.clave; });
    assert.strictEqual(new Set(claves).size, claves.length, d.nombre);
  });
});

test('Procesos es subárea de Análisis de Datos y Procesos (CI04); el área Procesos (CI02) quedó de baja', function () {
  assert.strictEqual(area('CONTROL INTERNO', '04').nombre, 'ANÁLISIS DE DATOS Y PROCESOS');
  assert.deepStrictEqual(area('CONTROL INTERNO', '04').subareas.map(function (s) { return s.nombre; }), ['ANÁLISIS DE DATOS', 'PROCESOS', 'CAJAS CHICAS']);
  assert.deepStrictEqual([area('CONTROL INTERNO', '02').nombre, area('CONTROL INTERNO', '02').activo], ['PROCESOS', 'NO']);
});

test('un área que solo aparece con sus subáreas se crea una vez, con todas ellas y sin repetir', function () {
  const facturacion = area('ADMINISTRACION OOAM', '05');
  assert.deepStrictEqual(facturacion.subareas.map(function (s) { return s.nombre; }), ['DOMICILIACIONES', 'ESTADOS DE CUENTA', 'DEVOLUCIONES Y TRASPASOS']);
  assert.strictEqual(area('POST VENTA', '01').subareas.length, 2, 'Post Venta 01 aparece con y sin subárea');
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

test('las áreas «(OBSOLETO)» quedan dadas de baja, sin el prefijo y con la razón en sus notas', function () {
  const comunicacion = area('CAPITAL HUMANO', '03');
  assert.deepStrictEqual([comunicacion.nombre, comunicacion.activo], ['COMUNICACION', 'NO']);
  assert.ok(/OBSOLETO/.test(comunicacion.observaciones));
  assert.ok(depto('COMPRAS').areas.every(function (a) { return a.activo === 'NO'; }), 'Compras quedó todo de baja');
});

test('se avisa la clave escrita sin los dos dígitos (Post Venta «3» → 03)', function () {
  assert.strictEqual(area('POST VENTA', '03').nombre, 'ADMINISTRACIÓN DE OFICINA');
  assert.ok(catalogo.avisos.some(function (a) { return /«3».*03/.test(a); }));
});

// ─────────────────────────────── Reglas de la conversión ───────────────────────────────

const ENCABEZADO = ['', 'DEPARTAMENTO', 'CODIGO_ DEPARTAMENTO ', 'AREA ', 'CODIGO_ AREA ', 'SUB AREA '];
const renglon = function (depto, codigo, area, clave, sub) { return ['', depto, codigo, area, clave, sub || '']; };

test('encuentra los encabezados aunque traigan espacios, guiones bajos o vengan después de un título', function () {
  const r = catalogoDesdeRenglones([['Lista maestra'], ENCABEZADO, renglon('TI', 'ti', 'SOPORTE TI', '03'), [], ['', '', '', '', '', '']]);
  assert.deepStrictEqual(plano(r.departamentos), [{ nombre: 'TI', clave: 'TI', areas: [
    { nombre: 'SOPORTE TI', clave: '03', activo: 'SI', observaciones: '', subareas: [] }] }]);
  assert.strictEqual(hojaDelCatalogo({ Notas: [['x']], Lista: [ENCABEZADO] }), 'Lista');
});

test('se detiene si una clave tiene dos áreas distintas o un departamento dos códigos', function () {
  assert.throws(function () {
    catalogoDesdeRenglones([ENCABEZADO, renglon('TI', 'TI', 'SOPORTE', '03'), renglon('TI', 'TI', 'REDES', '03')]);
  }, /TI03 ya es de «SOPORTE»/);
  assert.throws(function () {
    catalogoDesdeRenglones([ENCABEZADO, renglon('TI', 'TI', 'SOPORTE', '03'), renglon('TI', 'SIS', 'REDES', '04')]);
  }, /dos códigos \(TI y SIS\)/);
  assert.throws(function () { catalogoDesdeRenglones([ENCABEZADO, renglon('TI', 'TI', 'SOPORTE', 'tres')]); }, /clave de área inválida/);
  assert.throws(function () { catalogoDesdeRenglones([['DEPTO', 'AREA']]); }, /No se encontró el renglón de encabezados/);
});

test('avisa si dos departamentos usan el mismo código o si un área sigue activa con dos claves', function () {
  const r = catalogoDesdeRenglones([ENCABEZADO, renglon('COBRANZA', 'CO', 'COBRANZA', '01'), renglon('COBRANZA LOTES', 'CO', 'CALIDAD', '02'),
    renglon('TI', 'TI', 'SOPORTE', '01'), renglon('TI', 'TI', 'SOPORTE', '05'), renglon('TI', 'TI', '(OBSOLETO) REDES', '02'), renglon('TI', 'TI', 'REDES', '06')]);
  assert.ok(r.avisos.some(function (a) { return /CO lo usan varios departamentos/.test(a); }));
  assert.ok(r.avisos.some(function (a) { return /SOPORTE está activa con dos claves \(TI01 y TI05\)/.test(a); }));
  assert.ok(!r.avisos.some(function (a) { return /REDES/.test(a); }), 'una de baja y otra activa no es aviso');
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
  assert.deepStrictEqual([p.departamentos.length, p.areas.length, p.subareas.length, p.avisos.length], [27, 147, 28, 0]);
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
