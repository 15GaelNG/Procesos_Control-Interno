// Carga archivos .gs en un contexto aislado (como los ve Apps Script: todos en un mismo ámbito
// global) para probar en node las funciones que no usan servicios de Google.
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const RAIZ = path.join(__dirname, '..');

function cargarGs(archivos, globales) {
  const contexto = vm.createContext(Object.assign({ console: console }, globales || {}));
  const codigo = archivos.map(function (a) { return fs.readFileSync(path.join(RAIZ, a), 'utf8'); }).join('\n;\n');
  vm.runInContext(codigo, contexto, { filename: archivos.join(' + ') });
  return contexto;
}

module.exports = { cargarGs: cargarGs };
