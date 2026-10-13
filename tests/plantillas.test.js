// Pruebas de quitarMarcaDeAguaXml_ (src/documentos/Plantillas.gs) con los encabezados REALES de la
// plantilla institucional (tests/fixtures/plantilla/, sacados de docs/insumos/plantilla-ciudad-maderas.docx).
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const { cargarGs } = require('./cargar-gs');

const gs = cargarGs(['src/config/Config.gs', 'src/documentos/Plantillas.gs']);
const MARCA = 'COPIA NO AUTORIZADA';
const leer = function (n) { return fs.readFileSync(path.join(__dirname, 'fixtures', 'plantilla', n), 'utf8'); };
const contar = function (xml, s) { return xml.split(s).length - 1; };

['header1.xml', 'header2.xml', 'header3.xml'].forEach(function (archivo) {
  test(archivo + ': se quita la marca y nada más', function () {
    const original = leer(archivo);
    assert.ok(original.indexOf(MARCA) !== -1, 'el fixture debe traer la marca');
    const r = gs.quitarMarcaDeAguaXml_(original, MARCA);
    assert.strictEqual(r.quitadas, 1);
    assert.strictEqual(r.xml.indexOf(MARCA), -1);
    assert.strictEqual(r.xml.indexOf('<w:pict'), -1);
    // Los runs siguen balanceados y el resto del encabezado (marco, imágenes) se conserva.
    assert.strictEqual(contar(r.xml, '<w:r>') + contar(r.xml, '<w:r '), contar(r.xml, '</w:r>'));
    assert.strictEqual(contar(r.xml, '<w:drawing>'), contar(original, '<w:drawing>'));
    assert.strictEqual(contar(r.xml, 'r:embed='), contar(original, 'r:embed='));
    assert.ok(/<\/w:hdr>\s*$/.test(r.xml));
  });
});

test('sin marca no se cambia nada', function () {
  const xml = '<w:hdr><w:p><w:r><w:t>Hola</w:t></w:r></w:p></w:hdr>';
  const r = gs.quitarMarcaDeAguaXml_(xml, MARCA);
  assert.strictEqual(r.quitadas, 0);
  assert.strictEqual(r.xml, xml);
});

test('también quita una marca hecha como forma moderna (mc:AlternateContent) completa', function () {
  const xml = '<w:hdr><w:p><w:r><w:t>Antes</w:t></w:r>' +
    '<w:r><w:rPr><w:noProof/></w:rPr><mc:AlternateContent><mc:Choice><w:drawing><wp:anchor><w:txbxContent><w:p><w:r><w:t>' + MARCA +
    '</w:t></w:r></w:p></w:txbxContent></wp:anchor></w:drawing></mc:Choice><mc:Fallback><w:pict><v:shape><v:textpath string="' + MARCA +
    '"/></v:shape></w:pict></mc:Fallback></mc:AlternateContent></w:r>' +
    '<w:r><w:t>Después</w:t></w:r></w:p></w:hdr>';
  const r = gs.quitarMarcaDeAguaXml_(xml, MARCA);
  assert.strictEqual(r.quitadas, 1);
  assert.strictEqual(r.xml, '<w:hdr><w:p><w:r><w:t>Antes</w:t></w:r><w:r><w:t>Después</w:t></w:r></w:p></w:hdr>');
});
