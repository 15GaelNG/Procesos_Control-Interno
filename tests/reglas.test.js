// Reglas del repo (CLAUDE.md) que se pueden revisar solas:
//  - Las constantes de nivel superior solo viven en src/config/ (Apps Script no garantiza el orden de
//    carga de los archivos).
//  - Ningún nombre de nivel superior (const o function) se declara dos veces: tira TODO el servidor.
//  - Toda función del navegador (api…) vive en src/ClientApi.gs y pide la sesión con sesionEfectiva_.
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');

const SRC = path.join(__dirname, '..', 'src');
function archivosGs(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).reduce(function (lista, e) {
    const ruta = path.join(dir, e.name);
    return lista.concat(e.isDirectory() ? archivosGs(ruta) : (/\.gs$/.test(e.name) ? [ruta] : []));
  }, []);
}
const ARCHIVOS = archivosGs(SRC).map(function (ruta) {
  return { ruta: path.relative(SRC, ruta).replace(/\\/g, '/'), texto: fs.readFileSync(ruta, 'utf8') };
});

test('las constantes de nivel superior solo están en src/config/', function () {
  ARCHIVOS.filter(function (a) { return a.ruta.indexOf('config/') !== 0; }).forEach(function (a) {
    const constantes = (a.texto.match(/^const\s+\w+/gm) || []);
    assert.deepStrictEqual(constantes, [], a.ruta + ' declara constantes de nivel superior');
  });
});

test('ningún nombre de nivel superior se declara dos veces', function () {
  const vistos = {};
  ARCHIVOS.forEach(function (a) {
    (a.texto.match(/^(?:const|let|var|function)\s+(\w+)/gm) || []).forEach(function (d) {
      const nombre = d.split(/\s+/)[1];
      assert.ok(!vistos[nombre], nombre + ' está en ' + vistos[nombre] + ' y en ' + a.ruta);
      vistos[nombre] = a.ruta;
    });
  });
});

test('las funciones del navegador (api…) están en ClientApi.gs y piden la sesión efectiva', function () {
  ARCHIVOS.forEach(function (a) {
    (a.texto.match(/^function (api\w+)\(([^)]*)\)/gm) || []).forEach(function (f) {
      assert.strictEqual(a.ruta, 'ClientApi.gs', f + ' fuera de ClientApi.gs');
    });
  });
  const api = ARCHIVOS.filter(function (a) { return a.ruta === 'ClientApi.gs'; })[0].texto;
  api.split(/^function /m).slice(1).forEach(function (cuerpo) {
    const nombre = cuerpo.split('(')[0];
    assert.ok(/^\(comoUsuario/.test(cuerpo.slice(nombre.length)), nombre + ' debe recibir primero comoUsuario');
    assert.ok(cuerpo.indexOf('sesionEfectiva_(') !== -1, nombre + ' debe pedir la sesión con sesionEfectiva_');
  });
});
