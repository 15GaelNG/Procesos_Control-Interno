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

// ─── Marcadores de la plantilla v2 (src/documentos/Llenado.gs) ───
const { textoDocx } = require('../tools/lib/zip');
const llenado = cargarGs(['src/config/Config.gs', 'src/documentos/Llenado.gs'], {}, ['MARCADORES_PLANTILLA']);

test('marcadoresEnTexto_ encuentra cada {{CLAVE}} una sola vez y en orden', function () {
  const texto = '{{CODIGO}} · {{NOMBRE_DOCUMENTO}} · otra vez {{CODIGO}} · {{mal}} · {CODIGO} · {{FECHA_2026}}';
  assert.deepStrictEqual(JSON.parse(JSON.stringify(llenado.marcadoresEnTexto_(texto))), ['CODIGO', 'NOMBRE_DOCUMENTO', 'FECHA_2026']);
  assert.strictEqual(llenado.marcadoresEnTexto_('sin marcadores').length, 0);
});

test('la plantilla v2 trae todos los marcadores que el sistema conoce y ninguno desconocido', function () {
  // Se lee el .docx real (cuerpo, encabezados y pies): si alguien rehace la plantilla y se le olvida
  // o se le rompe un marcador, esta prueba lo detecta.
  const texto = textoDocx(path.join(__dirname, '..', 'plantillas', 'Procedimiento.docx'));
  const enPlantilla = Array.from(llenado.marcadoresEnTexto_(texto));
  const m = llenado.MARCADORES_PLANTILLA;
  const conocidos = [].concat(m.simples, m.listas, [m.desarrollo]);
  assert.deepStrictEqual(conocidos.filter(function (c) { return enPlantilla.indexOf(c) === -1; }), [], 'faltan en la plantilla');
  assert.deepStrictEqual(enPlantilla.filter(function (c) { return conocidos.indexOf(c) === -1; }), [], 'la plantilla trae marcadores desconocidos');
});

// ─── Tamaño de las imágenes en «Desarrollo» ───
const tam = cargarGs(['src/config/Config.gs', 'src/documentos/Llenado.gs']);
const t = function (a, b) { return JSON.parse(JSON.stringify(tam.tamanoImagen_(a, b))); };

test('una imagen ancha se reduce al ancho máximo sin deformarse', function () {
  assert.deepStrictEqual(t(1600, 900), { ancho: 560, alto: 315 });
});

test('una captura de celular (vertical) se limita por el alto para no salirse de la hoja', function () {
  assert.deepStrictEqual(t(1080, 2400), { ancho: 270, alto: 600 });
});

test('una imagen chica no se agranda', function () {
  assert.deepStrictEqual(t(300, 120), { ancho: 300, alto: 120 });
});
