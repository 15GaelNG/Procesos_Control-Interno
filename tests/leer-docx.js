// Lector mínimo de .docx (un ZIP) para las pruebas: devuelve el texto de las partes de Word sin
// dependencias externas. Solo maneja lo que produce Word: entradas guardadas o comprimidas con deflate.
const fs = require('fs');
const zlib = require('zlib');

/** { 'word/document.xml': '<xml…>', … } con todas las entradas del ZIP como texto UTF-8. */
function leerZip(ruta) {
  const b = fs.readFileSync(ruta);
  let fin = b.length - 22;
  while (fin >= 0 && b.readUInt32LE(fin) !== 0x06054b50) fin--;
  if (fin < 0) throw new Error('No es un ZIP: ' + ruta);
  const total = b.readUInt16LE(fin + 10);
  let p = b.readUInt32LE(fin + 16);
  const partes = {};
  for (let i = 0; i < total; i++) {
    if (b.readUInt32LE(p) !== 0x02014b50) throw new Error('Directorio del ZIP dañado');
    const metodo = b.readUInt16LE(p + 10);
    const tamano = b.readUInt32LE(p + 20);
    const largoNombre = b.readUInt16LE(p + 28);
    const largoExtra = b.readUInt16LE(p + 30);
    const largoComentario = b.readUInt16LE(p + 32);
    const local = b.readUInt32LE(p + 42);
    const nombre = b.toString('utf8', p + 46, p + 46 + largoNombre);
    const inicio = local + 30 + b.readUInt16LE(local + 26) + b.readUInt16LE(local + 28);
    const datos = b.subarray(inicio, inicio + tamano);
    partes[nombre] = (metodo === 8 ? zlib.inflateRawSync(datos) : datos).toString('utf8');
    p += 46 + largoNombre + largoExtra + largoComentario;
  }
  return partes;
}

/** Texto visible del cuerpo, encabezados y pies de un .docx (unión de todos los <w:t>). */
function textoDocx(ruta) {
  const partes = leerZip(ruta);
  return Object.keys(partes)
    .filter(function (n) { return /^word\/(document|header\d*|footer\d*)\.xml$/.test(n); })
    .map(function (n) {
      return (partes[n].match(/<w:t(?:\s[^>]*)?>[^<]*<\/w:t>/g) || [])
        .map(function (t) { return t.replace(/<[^>]+>/g, ''); }).join('');
    }).join('\n');
}

module.exports = { leerZip: leerZip, textoDocx: textoDocx };
