// Captura (fase 2): opciones y validación de una solicitud nueva, coincidencias de nombre (§2.1),
// permisos, «Mis solicitudes», detalle para la pantalla y guardado del borrador (src/services/Solicitudes.gs).
const test = require('node:test');
const assert = require('node:assert');
const { cargarGs } = require('./cargar-gs');

const gs = cargarGs(['src/config/Config.gs', 'src/config/Catalogos.gs', 'src/utils/Texto.gs', 'src/utils/Huella.gs',
  'src/services/Sesion.gs', 'src/services/Usuarios.gs', 'src/services/Solicitudes.gs'], {}, ['LIMITES_CAPTURA']);
const plano = function (v) { return JSON.parse(JSON.stringify(v)); };

const ANA = { registrado: true, idUsuario: 'USR-0002', nombre: 'Ana López', correo: 'ana@ciudadmaderas.com', perfiles: ['COLABORADOR'] };
const PAOLA = { registrado: true, idUsuario: 'USR-0003', nombre: 'Paola', perfiles: ['REVISOR'] };
const DIEGO = { registrado: true, idUsuario: 'USR-0004', nombre: 'Diego', perfiles: ['SOPORTE_CI'] };
const SOFIA = { registrado: true, idUsuario: 'USR-0005', nombre: 'Sofía', perfiles: ['ADMINISTRADOR'] };

function tablas() {
  return {
    tipos: [
      { ID_TIPO: 'TD-01', NOMBRE: 'Manual', PREFIJO_CODIGO: 'M', ACTIVO: 'SI', EN_SISTEMA: 'NO' },
      { ID_TIPO: 'TD-02', NOMBRE: 'Procedimiento', PREFIJO_CODIGO: 'P', ACTIVO: 'SI', EN_SISTEMA: 'SI' }
    ],
    usuarios: [{ ID_USUARIO: 'USR-0002', NOMBRE: 'Ana López', ID_PUESTO: 'PUE-001' }],
    puestos: [{ ID_PUESTO: 'PUE-001', NOMBRE: 'Analista de Procesos' }],
    usuarioDeptos: [
      { ID_USUARIO: 'USR-0002', ID_DEPARTAMENTO: 'DEP-002', PRINCIPAL: 'NO', ACTIVO: 'SI' },
      { ID_USUARIO: 'USR-0002', ID_DEPARTAMENTO: 'DEP-001', PRINCIPAL: 'SI', ACTIVO: 'SI' }
    ],
    departamentos: [
      { ID_DEPARTAMENTO: 'DEP-001', NOMBRE: 'CONTROL INTERNO', CLAVE_CODIGO: 'CI', ACTIVO: 'SI' },
      { ID_DEPARTAMENTO: 'DEP-002', NOMBRE: 'TI', CLAVE_CODIGO: 'TI', ACTIVO: 'SI' }
    ],
    areas: [
      { ID_AREA: 'ARE-0004', ID_DEPARTAMENTO: 'DEP-001', NOMBRE: 'ANÁLISIS DE DATOS Y PROCESOS', CLAVE_CODIGO: '04', ACTIVO: 'SI' },
      { ID_AREA: 'ARE-0001', ID_DEPARTAMENTO: 'DEP-001', NOMBRE: 'CONTROL INTERNO', CLAVE_CODIGO: '01', ACTIVO: 'SI' },
      { ID_AREA: 'ARE-0009', ID_DEPARTAMENTO: 'DEP-001', NOMBRE: 'VIEJA', CLAVE_CODIGO: '09', ACTIVO: 'NO' }
    ],
    subareas: [{ ID_SUBAREA: 'SUB-0001', ID_AREA: 'ARE-0004', NOMBRE: 'PROCESOS', ACTIVO: 'SI' }]
  };
}
const opciones = function (sesion) { return gs.opcionesNuevaSolicitud_(sesion || ANA, tablas()); };
const valida = { tipoSolicitud: 'NUEVO', idTipo: 'TD-02', nombre: 'Alta de proveedores', idDepartamento: 'DEP-001', idArea: 'ARE-0004', idSubarea: 'SUB-0001' };

// ─────────────────────────────── Nueva solicitud ───────────────────────────────

test('opciones: sus departamentos (el principal primero) con áreas activas y subáreas; elaborador con su puesto', function () {
  const o = plano(opciones());
  assert.deepStrictEqual(o.departamentos.map(function (d) { return d.nombre; }), ['CONTROL INTERNO', 'TI']);
  assert.deepStrictEqual(o.departamentos[0].areas.map(function (a) { return a.cuerpo; }), ['CI01', 'CI04']);
  assert.deepStrictEqual(o.departamentos[0].areas[1].subareas, [{ id: 'SUB-0001', nombre: 'PROCESOS' }]);
  assert.deepStrictEqual(o.elaborador, { nombre: 'Ana López', puesto: 'Analista de Procesos' });
  assert.deepStrictEqual(o.tiposDocumento.map(function (t) { return t.nombre + ':' + t.disponible; }), ['Manual:false', 'Procedimiento:true']);
  assert.deepStrictEqual(o.tiposSolicitud.map(function (t) { return t.id + ':' + t.disponible; }), ['NUEVO:true', 'ACTUALIZACION:false']);
});

test('validar: una solicitud completa pasa', function () {
  assert.deepStrictEqual(plano(gs.validarNuevaSolicitud_(valida, opciones())), []);
});

test('validar: solo Procedimiento y solo documentos nuevos por ahora', function () {
  const e = gs.validarNuevaSolicitud_(Object.assign({}, valida, { idTipo: 'TD-01', tipoSolicitud: 'ACTUALIZACION' }), opciones()).join(' ');
  assert.ok(/fase 7/.test(e) && /Manual.*todavía no se documenta/.test(e));
});

test('validar: nombre, departamento propio, área de ese departamento y subárea de esa área', function () {
  const o = opciones();
  assert.ok(/nombre del documento/.test(gs.validarNuevaSolicitud_(Object.assign({}, valida, { nombre: ' ab ' }), o).join()));
  assert.ok(/departamento/.test(gs.validarNuevaSolicitud_(Object.assign({}, valida, { idDepartamento: 'DEP-999' }), o).join()));
  assert.ok(/área/.test(gs.validarNuevaSolicitud_(Object.assign({}, valida, { idArea: 'ARE-0009' }), o).join()), 'área dada de baja');
  assert.ok(/subárea/.test(gs.validarNuevaSolicitud_(Object.assign({}, valida, { idArea: 'ARE-0001' }), o).join()));
});

test('validar: sin departamentos asignados no se puede crear', function () {
  const sinDeptos = gs.opcionesNuevaSolicitud_({ idUsuario: 'USR-0099', nombre: 'X', perfiles: ['COLABORADOR'] }, tablas());
  assert.ok(/No tienes departamentos asignados/.test(gs.validarNuevaSolicitud_(valida, sinDeptos).join()));
});

// ─────────────────────────────── Coincidencias ───────────────────────────────

test('palabras clave: sin acentos, sin palabras vacías y sin plural', function () {
  assert.deepStrictEqual(plano(gs.palabrasClave_('Procedimiento de Altas de los Proveedores')), ['alta', 'proveedor']);
});

test('coincidencias: encuentra documentos vigentes y solicitudes en curso parecidas, la más parecida primero', function () {
  const documentos = [
    { ID_DOCUMENTO: 'DOC-1', CODIGO: 'P-C01-003', NOMBRE: 'Alta de proveedor', ESTATUS: 'VIGENTE' },
    { ID_DOCUMENTO: 'DOC-2', CODIGO: 'P-C01-004', NOMBRE: 'Alta de proveedores nacionales', ESTATUS: 'OBSOLETO' },
    { ID_DOCUMENTO: 'DOC-3', CODIGO: 'P-TI01-001', NOMBRE: 'Respaldo de servidores', ESTATUS: 'VIGENTE' }
  ];
  const solicitudes = [
    { ID_SOLICITUD: 'SOL-2026-0001', NOMBRE_DOCUMENTO: 'Registro y alta de proveedores', ESTADO: 'EN_REVISION' },
    { ID_SOLICITUD: 'SOL-2026-0002', NOMBRE_DOCUMENTO: 'Alta de proveedores', ESTADO: 'CANCELADO' }
  ];
  const r = plano(gs.coincidenciasNombre_('Altas de Proveedores', documentos, solicitudes, ''));
  assert.deepStrictEqual(r.map(function (x) { return x.id; }), ['DOC-1', 'SOL-2026-0001']);
  assert.strictEqual(r[0].parecido, 1);
  assert.strictEqual(r[1].estado, 'En revisión de Procesos');
  assert.deepStrictEqual(plano(gs.coincidenciasNombre_('Inventario de vehículos', documentos, solicitudes, '')), []);
});

// ─────────────────────────────── Permisos ───────────────────────────────

const FILA = {
  _fila: 2, ID_SOLICITUD: 'SOL-2026-0001', TIPO_SOLICITUD: 'NUEVO', ID_TIPO: 'TD-02', NOMBRE_DOCUMENTO: 'Alta de proveedores',
  ID_DEPARTAMENTO: 'DEP-001', ID_AREA: 'ARE-0004', ID_SUBAREA: 'SUB-0001', ESTADO: 'BORRADOR', ELABORO_ID: 'USR-0002',
  ELABORO_NOMBRE: 'Ana López', ELABORO_PUESTO: 'Analista de Procesos', INICIO_PROCESO: 'Cuando llega la solicitud',
  FIN_PROCESO: '', FECHA_ACTUALIZACION: new Date(2026, 9, 20, 10, 0, 0), FECHA_ELABORACION: new Date(2026, 9, 20, 9, 0, 0)
};
const conEstado = function (estado) { return Object.assign({}, FILA, { ESTADO: estado }); };

test('permisos: la elaboradora edita su borrador; revisor y Soporte CI solo ven; el administrador no ve', function () {
  assert.deepStrictEqual(plano(gs.permisoSolicitud_(ANA, FILA)), { ver: true, editar: true });
  assert.deepStrictEqual(plano(gs.permisoSolicitud_(PAOLA, FILA)), { ver: true, editar: false });
  assert.deepStrictEqual(plano(gs.permisoSolicitud_(DIEGO, FILA)), { ver: true, editar: false });
  assert.deepStrictEqual(plano(gs.permisoSolicitud_(SOFIA, FILA)), { ver: false, editar: false });
  const otraColaboradora = { registrado: true, idUsuario: 'USR-0009', perfiles: ['COLABORADOR'] };
  assert.deepStrictEqual(plano(gs.permisoSolicitud_(otraColaboradora, FILA)), { ver: false, editar: false });
});

test('permisos: se edita en borrador, confirmada o devuelta; en revisión ya no', function () {
  ['BORRADOR', 'CONFIRMADO', 'DEVUELTO'].forEach(function (e) { assert.ok(gs.permisoSolicitud_(ANA, conEstado(e)).editar, e); });
  ['EN_REVISION', 'EN_AUTORIZACION_CH', 'AUTORIZADO', 'CANCELADO', 'NO_PROCEDENTE'].forEach(function (e) {
    assert.ok(!gs.permisoSolicitud_(ANA, conEstado(e)).editar, e);
  });
});

test('cancelar: solo desde borrador, confirmada o devuelta (TRANSICIONES)', function () {
  assert.ok(gs.transicionValida_('BORRADOR', 'CANCELADO'));
  assert.ok(gs.transicionValida_('DEVUELTO', 'CANCELADO'));
  assert.ok(!gs.transicionValida_('EN_REVISION', 'CANCELADO'));
});

// ─────────────────────────────── Mis solicitudes y detalle ───────────────────────────────

test('mis solicitudes: solo las suyas, la más reciente primero, con nombres legibles', function () {
  const filas = [FILA,
    Object.assign({}, FILA, { ID_SOLICITUD: 'SOL-2026-0002', NOMBRE_DOCUMENTO: 'Pagos', ESTADO: 'EN_REVISION', FECHA_ACTUALIZACION: new Date(2026, 9, 21) }),
    Object.assign({}, FILA, { ID_SOLICITUD: 'SOL-2026-0003', ELABORO_ID: 'USR-0009' })];
  const r = plano(gs.resumenSolicitudes_(filas, 'USR-0002', tablas(), function (f) { return f.getDate() + '/' + (f.getMonth() + 1); }));
  assert.deepStrictEqual(r.map(function (x) { return x.id; }), ['SOL-2026-0002', 'SOL-2026-0001']);
  assert.deepStrictEqual([r[0].nombreEstado, r[0].editable, r[1].editable], ['En revisión de Procesos', false, true]);
  assert.deepStrictEqual([r[1].tipoDocumento, r[1].departamento, r[1].area, r[1].actualizada],
    ['Procedimiento', 'CONTROL INTERNO', 'ANÁLISIS DE DATOS Y PROCESOS', '20/10']);
});

const ACTIVIDADES = [
  { _fila: 2, ID_ACTIVIDAD: 'ACT-000001', ID_SOLICITUD: 'SOL-2026-0001', ORDEN: '2', TEXTO_ORIGINAL: 'Captura en SAP', PUESTO_TEXTO: '', ELIMINADA: 'NO' },
  { _fila: 3, ID_ACTIVIDAD: 'ACT-000002', ID_SOLICITUD: 'SOL-2026-0001', ORDEN: '1', TEXTO_ORIGINAL: 'Recibe la solicitud', PUESTO_TEXTO: 'Auxiliar de compras', ELIMINADA: 'NO' },
  { _fila: 4, ID_ACTIVIDAD: 'ACT-000003', ID_SOLICITUD: 'SOL-2026-0001', ORDEN: '3', TEXTO_ORIGINAL: 'borrada', PUESTO_TEXTO: '', ELIMINADA: 'SI' },
  { _fila: 5, ID_ACTIVIDAD: 'ACT-000004', ID_SOLICITUD: 'SOL-2026-0009', ORDEN: '1', TEXTO_ORIGINAL: 'de otra', PUESTO_TEXTO: '', ELIMINADA: 'NO' }
];
const IMAGENES = [
  { _fila: 2, ID_IMAGEN: 'IMG-000001', ID_ACTIVIDAD: 'ACT-000002', ID_SOLICITUD: 'SOL-2026-0001', ORDEN: '2', PIE: 'Correo', ELIMINADA: 'NO', ANCHO: '1600', ALTO: '900' },
  { _fila: 3, ID_IMAGEN: 'IMG-000002', ID_ACTIVIDAD: 'ACT-000002', ID_SOLICITUD: 'SOL-2026-0001', ORDEN: '1', PIE: '', ELIMINADA: 'NO', ANCHO: '1080', ALTO: '2400' },
  { _fila: 4, ID_IMAGEN: 'IMG-000003', ID_ACTIVIDAD: 'ACT-000001', ID_SOLICITUD: 'SOL-2026-0001', ORDEN: '1', PIE: '', ELIMINADA: 'SI' }
];

test('detalle: actividades vivas en su orden, cada una con sus imágenes vivas en orden', function () {
  const d = plano(gs.detalleSolicitud_(FILA, ACTIVIDADES, IMAGENES, tablas(), { editar: true }, function () { return 'hoy'; }));
  assert.deepStrictEqual(d.actividades.map(function (a) { return a.id; }), ['ACT-000002', 'ACT-000001']);
  assert.deepStrictEqual(d.actividades[0].imagenes.map(function (i) { return i.id; }), ['IMG-000002', 'IMG-000001']);
  assert.deepStrictEqual(d.actividades[1].imagenes, []);
  assert.deepStrictEqual([d.cuerpo, d.subarea, d.prefijo, d.puedeEditar, d.fechaElaboracion], ['CI04', 'PROCESOS', 'P', true, 'hoy']);
  assert.strictEqual(d.marca, String(FILA.FECHA_ACTUALIZACION.getTime()));
});

// ─────────────────────────────── Guardar borrador ───────────────────────────────

const MARCA = String(FILA.FECHA_ACTUALIZACION.getTime());
function contenido(cambios) {
  return Object.assign({
    marca: MARCA, inicio: 'Cuando llega la solicitud', fin: '',
    actividades: [
      { id: 'ACT-000002', texto: 'Recibe la solicitud', responsable: 'Auxiliar de compras', imagenes: [{ id: 'IMG-000002', pie: '' }, { id: 'IMG-000001', pie: 'Correo' }] },
      { id: 'ACT-000001', texto: 'Captura en SAP', responsable: '', imagenes: [] }
    ]
  }, cambios);
}
const planGuardar = function (c, fila) { return gs.planGuardarBorrador_(c, fila || FILA, ACTIVIDADES, IMAGENES); };

test('guardar: si nada cambió, no se escribe nada', function () {
  const p = planGuardar(contenido());
  assert.deepStrictEqual(plano(p.errores), []);
  assert.strictEqual(p.sinCambios, true);
});

test('guardar: si la solicitud cambió en otra pestaña, avisa y no escribe', function () {
  const p = planGuardar(contenido({ marca: '123' }));
  assert.strictEqual(p.conflicto, true);
  assert.ok(/otra ventana/.test(p.errores.join()));
});

test('guardar: actividad nueva, texto editado, reordenar y fin del proceso', function () {
  const c = contenido({ fin: 'Cuando el proveedor queda activo' });
  c.actividades = [c.actividades[1], c.actividades[0], { id: '', clave: 'n1', texto: 'Notifica al área', responsable: 'Jefe de compras' }];
  c.actividades[0] = Object.assign({}, c.actividades[0], { texto: 'Captura los datos en SAP' });
  const p = plano(planGuardar(c));
  assert.deepStrictEqual(p.actividadesNuevas, [{ clave: 'n1', ORDEN: '3', TEXTO_ORIGINAL: 'Notifica al área', PUESTO_TEXTO: 'Jefe de compras' }]);
  assert.deepStrictEqual(p.actividadesCambios, [
    { _fila: 2, cambios: { ORDEN: '1', TEXTO_ORIGINAL: 'Captura los datos en SAP', TEXTO_FINAL: '' } },
    { _fila: 3, cambios: { ORDEN: '2' } }
  ]);
  assert.deepStrictEqual(p.solicitud, { FIN_PROCESO: 'Cuando el proveedor queda activo' });
  assert.deepStrictEqual(p.actividadesEliminar, []);
});

test('guardar: la huella se calcula con cómo quedan los renglones, sin releer la hoja', function () {
  const c = contenido();
  c.actividades = [c.actividades[1], { id: '', clave: 'n1', texto: 'Notifica al área', responsable: 'Jefe de compras' }];
  c.actividades[0] = Object.assign({}, c.actividades[0], { texto: 'Captura los datos en SAP' });
  const p = planGuardar(c);
  const nuevas = [{ ID_ACTIVIDAD: 'ACT-000009', ID_SOLICITUD: 'SOL-2026-0001', ORDEN: '2', TEXTO_ORIGINAL: 'Notifica al área', TEXTO_FINAL: '',
    PUESTO_TEXTO: 'Jefe de compras', ELIMINADA: 'NO' }];
  const despues = gs.estadoTrasCambios_(ACTIVIDADES, p.actividadesCambios, p.actividadesEliminar, nuevas);
  const d = plano(gs.detalleSolicitud_(FILA, despues, gs.estadoTrasCambios_(IMAGENES, p.imagenesCambios, p.imagenesEliminar, []),
    tablas(), { editar: false }, function () { return ''; }));
  assert.deepStrictEqual(d.actividades.map(function (a) { return a.id + ':' + a.texto; }),
    ['ACT-000001:Captura los datos en SAP', 'ACT-000009:Notifica al área'], 'ACT-000002 quedó dada de baja');
  assert.strictEqual(ACTIVIDADES[0].ELIMINADA, 'NO', 'no modifica los renglones originales');
});

test('detalle: muestra el texto aceptado de la IA (TEXTO_FINAL) y los textos derivados', function () {
  const acts = ACTIVIDADES.map(function (a) { return Object.assign({}, a); });
  acts[1].TEXTO_FINAL = 'El Auxiliar de Compras recibe la solicitud.';
  const fila = Object.assign({}, FILA, { OBJETIVO: 'Dar de alta proveedores', RESPONSABILIDADES: '["Auxiliar: recibe"]', DEFINICIONES: 'dañado' });
  const d = plano(gs.detalleSolicitud_(fila, acts, IMAGENES, tablas(), { editar: true }, function () { return ''; }));
  assert.strictEqual(d.actividades[0].texto, 'El Auxiliar de Compras recibe la solicitud.');
  assert.deepStrictEqual([d.objetivo, d.responsabilidades, d.definiciones], ['Dar de alta proveedores', ['Auxiliar: recibe'], []]);
});

test('guardar: si edita a mano un texto que había aceptado de la IA, vuelve a ser suyo', function () {
  const acts = ACTIVIDADES.map(function (a) { return Object.assign({}, a); });
  acts[1].TEXTO_FINAL = 'El Auxiliar de Compras recibe la solicitud.';
  const igual = contenido();
  igual.actividades[0] = Object.assign({}, igual.actividades[0], { texto: 'El Auxiliar de Compras recibe la solicitud.' });
  assert.strictEqual(gs.planGuardarBorrador_(igual, FILA, acts, IMAGENES).sinCambios, true, 'el texto aceptado no cuenta como cambio');
  const editado = contenido();
  editado.actividades[0] = Object.assign({}, editado.actividades[0], { texto: 'El auxiliar recibe la solicitud por correo.' });
  const p = plano(gs.planGuardarBorrador_(editado, FILA, acts, IMAGENES));
  assert.deepStrictEqual(p.actividadesCambios, [{ _fila: 3, cambios: { TEXTO_ORIGINAL: 'El auxiliar recibe la solicitud por correo.', TEXTO_FINAL: '' } }]);
});

test('guardar: cambiar el responsable lo deja por confirmar', function () {
  const c = contenido();
  c.actividades[0] = Object.assign({}, c.actividades[0], { responsable: 'Jefe de compras' });
  const p = plano(planGuardar(c));
  assert.deepStrictEqual(p.actividadesCambios, [{ _fila: 3, cambios: { PUESTO_TEXTO: 'Jefe de compras', ID_PUESTO: '', RESPONSABLE_CONFIRMADO: 'NO' } }]);
});

test('guardar: quitar una actividad la marca eliminada junto con sus imágenes (nada se borra)', function () {
  const c = contenido();
  c.actividades = [c.actividades[1]];
  const p = plano(planGuardar(c));
  assert.deepStrictEqual(p.actividadesEliminar, [3]);
  assert.deepStrictEqual(p.imagenesEliminar.sort(), [2, 3]);
});

test('guardar: pies de imagen, orden de las imágenes y quitar una imagen', function () {
  const c = contenido();
  c.actividades[0] = Object.assign({}, c.actividades[0], { imagenes: [{ id: 'IMG-000001', pie: 'Correo de solicitud' }] });
  const p = plano(planGuardar(c));
  assert.deepStrictEqual(p.imagenesCambios, [{ _fila: 2, cambios: { ORDEN: '1', PIE: 'Correo de solicitud' } }]);
  assert.deepStrictEqual(p.imagenesEliminar, [3]);
});

test('guardar: si no llega la lista de imágenes de una actividad, no se borra ninguna', function () {
  const c = contenido();
  c.actividades[0] = { id: 'ACT-000002', texto: 'Recibe la solicitud', responsable: 'Auxiliar de compras' };
  const p = plano(planGuardar(c));
  assert.deepStrictEqual(p.imagenesEliminar, []);
});

test('guardar: editar una solicitud confirmada la regresa a borrador (§3.5)', function () {
  assert.strictEqual(planGuardar(contenido({ fin: 'Otro fin' }), conEstado('CONFIRMADO')).estadoNuevo, 'BORRADOR');
  assert.strictEqual(planGuardar(contenido({ fin: 'Otro fin' }), conEstado('DEVUELTO')).estadoNuevo, '');
  assert.strictEqual(planGuardar(contenido(), conEstado('CONFIRMADO')).estadoNuevo, '', 'sin cambios no se pierde la confirmación');
});

test('guardar: respeta los topes de captura', function () {
  const L = gs.LIMITES_CAPTURA;
  const largo = 'x'.repeat(L.ACTIVIDAD_MAX + 1);
  const c = contenido();
  c.actividades[0] = Object.assign({}, c.actividades[0], { texto: largo });
  assert.ok(/actividad 1 pasa de/.test(planGuardar(c).errores.join()));
  const muchas = contenido({ actividades: Array.from({ length: L.ACTIVIDADES_MAX + 1 }, function (_, i) { return { id: '', clave: 'k' + i, texto: 't' }; }) });
  assert.ok(/máximo es de/.test(planGuardar(muchas).errores.join()));
});

// ─────────────────────────────── Huella ───────────────────────────────

test('huella: cuenta objetivo, alcance, responsabilidades y definiciones', function () {
  const base = { nombre: 'Alta', objetivo: 'A', alcance: 'B', responsabilidades: ['X: y'], definiciones: [], actividades: [] };
  ['objetivo', 'alcance'].forEach(function (k) {
    const otro = Object.assign({}, base); otro[k] = 'cambio';
    assert.notStrictEqual(gs.contenidoCanonico_(base), gs.contenidoCanonico_(otro), k);
  });
  assert.notStrictEqual(gs.contenidoCanonico_(base), gs.contenidoCanonico_(Object.assign({}, base, { definiciones: ['SAP: sistema'] })));
});

test('huella: los espacios de más no cuentan; cambiar un texto, un pie o el orden sí', function () {
  const base = { nombre: 'Alta', inicio: 'Cuando  llega', fin: '', actividades: [{ texto: 'Uno', responsable: '', imagenes: [{ id: 'IMG-1', pie: 'a' }] }, { texto: 'Dos' }] };
  const igual = { nombre: 'Alta ', inicio: 'Cuando llega', fin: '', actividades: [{ texto: ' Uno', responsable: '', imagenes: [{ id: 'IMG-1', pie: 'a' }] }, { texto: 'Dos' }] };
  assert.strictEqual(gs.contenidoCanonico_(base), gs.contenidoCanonico_(igual));
  const otroPie = JSON.parse(JSON.stringify(base)); otroPie.actividades[0].imagenes[0].pie = 'b';
  const otroOrden = JSON.parse(JSON.stringify(base)); otroOrden.actividades.reverse();
  assert.notStrictEqual(gs.contenidoCanonico_(base), gs.contenidoCanonico_(otroPie));
  assert.notStrictEqual(gs.contenidoCanonico_(base), gs.contenidoCanonico_(otroOrden));
});
