// Fase 4 (src/services/Documentos.gs): qué datos van a la plantilla, quién puede generar el preliminar,
// nombres de archivo y la lista de archivos generados.
const test = require('node:test');
const assert = require('node:assert');
const { cargarGs } = require('./cargar-gs');

const gs = cargarGs(['src/config/Config.gs', 'src/config/Catalogos.gs', 'src/utils/Texto.gs', 'src/utils/Huella.gs',
  'src/services/Sesion.gs', 'src/services/Usuarios.gs', 'src/services/Solicitudes.gs', 'src/services/AnalisisSolicitud.gs',
  'src/services/Documentos.gs'], {}, ['MARCADORES_PLANTILLA']);
const plano = function (v) { return JSON.parse(JSON.stringify(v)); };
const formatear = function (f, p) {
  const dd = String(f.getDate()).padStart(2, '0'), mm = String(f.getMonth() + 1).padStart(2, '0');
  return p === 'MM/yyyy' ? mm + '/' + f.getFullYear() : dd + '/' + mm + '/' + f.getFullYear();
};
const AHORA = new Date(2026, 9, 22, 11, 0);

const FILA = { ID_SOLICITUD: 'SOL-2026-0001', TIPO_SOLICITUD: 'NUEVO', ESTADO: 'CONFIRMADO', ELABORO_ID: 'USR-0002',
  ELABORO_NOMBRE: 'Ana López', ELABORO_PUESTO: 'Analista de Procesos', FECHA_ELABORACION: new Date(2026, 9, 20, 9, 0), VERSION: '' };
const DET = {
  id: 'SOL-2026-0001', nombre: 'Alta de proveedores', codigo: '', tipoDocumento: 'Procedimiento', departamento: 'COMPRAS',
  objetivo: 'Dar de alta proveedores.', alcance: 'Desde la solicitud hasta el alta.', responsabilidades: ['Auxiliar de Compras: recibe'], definiciones: [],
  actividades: [
    { id: 'ACT-1', texto: 'Recibe la solicitud.', responsable: 'Auxiliar de Compras', imagenes: [{ id: 'IMG-1', pie: 'Bandeja' }] },
    { id: 'ACT-2', texto: '  ', responsable: '', imagenes: [] },
    { id: 'ACT-3', texto: 'Autoriza el alta.', responsable: 'Jefe de Compras', imagenes: [] }
  ]
};

test('datos del documento: cubren TODOS los marcadores de la plantilla (contrato con Procedimiento.docx)', function () {
  const d = plano(gs.datosDocumento_(DET, FILA, formatear, AHORA));
  assert.deepStrictEqual(Object.keys(d.simples).sort(), plano(gs.MARCADORES_PLANTILLA.simples).sort());
  assert.deepStrictEqual(Object.keys(d.listas).sort(), plano(gs.MARCADORES_PLANTILLA.listas).sort());
});

test('datos del documento nuevo: versión 0.0, código por asignar, emisión inicial y firmas pendientes vacías', function () {
  const s = plano(gs.datosDocumento_(DET, FILA, formatear, AHORA)).simples;
  assert.deepStrictEqual([s.NOMBRE_PORTADA, s.CODIGO, s.VERSION, s.FECHA_ACTUALIZACION], ['ALTA DE PROVEEDORES', 'Por asignar', '0.0', '10/2026']);
  assert.deepStrictEqual([s.ELABORO_NOMBRE, s.ELABORO_PUESTO, s.FECHA_ELABORACION], ['Ana López', 'Analista de Procesos', '20/10/2026']);
  assert.deepStrictEqual([s.REVISO_NOMBRE, s.FECHA_REVISION, s.AUTORIZO_NOMBRE, s.FECHA_AUTORIZACION], ['', '', '', '']);
  assert.deepStrictEqual([s.CAMBIO_VERSION, s.CAMBIO_DESCRIPCION, s.CAMBIO_RESPONSABLE], ['0.0', 'Emisión inicial del documento.', 'Ana López']);
});

test('datos del documento: con código y revisión de Procesos, se usan', function () {
  const fila = Object.assign({}, FILA, { VERSION: '0.0', REVISO_NOMBRE: 'Paola Méndez', REVISO_PUESTO: 'Analista', FECHA_REVISION: new Date(2026, 9, 25) });
  const s = plano(gs.datosDocumento_(Object.assign({}, DET, { codigo: 'P-CI04-001' }), fila, formatear, AHORA)).simples;
  assert.deepStrictEqual([s.CODIGO, s.REVISO_NOMBRE, s.FECHA_REVISION], ['P-CI04-001', 'Paola Méndez', '25/10/2026']);
});

test('datos del documento: puestos involucrados, listas y actividades con texto (con sus imágenes)', function () {
  const d = plano(gs.datosDocumento_(DET, FILA, formatear, AHORA));
  assert.deepStrictEqual(d.listas, { PUESTOS: ['Auxiliar de Compras', 'Jefe de Compras'], RESPONSABILIDADES: ['Auxiliar de Compras: recibe'], DEFINICIONES: [] });
  assert.deepStrictEqual(d.actividades, [
    { responsable: 'Auxiliar de Compras', descripcion: 'Recibe la solicitud.', imagenes: [{ idImagen: 'IMG-1', pie: 'Bandeja' }] },
    { responsable: 'Jefe de Compras', descripcion: 'Autoriza el alta.', imagenes: [] }
  ]);
});

test('quién genera el preliminar: el colaborador ya confirmado; Procesos al revisar; nadie más', function () {
  const ana = { registrado: true, idUsuario: 'USR-0002', perfiles: ['COLABORADOR'] };
  const paola = { registrado: true, idUsuario: 'USR-0003', perfiles: ['REVISOR'] };
  const diego = { registrado: true, idUsuario: 'USR-0004', perfiles: ['SOPORTE_CI'] };
  const estado = function (e) { return Object.assign({}, FILA, { ESTADO: e }); };
  assert.ok(gs.puedeGenerarPreliminar_(ana, estado('CONFIRMADO')));
  assert.ok(!gs.puedeGenerarPreliminar_(ana, estado('BORRADOR')), 'antes de confirmar no');
  assert.ok(!gs.puedeGenerarPreliminar_(ana, estado('EN_REVISION')));
  assert.ok(gs.puedeGenerarPreliminar_(paola, estado('EN_REVISION')));
  assert.ok(gs.puedeGenerarPreliminar_(paola, estado('EN_AUTORIZACION_CH')));
  assert.ok(!gs.puedeGenerarPreliminar_(paola, estado('CONFIRMADO')));
  const carlos = { registrado: true, idUsuario: 'USR-0002', perfiles: ['COLABORADOR', 'REVISOR'] };
  assert.ok(!gs.puedeGenerarPreliminar_(carlos, estado('EN_REVISION')), 'Procesos no genera lo que él mismo elaboró');
  assert.ok(!gs.puedeGenerarPreliminar_(diego, estado('EN_REVISION')), 'Soporte CI solo consulta');
});

test('nombre de archivo: código o folio, nombre limpio, tipo y fecha', function () {
  assert.strictEqual(gs.nombreArchivo_({ id: 'SOL-2026-0001', codigo: '', nombre: 'Alta / baja: "proveedores"?' }, 'PRELIMINAR', '2026-10-22 11.00'),
    'SOL-2026-0001 Alta baja proveedores - Preliminar (2026-10-22 11.00)');
  assert.strictEqual(gs.nombreArchivo_({ id: 'x', codigo: 'P-CI04-001', nombre: 'Alta' }, 'FINAL', 's'), 'P-CI04-001 Alta - Final (s)');
});

test('archivos: el más reciente primero y marcados como desactualizados si cambió el contenido', function () {
  const filas = [
    { ID_ARCHIVO: 'ARC-1', ID_SOLICITUD: 'SOL-2026-0001', TIPO: 'PRELIMINAR', FORMATO: 'PDF', HUELLA_CONTENIDO: 'vieja', FECHA: new Date(2026, 9, 21), CON_MARCA_AGUA: 'SI', NOMBRE: 'a.pdf', PESO_KB: '120' },
    { ID_ARCHIVO: 'ARC-3', ID_SOLICITUD: 'SOL-2026-0001', TIPO: 'PRELIMINAR', FORMATO: 'PDF', HUELLA_CONTENIDO: 'nueva', FECHA: new Date(2026, 9, 22), CON_MARCA_AGUA: 'SI', NOMBRE: 'b.pdf' },
    { ID_ARCHIVO: 'ARC-4', ID_SOLICITUD: 'SOL-2026-0001', TIPO: 'PRELIMINAR', FORMATO: 'DOCX', HUELLA_CONTENIDO: 'nueva', FECHA: new Date(2026, 9, 22), CON_MARCA_AGUA: 'SI', NOMBRE: 'b.docx' },
    { ID_ARCHIVO: 'ARC-9', ID_SOLICITUD: 'SOL-2026-0009', HUELLA_CONTENIDO: 'nueva', FECHA: new Date(2026, 9, 23) }
  ];
  const r = plano(gs.archivosSolicitud_(filas, 'SOL-2026-0001', 'nueva', function () { return 'f'; }));
  assert.deepStrictEqual(r.map(function (a) { return a.id + ':' + a.vigente; }), ['ARC-4:true', 'ARC-3:true', 'ARC-1:false']);
  assert.deepStrictEqual([r[2].pesoKb, r[2].conMarca], [120, true]);
});
