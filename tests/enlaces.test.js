// Enlaces en las actividades (src/services/Solicitudes.gs, decisión 31): se escriben como se quiera
// (con o sin https://), se validan y se guardan con el borrador; la huella de lo que no tiene enlaces no cambia.
const test = require('node:test');
const assert = require('node:assert');
const { cargarGs } = require('./cargar-gs');

const gs = cargarGs(['src/config/Config.gs', 'src/config/Catalogos.gs', 'src/utils/Texto.gs', 'src/utils/Huella.gs',
  'src/services/Sesion.gs', 'src/services/Usuarios.gs', 'src/services/Solicitudes.gs'], {}, ['LIMITES_CAPTURA']);
const plano = function (v) { return JSON.parse(JSON.stringify(v)); };

test('una dirección se guarda con https:// y solo se aceptan páginas web', function () {
  assert.strictEqual(gs.normalizarEnlace_('drive.google.com/drive/folders/abc'), 'https://drive.google.com/drive/folders/abc');
  assert.strictEqual(gs.normalizarEnlace_('  http://intranet/compras  '), 'http://intranet/compras');
  assert.strictEqual(gs.normalizarEnlace_('https://sap.ciudadmaderas.com/?x=1#y'), 'https://sap.ciudadmaderas.com/?x=1#y');
  assert.strictEqual(gs.normalizarEnlace_('javascript:alert(1)'), '');
  assert.strictEqual(gs.normalizarEnlace_('mailto:a@b.com'), '');
  assert.strictEqual(gs.normalizarEnlace_('no es una dirección'), '');
  assert.strictEqual(gs.normalizarEnlace_(''), '');
});

test('enlaces de una actividad: se limpian, los vacíos se ignoran y los malos se reportan', function () {
  const r = plano(gs.planEnlaces_([{ url: 'sap.com', texto: '  Portal   SAP ' }, { url: '', texto: '' }, { url: 'x y', texto: 'Malo' }], 2));
  assert.deepStrictEqual(r.enlaces, [{ url: 'https://sap.com', texto: 'Portal SAP' }]);
  assert.ok(/actividad 2 no es una dirección/.test(r.errores.join()));
  const muchos = [];
  for (let i = 0; i < gs.LIMITES_CAPTURA.ENLACES_MAX + 1; i++) muchos.push({ url: 'a.com/' + i });
  assert.ok(/más de/.test(gs.planEnlaces_(muchos, 1).errores.join()));
  assert.deepStrictEqual(plano(gs.enlacesDe_('basura')), []);
  assert.deepStrictEqual(plano(gs.enlacesDe_('[{"url":"https://a.com","texto":"A"},{"texto":"sin url"}]')), [{ url: 'https://a.com', texto: 'A' }]);
});

const MARCA = new Date(2026, 9, 29, 9, 0, 0);
const FILA = { _fila: 2, ID_SOLICITUD: 'SOL-1', ESTADO: 'BORRADOR', FECHA_ACTUALIZACION: MARCA, INICIO_PROCESO: 'a', FIN_PROCESO: 'b' };
const ACTIVIDADES = [{ _fila: 5, ID_ACTIVIDAD: 'ACT-1', ID_SOLICITUD: 'SOL-1', ORDEN: '1', TEXTO_ORIGINAL: 'Recibe', TEXTO_FINAL: '',
  PUESTO_TEXTO: 'Auxiliar', ELIMINADA: 'NO', ENLACES: '' }];
function contenido(enlaces) {
  return { marca: String(MARCA.getTime()), inicio: 'a', fin: 'b',
    actividades: [{ id: 'ACT-1', texto: 'Recibe', responsable: 'Auxiliar', imagenes: [], enlaces: enlaces }] };
}

test('guardar: los enlaces cambian la actividad solo si cambiaron; sin la lista no se tocan', function () {
  const p = plano(gs.planGuardarBorrador_(contenido([{ url: 'drive.google.com/x', texto: 'Carpeta' }]), FILA, ACTIVIDADES, []));
  assert.deepStrictEqual(p.actividadesCambios, [{ _fila: 5, cambios: { ENLACES: '[{"url":"https://drive.google.com/x","texto":"Carpeta"}]' } }]);
  assert.ok(gs.planGuardarBorrador_(contenido([]), FILA, ACTIVIDADES, []).sinCambios);
  assert.ok(gs.planGuardarBorrador_(contenido(undefined), FILA, ACTIVIDADES, []).sinCambios);
  assert.ok(/no es una dirección/.test(gs.planGuardarBorrador_(contenido([{ url: 'mal hecho' }]), FILA, ACTIVIDADES, []).errores.join()));
});

test('huella: sin enlaces es la misma de antes; con enlaces cambia', function () {
  const base = { nombre: 'X', actividades: [{ texto: 'Recibe', responsable: 'A', imagenes: [] }] };
  const sinEnlaces = gs.contenidoCanonico_(base);
  assert.strictEqual(gs.contenidoCanonico_({ nombre: 'X', actividades: [{ texto: 'Recibe', responsable: 'A', imagenes: [], enlaces: [] }] }), sinEnlaces);
  assert.notStrictEqual(gs.contenidoCanonico_({ nombre: 'X', actividades: [{ texto: 'Recibe', responsable: 'A', imagenes: [],
    enlaces: [{ url: 'https://a.com', texto: '' }] }] }), sinEnlaces);
});
