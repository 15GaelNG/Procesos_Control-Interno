// Plantillas y parámetros (src/services/PlantillasParametros.gs, decisión 49).
const test = require('node:test');
const assert = require('node:assert');
const { cargarGs } = require('./cargar-gs');

const gs = cargarGs(['src/config/Config.gs', 'src/config/Catalogos.gs', 'src/services/Usuarios.gs', 'src/services/PlantillasParametros.gs'],
  {}, ['PARAMETROS_PANTALLA']);
const plano = function (v) { return JSON.parse(JSON.stringify(v)); };

const CONFIG = { AVISOS_CORREO: 'SI', CORREO_PROCESOS: '', IA_MAX_LLAMADAS_DIA: '200', IMG_CALIDAD: '0.82', MARCA_AGUA_TEXTO: 'COPIA NO AUTORIZADA' };

test('parámetros: los de la pantalla con su valor, y la marca de agua solo se ve', function () {
  const l = plano(gs.parametrosPantalla_(CONFIG));
  const de = function (c) { return l.filter(function (p) { return p.clave === c; })[0]; };
  assert.deepStrictEqual([de('AVISOS_CORREO').valor, de('AVISOS_CORREO').tipo, de('REGISTRO_ABIERTO').valor], ['SI', 'SI_NO', '']);
  assert.strictEqual(de('MARCA_AGUA_TEXTO').editable, false);
  assert.ok(!de('IA_PROVEEDOR'), 'lo que no está en la lista no sale');
});

test('guardar parámetros: valida cada tipo y solo devuelve lo que cambia', function () {
  const ok = plano(gs.planParametros_({ AVISOS_CORREO: 'no', CORREO_PROCESOS: 'Procesos.CI@ciudadmaderas.com; marco@ciudadmaderas.com',
    IA_MAX_LLAMADAS_DIA: ' 200 ', IMG_CALIDAD: '0.9' }, CONFIG));
  assert.deepStrictEqual(ok, { errores: [], cambios: [
    { clave: 'AVISOS_CORREO', antes: 'SI', despues: 'NO' },
    { clave: 'CORREO_PROCESOS', antes: '', despues: 'procesos.ci@ciudadmaderas.com, marco@ciudadmaderas.com' },
    { clave: 'IMG_CALIDAD', antes: '0.82', despues: '0.9' }] });
  const mal = gs.planParametros_({ AVISOS_CORREO: 'tal vez', IA_MAX_LLAMADAS_DIA: '99999', CORREO_PROCESOS: 'no-es-correo', MARCA_AGUA_TEXTO: 'X', OTRO: '1' }, CONFIG).errores.join(' | ');
  assert.ok(/Sí o No/.test(mal) && /entre 0 y/.test(mal) && /no-es-correo/.test(mal) && /MARCA_AGUA_TEXTO/.test(mal) && /OTRO/.test(mal), mal);
});

test('tipos de documento: se habilitan o quitan, pero siempre queda uno', function () {
  const tipos = [{ ID_TIPO: 'TD-02', NOMBRE: 'Procedimiento', ACTIVO: 'SI', EN_SISTEMA: 'SI' }, { ID_TIPO: 'TD-06', NOMBRE: 'Diagrama', ACTIVO: 'SI', EN_SISTEMA: 'NO' }];
  assert.deepStrictEqual([gs.planTipoDocumento_('TD-06', true, tipos).cambia, gs.planTipoDocumento_('TD-06', false, tipos).cambia], [true, false]);
  assert.ok(/al menos un tipo/.test(gs.planTipoDocumento_('TD-02', false, tipos).errores.join()));
  assert.ok(/no existe/.test(gs.planTipoDocumento_('TD-99', true, tipos).errores.join()));
});
