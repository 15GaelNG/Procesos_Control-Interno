// Fase 7 (src/services/Actualizaciones.gs y lo que toca en revisión, CH y documentos): actualizar un
// documento vigente conservando su código, control de cambios, versión mayor o menor e historial.
const test = require('node:test');
const assert = require('node:assert');
const { cargarGs } = require('./cargar-gs');

const gs = cargarGs(['src/config/Config.gs', 'src/config/Catalogos.gs', 'src/utils/Texto.gs', 'src/utils/Huella.gs', 'src/utils/Fechas.gs',
  'src/services/Sesion.gs', 'src/services/Usuarios.gs', 'src/services/Solicitudes.gs', 'src/services/AnalisisSolicitud.gs',
  'src/services/Documentos.gs', 'src/services/Revision.gs', 'src/services/AutorizacionCH.gs', 'src/services/Actualizaciones.gs'], {}, ['LIMITES_CAPTURA']);
const plano = function (v) { return JSON.parse(JSON.stringify(v)); };

const T = { tipos: [{ ID_TIPO: 'TD-02', NOMBRE: 'Procedimiento', EN_SISTEMA: 'SI' }, { ID_TIPO: 'TD-01', NOMBRE: 'Manual', EN_SISTEMA: 'NO' }],
  departamentos: [{ ID_DEPARTAMENTO: 'DEP-001', NOMBRE: 'CONTROL INTERNO' }], areas: [{ ID_AREA: 'ARE-0004', NOMBRE: 'ADyP' }] };
function doc(cambios) {
  return Object.assign({ ID_DOCUMENTO: 'DOC-0001', CODIGO: 'P-CI04-001', NOMBRE: 'Alta de proveedores', ID_TIPO: 'TD-02', ID_DEPARTAMENTO: 'DEP-001',
    ID_AREA: 'ARE-0004', ID_SUBAREA: '', VERSION_VIGENTE: '0.0', ESTATUS: 'VIGENTE', ID_SOLICITUD_VIGENTE: 'SOL-1', CONTENIDO_ESTRUCTURADO: 'SI' }, cambios);
}

test('documentos que se pueden actualizar: vigentes de sus departamentos, con plantilla y sin otra actualización en curso', function () {
  const docs = [doc(), doc({ ID_DOCUMENTO: 'DOC-0002', CODIGO: 'M-CI04-001', ID_TIPO: 'TD-01' }), doc({ ID_DOCUMENTO: 'DOC-0003', ESTATUS: 'OBSOLETO' }),
    doc({ ID_DOCUMENTO: 'DOC-0004', ID_DEPARTAMENTO: 'DEP-009' }), doc({ ID_DOCUMENTO: 'DOC-0005', CODIGO: 'P-CI04-002', ID_SOLICITUD_VIGENTE: '', ORIGEN: 'HISTORICO' })];
  const solicitudes = [{ ID_SOLICITUD: 'SOL-9', ID_DOCUMENTO: 'DOC-0001', ESTADO: 'EN_REVISION' }, { ID_SOLICITUD: 'SOL-8', ID_DOCUMENTO: 'DOC-0005', ESTADO: 'AUTORIZADO' }];
  const r = plano(gs.documentosActualizables_(docs, solicitudes, ['DEP-001'], T));
  assert.deepStrictEqual(r.map(function (d) { return [d.id, d.disponible, d.estructurado, d.enCurso]; }),
    [['DOC-0002', false, true, ''], ['DOC-0001', true, true, 'SOL-9'], ['DOC-0005', true, false, '']]);
  assert.ok(/actualización en curso/.test(gs.erroresActualizacion_(docs[0], r[1]).join()));
  assert.ok(/todavía no se documenta/.test(gs.erroresActualizacion_(docs[1], r[0]).join()));
  assert.deepStrictEqual(plano(gs.erroresActualizacion_(docs[4], r[2])), []);
});

test('la actualización copia el contenido vigente: código, actividades con su base, enlaces e imágenes; versión por asignar', function () {
  const base = { ID_SOLICITUD: 'SOL-1', INICIO_PROCESO: 'Llega', FIN_PROCESO: 'Termina', OBJETIVO: 'O', ALCANCE: 'A', RESPONSABILIDADES: '["Aux: recibe"]', DEFINICIONES: '[]' };
  const acts = [
    { ID_ACTIVIDAD: 'ACT-2', ID_SOLICITUD: 'SOL-1', ORDEN: '2', TEXTO_ORIGINAL: 'autoriza', TEXTO_FINAL: 'Autoriza.', PUESTO_TEXTO: 'Jefe', ID_PUESTO: 'PUE-2', RESPONSABLE_CONFIRMADO: 'SI', ELIMINADA: 'NO', ENLACES: '' },
    { ID_ACTIVIDAD: 'ACT-1', ID_SOLICITUD: 'SOL-1', ORDEN: '1', TEXTO_ORIGINAL: 'Recibe', TEXTO_FINAL: '', PUESTO_TEXTO: 'Aux', ELIMINADA: 'NO', ENLACES: '[{"url":"https://a.com","texto":"A"}]' },
    { ID_ACTIVIDAD: 'ACT-3', ID_SOLICITUD: 'SOL-1', ORDEN: '3', TEXTO_ORIGINAL: 'borrada', ELIMINADA: 'SI' }];
  const imgs = [{ ID_IMAGEN: 'IMG-1', ID_ACTIVIDAD: 'ACT-1', ID_SOLICITUD: 'SOL-1', ORDEN: '1', ID_ARCHIVO: 'F1', ID_ARCHIVO_DOCUMENTO: 'F2', PIE: 'x', ELIMINADA: 'NO' }];
  const p = plano(gs.planActualizacion_(doc(), base, acts, imgs));
  assert.deepStrictEqual([p.solicitud.TIPO_SOLICITUD, p.solicitud.CODIGO, p.solicitud.VERSION, p.solicitud.ID_DOCUMENTO, p.solicitud.OBJETIVO, p.solicitud.RESPONSABILIDADES],
    ['ACTUALIZACION', 'P-CI04-001', '', 'DOC-0001', 'O', '["Aux: recibe"]']);
  assert.deepStrictEqual(p.actividades.map(function (a) { return [a.ORDEN, a.TEXTO_ORIGINAL, a.ID_ACTIVIDAD_BASE, a.RESPONSABLE_CONFIRMADO]; }),
    [['1', 'Recibe', 'ACT-1', 'NO'], ['2', 'Autoriza.', 'ACT-2', 'SI']]);
  assert.strictEqual(p.actividades[0].ENLACES, '[{"url":"https://a.com","texto":"A"}]');
  assert.deepStrictEqual([p.imagenes.length, p.imagenes[0].base, p.imagenes[0].ID_ARCHIVO, p.imagenes[0].PIE], [1, 'ACT-1', 'F1', 'x']);
  const vacia = plano(gs.planActualizacion_(doc({ ID_SOLICITUD_VIGENTE: '' }), null, acts, imgs));
  assert.deepStrictEqual([vacia.actividades.length, vacia.solicitud.CODIGO], [0, 'P-CI04-001'], 'del inventario anterior: empieza vacía');
});

test('motivos sugeridos al comparar con la versión vigente', function () {
  const base = [{ id: 'A1', responsable: 'Auxiliar' }, { id: 'A2', responsable: 'Jefe' }];
  assert.deepStrictEqual(plano(gs.motivosSugeridos_([{ idBase: 'A1', responsable: 'auxiliar' }, { idBase: 'A2', responsable: 'Jefe' }], base)), []);
  assert.deepStrictEqual(plano(gs.motivosSugeridos_([{ idBase: 'A1', responsable: 'Gerente' }, { idBase: '', responsable: 'x' }], base)),
    ['CAMBIO_RESPONSABLE', 'ACTIVIDADES_AGREGADAS', 'ACTIVIDADES_ELIMINADAS']);
  assert.deepStrictEqual(plano(gs.motivosSugeridos_([{ idBase: '' }], [])), [], 'sin versión estructurada no se compara');
});

test('control de cambios: motivos válidos y «actualización completa» excluye a los demás', function () {
  assert.deepStrictEqual(plano(gs.planControlCambios_({ motivos: ['ACTIVIDADES_AGREGADAS', 'OTRO', 'CAMBIO_RESPONSABLE'], descripcion: ' Se agregó el paso 4 ' })),
    { errores: [], motivos: ['CAMBIO_RESPONSABLE', 'ACTIVIDADES_AGREGADAS'], descripcion: 'Se agregó el paso 4' });
  assert.deepStrictEqual(plano(gs.planControlCambios_({ motivos: ['COMPLETA', 'ACTIVIDADES_AGREGADAS'] })).motivos, ['COMPLETA']);
});

test('versión: mayor o menor (respuesta 5 de Procesos)', function () {
  assert.deepStrictEqual(['0.0', '1.0', '1.3', '', 'x'].map(function (v) { return gs.siguienteVersion_(v, 'MAYOR') + '/' + gs.siguienteVersion_(v, 'MENOR'); }),
    ['1.0/0.1', '2.0/1.1', '2.0/1.4', '1.0/0.1', '1.0/0.1']);
});

test('Vo.Bo. de una actualización: pide mayor o menor y el control de cambios; conserva el código', function () {
  const paola = { registrado: true, idUsuario: 'USR-0004', nombre: 'Paola', perfiles: ['REVISOR'] };
  const fila = { ID_SOLICITUD: 'SOL-5', TIPO_SOLICITUD: 'ACTUALIZACION', ESTADO: 'EN_REVISION', ELABORO_ID: 'USR-0002', REVISOR_ASIGNADO_ID: 'USR-0004',
    HUELLA_CONFIRMADA: 'h', CODIGO: 'P-CI04-001', VERSION: '', MOTIVOS_CAMBIO: '["ACTIVIDADES_AGREGADAS"]', DESCRIPCION_CAMBIO: 'Paso nuevo' };
  const det = { prefijo: 'P', cuerpo: 'CI04', actividades: [] };
  const sinTipo = gs.planVoBo_(fila, paola, det, 'h', [], '', [], '', new Date(), { versionVigente: '1.0' });
  assert.ok(/mayor o menor/.test(sinTipo.errores.join()));
  const p = plano(gs.planVoBo_(fila, paola, det, 'h', [], '', [], 'Analista', new Date(), { tipoCambio: 'MENOR', versionVigente: '1.0' }));
  assert.deepStrictEqual([p.errores, p.cambios.VERSION, p.cambios.CODIGO, p.cambios.TIPO_CAMBIO], [[], '1.1', 'P-CI04-001', 'MENOR']);
  const sinControl = gs.planVoBo_(Object.assign({}, fila, { DESCRIPCION_CAMBIO: '' }), paola, det, 'h', [], '', [], '', new Date(), { tipoCambio: 'MAYOR', versionVigente: '1.0' });
  assert.ok(/control de cambios/.test(sinControl.errores.join()));
});

test('autorizada en CH: el mismo renglón del inventario pasa a la versión nueva y el historial lleva motivos y descripción', function () {
  const paola = { registrado: true, idUsuario: 'USR-0004', nombre: 'Paola', perfiles: ['REVISOR'] };
  const fila = { ID_SOLICITUD: 'SOL-5', TIPO_SOLICITUD: 'ACTUALIZACION', ID_DOCUMENTO: 'DOC-0001', NOMBRE_DOCUMENTO: 'Alta', ESTADO: 'EN_AUTORIZACION_CH',
    ELABORO_ID: 'USR-0002', ELABORO_NOMBRE: 'Ana', CODIGO: 'P-CI04-001', VERSION: '1.1', MOTIVOS_CAMBIO: '["ACTIVIDADES_AGREGADAS"]', DESCRIPCION_CAMBIO: 'Paso nuevo' };
  const envio = { FECHA_ENVIO: new Date(2026, 9, 24), RESULTADO: 'PENDIENTE' };
  const p = plano(gs.planResultadoCH_(fila, paola, envio, { resultado: 'AUTORIZADO', nombre: 'Lic. Soto', puesto: 'Director', fecha: '2026-10-27' },
    new Date(2026, 9, 28, 12), 'p@cm.com'));
  assert.deepStrictEqual([p.errores, p.documento, p.documentoCambios.VERSION_VIGENTE, p.documentoCambios.ID_SOLICITUD_VIGENTE], [[], null, '1.1', 'SOL-5']);
  assert.deepStrictEqual([p.historial.VERSION, p.historial.MOTIVOS, p.historial.DESCRIPCION], ['1.1', 'Se agregaron actividades', 'Paso nuevo']);
});

test('documento: control de cambios con las versiones anteriores y la actual; versión por asignar antes del Vo.Bo.', function () {
  const det = { nombre: 'Alta', codigo: 'P-CI04-001', tipoDocumento: 'Procedimiento', departamento: 'CI', objetivo: '', alcance: '',
    responsabilidades: [], definiciones: [], actividades: [] };
  const fila = { ID_SOLICITUD: 'SOL-5', TIPO_SOLICITUD: 'ACTUALIZACION', VERSION: '', ELABORO_NOMBRE: 'Ana', DESCRIPCION_CAMBIO: 'Paso nuevo',
    MOTIVOS_CAMBIO: '["ACTIVIDADES_AGREGADAS"]' };
  const historial = [{ VERSION: '0.0', FECHA: new Date(2026, 5, 1), DESCRIPCION: 'Emisión inicial del documento.', RESPONSABLE: 'Luis', ID_SOLICITUD: 'SOL-1' },
    { VERSION: '1.1', FECHA: new Date(2026, 9, 27), DESCRIPCION: 'esta misma', ID_SOLICITUD: 'SOL-5' }];
  const formatear = function (f, p) { return p === 'MM/yyyy' ? String(f.getMonth() + 1).padStart(2, '0') + '/' + f.getFullYear() : 'x'; };
  const d = plano(gs.datosDocumento_(det, fila, formatear, new Date(2026, 9, 28), historial));
  assert.strictEqual(d.simples.VERSION, 'Por asignar');
  assert.deepStrictEqual(d.cambios, [
    { CAMBIO_VERSION: '0.0', CAMBIO_FECHA: '06/2026', CAMBIO_DESCRIPCION: 'Emisión inicial del documento.', CAMBIO_RESPONSABLE: 'Luis' },
    { CAMBIO_VERSION: 'Por asignar', CAMBIO_FECHA: '10/2026', CAMBIO_DESCRIPCION: 'Paso nuevo (Se agregaron actividades)', CAMBIO_RESPONSABLE: 'Ana' }]);
});
