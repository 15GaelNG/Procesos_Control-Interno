// Revisa las trampas de Apps Script en los .html (CLAUDE.md): dentro de un <script>, «//» seguido de
// texto se toma como comentario aunque esté en un string y corta la línea; «/*» dentro de un texto se
// come todo hasta el siguiente «*/»; y los símbolos de scriptlet solo pueden ir en Index.html.
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');

const RAIZ = path.join(__dirname, '..', 'src', 'html');

function archivosHtml(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).reduce(function (lista, e) {
    const ruta = path.join(dir, e.name);
    return lista.concat(e.isDirectory() ? archivosHtml(ruta) : (/\.html$/.test(e.name) ? [ruta] : []));
  }, []);
}

function bloquesScript(texto) {
  const bloques = [];
  const patron = /<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/g;
  let m;
  while ((m = patron.exec(texto))) bloques.push(m[1]);
  return bloques;
}

const ARCHIVOS = archivosHtml(RAIZ);

test('hay archivos html que revisar', function () {
  assert.ok(ARCHIVOS.length >= 5);
});

ARCHIVOS.forEach(function (archivo) {
  const nombre = path.relative(RAIZ, archivo);
  const texto = fs.readFileSync(archivo, 'utf8');

  test(nombre + ': sin «//» dentro de los <script>', function () {
    bloquesScript(texto).forEach(function (codigo) {
      codigo.split('\n').forEach(function (linea, i) {
        assert.ok(linea.indexOf('//') === -1, nombre + ' línea ' + (i + 1) + ' del script: ' + linea.trim());
      });
    });
  });

  test(nombre + ': sin «/*» dentro de textos de los <script>', function () {
    bloquesScript(texto).forEach(function (codigo) {
      const sinComentarios = codigo.replace(/^\s*\/\*[\s\S]*?\*\//gm, '').replace(/\/\*[^'"`\n]*?\*\//g, '');
      assert.ok(sinComentarios.indexOf('/*') === -1, nombre + ': hay un «/*» que no es comentario');
    });
  });

  if (nombre !== 'Index.html') {
    test(nombre + ': sin símbolos de scriptlet', function () {
      assert.ok(texto.indexOf('<' + '?') === -1 && texto.indexOf('?' + '>') === -1);
    });
  }
});
