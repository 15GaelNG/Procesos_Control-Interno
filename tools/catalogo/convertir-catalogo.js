// Convierte el Excel de departamentos, áreas y subáreas de Procesos en src/config/CatalogoInicial.gs,
// que importarCatalogoInicial() carga a la base (ver docs/catalogos.md).
//
//   npm run catalogo                         → usa docs/insumos/catalogo-departamentos-areas.xlsx
//   npm run catalogo -- ruta/al/archivo.xlsx → usa otro archivo
//
// Si el Excel rompe sus propias reglas (una clave con dos áreas, un departamento con dos códigos…) se
// detiene sin escribir nada.
const fs = require('fs');
const path = require('path');
const { leerXlsx } = require('../lib/xlsx');
const { catalogoDesdeRenglones, hojaDelCatalogo } = require('./catalogo');

const RAIZ = path.join(__dirname, '..', '..');
const entrada = path.resolve(RAIZ, process.argv[2] || 'docs/insumos/catalogo-departamentos-areas.xlsx');
const salida = path.join(RAIZ, 'src', 'config', 'CatalogoInicial.gs');

const hojas = leerXlsx(entrada);
const principal = hojaDelCatalogo(hojas);
if (!principal) throw new Error('Ninguna hoja de ' + entrada + ' trae los encabezados del catálogo (DEPARTAMENTO, CODIGO_DEPARTAMENTO…).');
const catalogo = catalogoDesdeRenglones(hojas[principal]);

const js = function (v) { return JSON.stringify(v); };
const lineas = [];
catalogo.departamentos.forEach(function (d, i) {
  lineas.push('  { nombre: ' + js(d.nombre) + ', clave: ' + js(d.clave) + ', areas: [');
  d.areas.forEach(function (a, j) {
    const subareas = a.subareas.map(function (s) {
      return '\n        { nombre: ' + js(s.nombre) + ', claveAnterior: ' + js(s.claveAnterior) + ', observaciones: ' + js(s.observaciones) + ' }';
    }).join(',');
    lineas.push('    { nombre: ' + js(a.nombre) + ', clave: ' + js(a.clave) + ', activo: ' + js(a.activo) +
      ', observaciones: ' + js(a.observaciones) + ', subareas: [' + subareas + (subareas ? '\n      ' : '') + '] }' +
      (j < d.areas.length - 1 ? ',' : ''));
  });
  lineas.push('  ] }' + (i < catalogo.departamentos.length - 1 ? ',' : ''));
});

const totalAreas = catalogo.departamentos.reduce(function (n, d) { return n + d.areas.length; }, 0);
const totalSub = catalogo.departamentos.reduce(function (n, d) {
  return n + d.areas.reduce(function (m, a) { return m + a.subareas.length; }, 0);
}, 0);

const contenido = [
  '/**',
  ' * CATÁLOGO INICIAL DE DEPARTAMENTOS, ÁREAS Y SUBÁREAS — GENERADO, NO SE EDITA A MANO.',
  ' *',
  ' * Sale de ' + path.relative(RAIZ, entrada).replace(/\\/g, '/') + ' (hoja «' + principal + '») con',
  ' * `npm run catalogo` (tools/catalogo/convertir-catalogo.js). importarCatalogoInicial() lo carga a la',
  ' * base sin borrar ni cambiar lo que ya exista. Después, el catálogo se administra en la base.',
  ' *',
  ' * ' + catalogo.departamentos.length + ' departamentos · ' + totalAreas + ' áreas · ' + totalSub + ' subáreas.',
  ' */',
  'const CATALOGO_INICIAL = [',
  lineas.join('\n'),
  '];',
  ''
].join('\n');

fs.writeFileSync(salida, contenido, 'utf8');
console.log('Escrito ' + path.relative(RAIZ, salida) + ': ' + catalogo.departamentos.length + ' departamentos, ' +
  totalAreas + ' áreas, ' + totalSub + ' subáreas.');
if (catalogo.avisos.length) console.log('\nAvisos (se cargan tal cual; Procesos decide):\n  · ' + catalogo.avisos.join('\n  · '));
