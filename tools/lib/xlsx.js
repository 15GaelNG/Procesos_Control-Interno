// Lector mínimo de .xlsx sin dependencias: devuelve cada hoja como arreglo de renglones (arreglos de
// textos). De las fórmulas toma el valor que Excel dejó calculado. Suficiente para catálogos; no
// interpreta fechas ni formatos.
const { leerZip } = require('./zip');

function desescapar(t) {
  return t.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&apos;/g, "'")
    .replace(/&#(\d+);/g, function (m, n) { return String.fromCodePoint(Number(n)); })
    .replace(/&amp;/g, '&');
}

/** Texto de un nodo con uno o varios <t> (cadenas con formato mixto traen varios). */
function textoDe(xml) {
  return (xml.match(/<t(?:\s[^>]*)?>[\s\S]*?<\/t>/g) || [])
    .map(function (t) { return desescapar(t.replace(/<[^>]+>/g, '')); }).join('');
}

/** 'AB12' → 27 (índice de columna desde 0). */
function columna(ref) {
  const letras = ref.replace(/\d+/g, '');
  let n = 0;
  for (let i = 0; i < letras.length; i++) n = n * 26 + (letras.charCodeAt(i) - 64);
  return n - 1;
}

/** { 'Nombre de la hoja': [['A1', 'B1', …], …], … } en el orden del libro. */
function leerXlsx(ruta) {
  const partes = leerZip(ruta);
  const compartidas = ((partes['xl/sharedStrings.xml'] || '').match(/<si>[\s\S]*?<\/si>/g) || []).map(textoDe);
  const relaciones = {};
  (partes['xl/_rels/workbook.xml.rels'].match(/<Relationship [^>]*>/g) || []).forEach(function (r) {
    relaciones[/Id="([^"]+)"/.exec(r)[1]] = 'xl/' + /Target="([^"]+)"/.exec(r)[1].replace(/^\/?xl\//, '');
  });
  const hojas = {};
  (partes['xl/workbook.xml'].match(/<sheet [^>]*>/g) || []).forEach(function (s) {
    const nombre = desescapar(/name="([^"]*)"/.exec(s)[1]);
    const xml = partes[relaciones[/r:id="([^"]+)"/.exec(s)[1]]];
    const renglones = [];
    (xml.match(/<row[\s\S]*?<\/row>|<row [^>]*\/>/g) || []).forEach(function (row) {
      const fila = [];
      (row.match(/<c [^>]*\/>|<c [^>]*>[\s\S]*?<\/c>/g) || []).forEach(function (c) {
        const ref = /r="([A-Z]+\d+)"/.exec(c)[1];
        const tipo = (/ t="([^"]+)"/.exec(c) || [])[1];
        const v = (/<v>([\s\S]*?)<\/v>/.exec(c) || [])[1];
        let valor = '';
        if (tipo === 's') valor = compartidas[Number(v)];
        else if (tipo === 'inlineStr') valor = textoDe(c);
        else if (v !== undefined) valor = desescapar(v);
        fila[columna(ref)] = valor;
      });
      const numero = Number(/r="(\d+)"/.exec(row)[1]);
      renglones[numero - 1] = Array.from(fila, function (x) { return x === undefined ? '' : x; });
    });
    hojas[nombre] = Array.from(renglones, function (x) { return x || []; });
  });
  return hojas;
}

module.exports = { leerXlsx: leerXlsx };
