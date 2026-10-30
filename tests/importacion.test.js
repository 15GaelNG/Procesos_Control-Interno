// Importar un Word o PDF existente con IA (src/services/Importacion.gs, decisión 33): lo que se le pide a la
// IA y cómo se limpia lo que regresa.
const test = require('node:test');
const assert = require('node:assert');
const { cargarGs } = require('./cargar-gs');

const gs = cargarGs(['src/config/Config.gs', 'src/config/Catalogos.gs', 'src/utils/Texto.gs', 'src/ia/Prompts.gs', 'src/ia/Analisis.gs'], {}, ['LIMITES_CAPTURA']);
const plano = function (v) { return JSON.parse(JSON.stringify(v)); };

test('el prompt pide separar sin inventar y trae el texto del documento', function () {
  const p = gs.construirPromptImportacion_('Alta de proveedores', '1. El auxiliar recibe la solicitud.');
  assert.ok(/SOLO lo que dice el documento/.test(p.sistema) && /MISMO orden/.test(p.sistema) && /control de cambios/.test(p.sistema));
  assert.ok(/Documento: Alta de proveedores/.test(p.usuario) && /El auxiliar recibe/.test(p.usuario));
});

test('lo que regresa la IA se limpia: actividades con texto, responsables y listas dentro de los límites', function () {
  const r = plano(gs.validarImportacion_({ inicio: ' Llega la solicitud ', fin: 'Se archiva', objetivo: 7,
    actividades: [{ texto: ' Recibe la solicitud ', responsable: ' Auxiliar   de Compras ' }, { texto: '   ' }, null, { texto: 'Autoriza' }],
    responsabilidades: ['Auxiliar: recibe', '', 3], definiciones: 'no es lista' }));
  assert.deepStrictEqual(r, { inicio: 'Llega la solicitud', fin: 'Se archiva', objetivo: '7', alcance: '',
    actividades: [{ texto: 'Recibe la solicitud', responsable: 'Auxiliar de Compras' }, { texto: 'Autoriza', responsable: '' }],
    responsabilidades: ['Auxiliar: recibe', '3'], definiciones: [] });
  const muchas = [];
  for (let i = 0; i < gs.LIMITES_CAPTURA.ACTIVIDADES_MAX + 5; i++) muchas.push({ texto: 'Paso ' + i });
  assert.strictEqual(gs.validarImportacion_({ actividades: muchas }).actividades.length, gs.LIMITES_CAPTURA.ACTIVIDADES_MAX);
  assert.throws(function () { gs.validarImportacion_({ actividades: [] }); }, /no encontró actividades/);
  assert.throws(function () { gs.validarImportacion_(null); }, /no encontró actividades/);
});
