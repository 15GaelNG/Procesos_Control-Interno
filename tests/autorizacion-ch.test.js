// Fase 6 (src/services/AutorizacionCH.gs e Inventario.gs): envío a CH, resultado de CH, archivos para
// subir, pantalla «Envíos a CH» e inventario documental.
const test = require('node:test');
const assert = require('node:assert');
const { cargarGs } = require('./cargar-gs');

const gs = cargarGs(['src/config/Config.gs', 'src/config/Catalogos.gs', 'src/utils/Texto.gs', 'src/utils/Huella.gs', 'src/utils/Fechas.gs',
  'src/services/Sesion.gs', 'src/services/Usuarios.gs', 'src/services/Solicitudes.gs', 'src/services/AnalisisSolicitud.gs',
  'src/services/Documentos.gs', 'src/services/Revision.gs', 'src/services/AutorizacionCH.gs', 'src/services/Inventario.gs']);
const plano = function (v) { return JSON.parse(JSON.stringify(v)); };

const ANA = { registrado: true, idUsuario: 'USR-0002', nombre: 'Ana López', perfiles: ['COLABORADOR'] };
const PAOLA = { registrado: true, idUsuario: 'USR-0004', nombre: 'Paola Méndez', perfiles: ['REVISOR'] };
const CARLOS = { registrado: true, idUsuario: 'USR-0005', nombre: 'Carlos Ruiz', perfiles: ['REVISOR', 'COLABORADOR'] };
const SOFIA = { registrado: true, idUsuario: 'USR-0006', nombre: 'Sofía Torres', perfiles: ['ADMINISTRADOR'] };
const AHORA = new Date(2026, 9, 28, 12, 0);
const VOBO = new Date(2026, 9, 23, 10, 0);

function fila(cambios) {
  return Object.assign({ _fila: 2, ID_SOLICITUD: 'SOL-2026-0001', TIPO_SOLICITUD: 'NUEVO', NOMBRE_DOCUMENTO: 'Alta de proveedores',
    ID_TIPO: 'TD-02', ID_DEPARTAMENTO: 'DEP-001', ID_AREA: 'ARE-0004', ID_SUBAREA: '', ESTADO: 'EN_AUTORIZACION_CH', ELABORO_ID: 'USR-0002',
    ELABORO_NOMBRE: 'Ana López', REVISION: '2', REVISOR_ASIGNADO_ID: 'USR-0004', HUELLA_CONFIRMADA: 'h1', CODIGO: 'P-CI04-001', VERSION: '0.0',
    REVISO_ID: 'USR-0004', REVISO_NOMBRE: 'Paola Méndez', REVISO_PUESTO: 'Analista', FECHA_REVISION: VOBO }, cambios);
}
function envio(cambios) {
  return Object.assign({ _fila: 3, ID_ENVIO: 'ENV-000001', ID_SOLICITUD: 'SOL-2026-0001', REVISION: '2', FECHA_ENVIO: new Date(2026, 9, 24),
    ENVIADO_POR: 'paola@ciudadmaderas.com', FOLIO_CH: 'CH-77', RESULTADO: 'PENDIENTE' }, cambios);
}
function archivo(id, cambios) {
  return Object.assign({ ID_ARCHIVO: id, ID_SOLICITUD: 'SOL-2026-0001', TIPO: 'PRELIMINAR', FORMATO: 'PDF', HUELLA_CONTENIDO: 'h1',
    FECHA: new Date(2026, 9, 23, 11, 0), NOMBRE: id, PESO_KB: '80' }, cambios);
}
const FORMATOS = {
  fechaHora: function (f) { return 'fh' + f.getDate(); },
  dia: function (f) { return String(f.getDate()).padStart(2, '0') + '/' + String(f.getMonth() + 1).padStart(2, '0') + '/' + f.getFullYear(); },
  iso: function (f) { return f.getFullYear() + '-' + String(f.getMonth() + 1).padStart(2, '0') + '-' + String(f.getDate()).padStart(2, '0'); }
};
const T = { tipos: [{ ID_TIPO: 'TD-02', NOMBRE: 'Procedimiento' }], departamentos: [{ ID_DEPARTAMENTO: 'DEP-001', NOMBRE: 'CONTROL INTERNO' }],
  areas: [{ ID_AREA: 'ARE-0004', NOMBRE: 'ADyP' }], subareas: [] };

// ─────────────────────────────── Fechas ───────────────────────────────

test('fechas escritas en pantalla: solo días que existen', function () {
  assert.strictEqual(gs.numeroDeDia_(gs.fechaDeTexto_('2026-10-20')), 20261020);
  assert.strictEqual(gs.fechaDeTexto_('2026-02-30'), null);
  assert.strictEqual(gs.fechaDeTexto_('20/10/2026'), null);
  assert.strictEqual(gs.fechaDeTexto_(''), null);
});

// ─────────────────────────────── Quién ───────────────────────────────

test('en CH registra cualquier revisor de Procesos, nunca quien la elaboró ni el administrador', function () {
  assert.ok(gs.puedeOperarCH_(PAOLA, fila()));
  assert.ok(gs.puedeOperarCH_(CARLOS, fila()), 'otro revisor también');
  assert.ok(!gs.puedeOperarCH_(CARLOS, fila({ ELABORO_ID: 'USR-0005' })), 'lo propio no');
  assert.ok(!gs.puedeOperarCH_(SOFIA, fila()));
  assert.ok(!gs.puedeOperarCH_(ANA, fila()));
});

// ─────────────────────────────── Subido a CH ───────────────────────────────

test('subida a CH: con Vo.Bo., una a la vez, fecha entre el Vo.Bo. y hoy', function () {
  const p = plano(gs.planEnvioCH_(fila(), PAOLA, [], { fecha: '2026-10-24', folio: '  CH-77 ' }, AHORA, 'paola@x'));
  assert.deepStrictEqual(p.errores, []);
  assert.deepStrictEqual([p.fila.RESULTADO, p.fila.FOLIO_CH, p.fila.ENVIADO_POR, p.fila.REVISION], ['PENDIENTE', 'CH-77', 'paola@x', '2']);
  assert.strictEqual(new Date(p.fila.FECHA_ENVIO).getDate(), 24);
  const error = function (f, datos, envios) { return gs.planEnvioCH_(f || fila(), PAOLA, envios || [], datos || { fecha: '2026-10-24' }, AHORA, 'p').errores.join(); };
  assert.ok(/Vo.Bo. de Procesos/.test(error(fila({ ESTADO: 'EN_REVISION' }))));
  assert.ok(/falta registrar su resultado/.test(error(null, null, [envio()])));
  assert.ok(/no puede ser futura/.test(error(null, { fecha: '2026-10-29' })));
  assert.ok(/anterior al Vo.Bo./.test(error(null, { fecha: '2026-10-22' })));
  assert.ok(/Escribe la fecha/.test(error(null, { fecha: '' })));
  assert.ok(/Solo Procesos/.test(gs.planEnvioCH_(fila(), ANA, [], { fecha: '2026-10-24' }, AHORA, 'a').errores.join()));
  assert.deepStrictEqual(plano(gs.planEnvioCH_(fila(), PAOLA, [envio({ RESULTADO: 'RECHAZADO' })], { fecha: '2026-10-24' }, AHORA, 'p').errores), [],
    'un envío anterior ya resuelto no estorba');
});

// ─────────────────────────────── Resultado ───────────────────────────────

test('autorizado: la solicitud queda autorizada con quien firmó en CH; entra al inventario y a su historial', function () {
  const p = plano(gs.planResultadoCH_(fila(), PAOLA, envio(), { resultado: 'AUTORIZADO', nombre: ' Lic. Mario Soto ', puesto: 'Director de Finanzas',
    fecha: '2026-10-27', comentario: '' }, AHORA, 'paola@x'));
  assert.deepStrictEqual(p.errores, []);
  assert.deepStrictEqual([p.solicitud.ESTADO, p.solicitud.AUTORIZO_NOMBRE, p.solicitud.AUTORIZO_PUESTO, p.solicitud.VERSION],
    ['AUTORIZADO', 'Lic. Mario Soto', 'Director de Finanzas', '0.0'], 'versión 0.0 hasta su primera actualización (respuesta de Procesos)');
  assert.deepStrictEqual([p.envio.RESULTADO, p.envio.REGISTRADO_POR], ['AUTORIZADO', 'paola@x']);
  assert.deepStrictEqual([p.documento.CODIGO, p.documento.ESTATUS, p.documento.VERSION_VIGENTE, p.documento.ORIGEN, p.documento.ID_SOLICITUD_VIGENTE],
    ['P-CI04-001', 'VIGENTE', '0.0', 'SISTEMA', 'SOL-2026-0001']);
  assert.deepStrictEqual([p.historial.DESCRIPCION, p.historial.AUTORIZO_NOMBRE, p.historial.RESPONSABLE], ['Emisión inicial del documento.', 'Lic. Mario Soto', 'Ana López']);
  assert.strictEqual(new Date(p.solicitud.FECHA_AUTORIZACION).getDate(), 27);
  assert.strictEqual(p.observacion, null);
});

test('autorizado: pide nombre, puesto y una fecha entre el envío y hoy', function () {
  const error = function (datos) { return gs.planResultadoCH_(fila(), PAOLA, envio(), Object.assign({ resultado: 'AUTORIZADO', nombre: 'M', puesto: 'D', fecha: '2026-10-27' }, datos), AHORA, 'p').errores.join(); };
  assert.ok(/quién autorizó/.test(error({ nombre: ' ' })));
  assert.ok(/puesto/.test(error({ puesto: '' })));
  assert.ok(/anterior al envío/.test(error({ fecha: '2026-10-23' })));
  assert.ok(/futura/.test(error({ fecha: '2026-11-02' })));
  assert.ok(/Primero registra que la subiste/.test(gs.planResultadoCH_(fila(), PAOLA, null, { resultado: 'AUTORIZADO' }, AHORA, 'p').errores.join()));
  assert.ok(/Elige si CH/.test(gs.planResultadoCH_(fila(), PAOLA, envio(), { resultado: '' }, AHORA, 'p').errores.join()));
});

test('rechazado: regresa al colaborador como observación, sin el Vo.Bo. pero con su código', function () {
  const p = plano(gs.planResultadoCH_(fila(), CARLOS, envio(), { resultado: 'RECHAZADO', comentario: 'El director pide incluir el plazo de pago.' }, AHORA, 'carlos@x'));
  assert.deepStrictEqual(p.errores, []);
  assert.deepStrictEqual([p.solicitud.ESTADO, p.solicitud.REVISO_NOMBRE, p.solicitud.FECHA_REVISION, p.solicitud.CODIGO], ['DEVUELTO', '', '', undefined],
    'el código no se toca');
  assert.deepStrictEqual([p.envio.RESULTADO, p.envio.COMENTARIO], ['RECHAZADO', 'El director pide incluir el plazo de pago.']);
  assert.deepStrictEqual([p.observacion.APARTADO, p.observacion.ESTADO, p.observacion.AUTOR_NOMBRE, p.observacion.REVISION], ['GENERAL', 'ABIERTA', 'Carlos Ruiz', '2']);
  assert.ok(/^Rechazado en el sistema CH: El director/.test(p.observacion.TEXTO));
  assert.ok(/motivo del rechazo/.test(gs.planResultadoCH_(fila(), PAOLA, envio(), { resultado: 'RECHAZADO', comentario: ' ' }, AHORA, 'p').errores.join()));
});

test('tras un rechazo en CH, el nuevo Vo.Bo. conserva el código que ya tenía', function () {
  const devuelta = fila({ ESTADO: 'EN_REVISION', HUELLA_CONFIRMADA: 'h2' });
  const det = { prefijo: 'P', cuerpo: 'CI04' };
  const p = plano(gs.planVoBo_(devuelta, PAOLA, det, 'h2', [], 'P-CI04-009', ['P-CI04-001'], 'Analista', AHORA));
  assert.deepStrictEqual([p.errores, p.cambios.CODIGO], [[], 'P-CI04-001']);
  assert.ok(!gs.codigoEditable_(devuelta));
  assert.ok(gs.codigoEditable_(fila({ CODIGO: '' })));
});

// ─────────────────────────────── Archivos y pantalla ───────────────────────────────

test('archivos para CH: los preliminares generados después del Vo.Bo., del contenido confirmado; el más reciente de cada formato', function () {
  const archivos = [
    archivo('A1', { FECHA: new Date(2026, 9, 22) }),                       // antes del Vo.Bo.: sin código
    archivo('A2'), archivo('A3', { FORMATO: 'DOCX' }),
    archivo('A4', { FECHA: new Date(2026, 9, 25) }),                       // más reciente
    archivo('A5', { HUELLA_CONTENIDO: 'otra', FECHA: new Date(2026, 9, 26) }),
    archivo('A6', { TIPO: 'FINAL', FECHA: new Date(2026, 9, 27) }),
    archivo('A7', { ID_SOLICITUD: 'OTRA' })
  ];
  assert.deepStrictEqual(plano(gs.archivosParaCH_(archivos, fila())).map(function (a) { return a.ID_ARCHIVO; }), ['A4', 'A3']);
  assert.deepStrictEqual(plano(gs.archivosFinales_(archivos, 'SOL-2026-0001')).map(function (a) { return a.ID_ARCHIVO; }), ['A6']);
  assert.deepStrictEqual(plano(gs.archivosParaCH_(archivos, fila({ FECHA_REVISION: '' }))), [], 'sin Vo.Bo. no hay nada que subir');
});

test('pantalla «Envíos a CH»: por subir, en CH (con su envío) y resueltas (lo más reciente primero)', function () {
  const filas = [
    fila({ ID_SOLICITUD: 'S-1' }),
    fila({ ID_SOLICITUD: 'S-2' }),
    fila({ ID_SOLICITUD: 'S-3', ESTADO: 'AUTORIZADO' }),
    fila({ ID_SOLICITUD: 'S-4', ESTADO: 'DEVUELTO' }),
    fila({ ID_SOLICITUD: 'S-5', ESTADO: 'EN_REVISION' })
  ];
  const envios = [envio({ ID_SOLICITUD: 'S-2' }),
    envio({ ID_ENVIO: 'E-3', ID_SOLICITUD: 'S-3', RESULTADO: 'AUTORIZADO', AUTORIZO_NOMBRE: 'Mario', FECHA_REGISTRO: new Date(2026, 9, 26) }),
    envio({ ID_ENVIO: 'E-4', ID_SOLICITUD: 'S-4', RESULTADO: 'RECHAZADO', COMENTARIO: 'No', FECHA_REGISTRO: new Date(2026, 9, 27) })];
  const g = plano(gs.enviosCH_(filas, envios, [archivo('A1', { ID_SOLICITUD: 'S-1' })], T, PAOLA, FORMATOS, AHORA, 50));
  const ids = function (l) { return l.map(function (x) { return x.id; }); };
  assert.deepStrictEqual([ids(g.porSubir), ids(g.enCH), ids(g.resueltas)], [['S-1'], ['S-2'], ['S-4', 'S-3']]);
  assert.deepStrictEqual([g.porSubir[0].archivos.length, g.porSubir[0].voboIso, g.enCH[0].envio.folio, g.enCH[0].envio.fechaIso, g.hoyIso],
    [1, '2026-10-23', 'CH-77', '2026-10-24', '2026-10-28']);
  assert.deepStrictEqual([g.resueltas[1].envio.autorizo, g.resueltas[1].faltaFinal, g.resueltas[0].faltaFinal], ['Mario', true, false]);
  assert.strictEqual(plano(gs.enviosCH_(filas, envios, [], T, PAOLA, FORMATOS, AHORA, 1)).resueltas.length, 1);
});

// ─────────────────────────────── Inventario ───────────────────────────────

test('inventario: por código, con su historial (lo más reciente primero) y solo archivos que existen', function () {
  const documentos = [
    { ID_DOCUMENTO: 'DOC-0002', CODIGO: 'P-CI04-002', NOMBRE: 'Pago', ID_TIPO: 'TD-02', ID_DEPARTAMENTO: 'DEP-001', ID_AREA: 'ARE-0004',
      VERSION_VIGENTE: '0.0', FECHA_VIGENCIA: new Date(2026, 9, 27), ESTATUS: 'VIGENTE', ORIGEN: 'SISTEMA', ID_ARCHIVO_PDF: 'ARC-9', ID_ARCHIVO_WORD: 'ARC-X' },
    { ID_DOCUMENTO: 'DOC-0001', CODIGO: 'P-CI04-001', NOMBRE: 'Alta', ID_TIPO: 'TD-02', ID_DEPARTAMENTO: 'DEP-001', ID_AREA: 'ARE-0004',
      VERSION_VIGENTE: '1.0', ESTATUS: 'VIGENTE', ORIGEN: 'HISTORICO' }
  ];
  const historial = [
    { ID_DOCUMENTO: 'DOC-0001', VERSION: '0.0', FECHA: new Date(2025, 0, 1), DESCRIPCION: 'Emisión' },
    { ID_DOCUMENTO: 'DOC-0001', VERSION: '1.0', FECHA: new Date(2026, 0, 1), DESCRIPCION: 'Cambio mayor' }
  ];
  const l = plano(gs.inventario_(documentos, historial, [{ ID_ARCHIVO: 'ARC-9' }], T, FORMATOS));
  assert.deepStrictEqual(l.map(function (d) { return d.codigo; }), ['P-CI04-001', 'P-CI04-002']);
  assert.deepStrictEqual(l[0].historial.map(function (h) { return h.version; }), ['1.0', '0.0']);
  assert.deepStrictEqual([l[0].origen, l[1].origen, l[1].vigencia, l[1].tipoDocumento], ['Inventario anterior', 'Elaborado en el sistema', '27/10/2026', 'Procedimiento']);
  assert.deepStrictEqual([l[1].pdf, l[1].docx], ['ARC-9', ''], 'un ID que no está en Archivos no se ofrece');
});
