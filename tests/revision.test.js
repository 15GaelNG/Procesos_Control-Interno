// Fase 5 (src/services/Revision.gs): envío, bandeja, tomar/reasignar, observaciones, devolver,
// código y Vo.Bo. de Procesos.
const test = require('node:test');
const assert = require('node:assert');
const { cargarGs } = require('./cargar-gs');

const gs = cargarGs(['src/config/Config.gs', 'src/config/Catalogos.gs', 'src/utils/Texto.gs', 'src/utils/Huella.gs',
  'src/services/Sesion.gs', 'src/services/Usuarios.gs', 'src/services/Solicitudes.gs', 'src/services/AnalisisSolicitud.gs',
  'src/services/Documentos.gs', 'src/services/Revision.gs']);
const plano = function (v) { return JSON.parse(JSON.stringify(v)); };

const ANA = { registrado: true, idUsuario: 'USR-0002', nombre: 'Ana López', correo: 'ana@ciudadmaderas.com', perfiles: ['COLABORADOR'] };
const PAOLA = { registrado: true, idUsuario: 'USR-0004', nombre: 'Paola Méndez', perfiles: ['REVISOR'] };
const CARLOS = { registrado: true, idUsuario: 'USR-0005', nombre: 'Carlos Ruiz', perfiles: ['REVISOR', 'COLABORADOR'] };
const SOFIA = { registrado: true, idUsuario: 'USR-0006', nombre: 'Sofía Torres', perfiles: ['ADMINISTRADOR'] };
const AHORA = new Date(2026, 9, 23, 12, 0);

function fila(cambios) {
  return Object.assign({ _fila: 2, ID_SOLICITUD: 'SOL-2026-0001', TIPO_SOLICITUD: 'NUEVO', NOMBRE_DOCUMENTO: 'Alta de proveedores',
    ID_TIPO: 'TD-02', ID_DEPARTAMENTO: 'DEP-001', ID_AREA: 'ARE-0004', ESTADO: 'EN_REVISION', ELABORO_ID: 'USR-0002', ELABORO_NOMBRE: 'Ana López',
    REVISION: '1', REVISOR_ASIGNADO_ID: 'USR-0004', HUELLA_CONFIRMADA: 'h1', FECHA_ENVIO_REVISION: new Date(2026, 9, 20, 9, 0), CODIGO: '', VERSION: '' }, cambios);
}
const DET = { id: 'SOL-2026-0001', nombre: 'Alta de proveedores', prefijo: 'P', cuerpo: 'CI04', codigo: '', version: '',
  actividades: [{ id: 'ACT-1', texto: 'Recibe', responsable: 'Auxiliar', imagenes: [{ id: 'IMG-1', pie: 'x' }] }, { id: 'ACT-2', texto: 'Autoriza', responsable: 'Jefe', imagenes: [] }] };
function obs(estado, cambios) {
  return Object.assign({ _fila: 7, ID_OBSERVACION: 'OBS-1', ID_SOLICITUD: 'SOL-2026-0001', REVISION: '1', APARTADO: 'OBJETIVO', ESTADO: estado, TEXTO: 't' }, cambios);
}

// ─────────────────────────────── Envío ───────────────────────────────

test('enviar: solo confirmada, con el contenido confirmado y sin observaciones abiertas; sube la vuelta de revisión', function () {
  const confirmada = fila({ ESTADO: 'CONFIRMADO', REVISION: '0' });
  assert.deepStrictEqual(plano(gs.planEnvio_(confirmada, 'h1', [])), { errores: [], cambios: { ESTADO: 'EN_REVISION', REVISION: '1' } });
  assert.ok(/vuelve a confirmar/.test(gs.planEnvio_(confirmada, 'otra', []).errores.join()));
  assert.ok(/Falta atender 1 observación/.test(gs.planEnvio_(confirmada, 'h1', [obs('ABIERTA')]).errores.join()));
  assert.deepStrictEqual(plano(gs.planEnvio_(fila({ ESTADO: 'CONFIRMADO', REVISION: '1' }), 'h1', [obs('ATENDIDA')]).cambios), { ESTADO: 'EN_REVISION', REVISION: '2' });
  assert.ok(/Primero confirma/.test(gs.planEnvio_(fila({ ESTADO: 'BORRADOR' }), 'h1', []).errores.join()));
});

test('instantánea: guarda el contenido completo de la vuelta', function () {
  const i = plano(gs.instantanea_(Object.assign({}, DET, { inicio: 'a', fin: 'b', objetivo: 'o', alcance: 'l', responsabilidades: [], definiciones: [] }), '2', 'ENVIO'));
  assert.deepStrictEqual([i.folio, i.revision, i.motivo, i.actividades[0].numero, i.actividades[0].imagenes[0].pie], ['SOL-2026-0001', '2', 'ENVIO', 1, 'x']);
});

// ─────────────────────────────── Bandeja ───────────────────────────────

const T = { tipos: [{ ID_TIPO: 'TD-02', NOMBRE: 'Procedimiento' }], departamentos: [{ ID_DEPARTAMENTO: 'DEP-001', NOMBRE: 'CONTROL INTERNO' }],
  areas: [{ ID_AREA: 'ARE-0004', NOMBRE: 'ADyP' }] };
const USUARIOS = [{ ID_USUARIO: 'USR-0004', NOMBRE: 'Paola Méndez', ACTIVO: 'SI' }, { ID_USUARIO: 'USR-0005', NOMBRE: 'Carlos Ruiz', ACTIVO: 'SI' },
  { ID_USUARIO: 'USR-0002', NOMBRE: 'Ana López', ACTIVO: 'SI' }];

test('bandeja: sin asignar, mías, de otros, devueltas y en CH; lo más antiguo primero', function () {
  const filas = [
    fila({ ID_SOLICITUD: 'S-1', REVISOR_ASIGNADO_ID: '' }),
    fila({ ID_SOLICITUD: 'S-2', REVISOR_ASIGNADO_ID: '', FECHA_ENVIO_REVISION: new Date(2026, 9, 10) }),
    fila({ ID_SOLICITUD: 'S-3' }),
    fila({ ID_SOLICITUD: 'S-4', REVISOR_ASIGNADO_ID: 'USR-0005' }),
    fila({ ID_SOLICITUD: 'S-5', ESTADO: 'DEVUELTO' }),
    fila({ ID_SOLICITUD: 'S-6', ESTADO: 'EN_AUTORIZACION_CH' }),
    fila({ ID_SOLICITUD: 'S-7', ESTADO: 'BORRADOR' })
  ];
  const g = plano(gs.bandejaRevision_(filas, PAOLA, T, USUARIOS, function () { return 'f'; }, AHORA));
  const ids = function (l) { return l.map(function (x) { return x.id; }); };
  assert.deepStrictEqual([ids(g.sinAsignar), ids(g.mias), ids(g.otros), ids(g.devueltas), ids(g.enCH)],
    [['S-2', 'S-1'], ['S-3'], ['S-4'], ['S-5'], ['S-6']]);
  assert.deepStrictEqual([g.sinAsignar[0].dias, g.otros[0].revisor, g.mias[0].departamento], [13, 'Carlos Ruiz', 'CONTROL INTERNO']);
});

test('tomar: solo revisores, nunca lo propio, solo en revisión y si nadie más la tiene', function () {
  assert.deepStrictEqual(plano(gs.planTomar_(fila({ REVISOR_ASIGNADO_ID: '' }), PAOLA, USUARIOS)), []);
  assert.ok(/tú elaboraste/.test(gs.planTomar_(fila({ REVISOR_ASIGNADO_ID: '', ELABORO_ID: 'USR-0005' }), CARLOS, USUARIOS).join()));
  assert.ok(/Ya la tiene Carlos Ruiz/.test(gs.planTomar_(fila({ REVISOR_ASIGNADO_ID: 'USR-0005' }), PAOLA, USUARIOS).join()));
  assert.ok(/Solo un revisor/.test(gs.planTomar_(fila({ REVISOR_ASIGNADO_ID: '' }), ANA, USUARIOS).join()));
  assert.ok(/Solo se toman/.test(gs.planTomar_(fila({ REVISOR_ASIGNADO_ID: '', ESTADO: 'DEVUELTO' }), PAOLA, USUARIOS).join()));
});

test('reasignar: a un revisor activo que no la elaboró, o de regreso a sin asignar', function () {
  const revisores = plano(gs.revisoresActivos_(USUARIOS, [{ ID_USUARIO: 'USR-0004', PERFIL: 'REVISOR', ACTIVO: 'SI' },
    { ID_USUARIO: 'USR-0005', PERFIL: 'REVISOR', ACTIVO: 'SI' }, { ID_USUARIO: 'USR-0002', PERFIL: 'COLABORADOR', ACTIVO: 'SI' }]));
  assert.deepStrictEqual(revisores.map(function (r) { return r.nombre; }), ['Carlos Ruiz', 'Paola Méndez']);
  assert.deepStrictEqual(plano(gs.planReasignar_(fila(), 'USR-0005', revisores)), []);
  assert.deepStrictEqual(plano(gs.planReasignar_(fila(), '', revisores)), []);
  assert.ok(/no es revisora/.test(gs.planReasignar_(fila(), 'USR-0002', revisores).join()));
  assert.ok(/ya no está con Procesos/.test(gs.planReasignar_(fila({ ESTADO: 'AUTORIZADO' }), 'USR-0005', revisores).join()));
});

// ─────────────────────────────── Observaciones ───────────────────────────────

test('observar: solo el revisor asignado, en revisión, con apartado válido y texto', function () {
  const p = plano(gs.planObservacion_({ apartado: 'ACTIVIDAD', idActividad: 'ACT-2', texto: ' Falta decir en qué sistema. ' }, fila(), DET, PAOLA, AHORA));
  assert.deepStrictEqual([p.errores, p.fila.APARTADO, p.fila.ID_ACTIVIDAD, p.fila.TEXTO, p.fila.ESTADO, p.fila.REVISION, p.fila.AUTOR_NOMBRE],
    [[], 'ACTIVIDAD', 'ACT-2', 'Falta decir en qué sistema.', 'ABIERTA', '1', 'Paola Méndez']);
  assert.ok(/primero toma/.test(gs.planObservacion_({ apartado: 'OBJETIVO', texto: 'x' }, fila({ REVISOR_ASIGNADO_ID: '' }), DET, PAOLA, AHORA).errores.join()));
  assert.ok(/ya no existe/.test(gs.planObservacion_({ apartado: 'ACTIVIDAD', idActividad: 'ACT-9', texto: 'x' }, fila(), DET, PAOLA, AHORA).errores.join()));
  assert.ok(/Elige a qué parte/.test(gs.planObservacion_({ apartado: 'OTRA', texto: 'x' }, fila(), DET, PAOLA, AHORA).errores.join()));
  assert.ok(/Escribe la observación/.test(gs.planObservacion_({ apartado: 'GENERAL', texto: '  ' }, fila(), DET, PAOLA, AHORA).errores.join()));
});

test('observaciones: el colaborador las atiende mientras puede editarla; el revisor las cierra o reabre en revisión', function () {
  const atender = plano(gs.planCambioObservacion_(obs('ABIERTA'), fila({ ESTADO: 'DEVUELTO' }), ANA, 'ATENDER', 'Ya lo agregué', AHORA));
  assert.deepStrictEqual([atender.errores, atender.cambios.ESTADO, atender.cambios.RESPUESTA], [[], 'ATENDIDA', 'Ya lo agregué']);
  assert.ok(/cuando Procesos te regresa/.test(gs.planCambioObservacion_(obs('ABIERTA'), fila(), ANA, 'ATENDER', '', AHORA).errores.join()));
  assert.ok(/Solo quien elaboró/.test(gs.planCambioObservacion_(obs('ABIERTA'), fila({ ESTADO: 'DEVUELTO' }), PAOLA, 'ATENDER', '', AHORA).errores.join()));
  // Si ya corrigió y volvió a confirmar, todavía puede atender lo que le faltó (si no, no podría enviarla).
  ['BORRADOR', 'CONFIRMADO'].forEach(function (e) {
    assert.deepStrictEqual(plano(gs.planCambioObservacion_(obs('ABIERTA'), fila({ ESTADO: e }), ANA, 'ATENDER', '', AHORA).errores), []);
  });
  assert.ok(/cuando Procesos te regresa/.test(gs.planCambioObservacion_(obs('ABIERTA'), fila({ ESTADO: 'EN_AUTORIZACION_CH' }), ANA, 'ATENDER', '', AHORA).errores.join()));
  assert.deepStrictEqual(plano(gs.planCambioObservacion_(obs('ATENDIDA'), fila(), PAOLA, 'CERRAR', '', AHORA).cambios), { ESTADO: 'CERRADA' });
  assert.deepStrictEqual(plano(gs.planCambioObservacion_(obs('ATENDIDA'), fila(), PAOLA, 'REABRIR', '', AHORA).cambios), { ESTADO: 'ABIERTA' });
  assert.ok(/Solo el revisor asignado/.test(gs.planCambioObservacion_(obs('ATENDIDA'), fila(), CARLOS, 'CERRAR', '', AHORA).errores.join()));
});

test('observaciones en pantalla: la vuelta más reciente primero y con el número de actividad', function () {
  const filas = [obs('CERRADA', { ID_OBSERVACION: 'OBS-1', REVISION: '1', FECHA: new Date(2026, 9, 20) }),
    obs('ABIERTA', { ID_OBSERVACION: 'OBS-2', REVISION: '2', APARTADO: 'ACTIVIDAD', ID_ACTIVIDAD: 'ACT-2', FECHA: new Date(2026, 9, 22) })];
  const l = plano(gs.observacionesDe_(filas, 'SOL-2026-0001', DET, function () { return 'f'; }));
  assert.deepStrictEqual(l.map(function (o) { return o.id + ':' + o.nombreApartado; }), ['OBS-2:Actividad 2', 'OBS-1:Objetivo']);
});

test('devolver: requiere al menos una observación abierta', function () {
  assert.deepStrictEqual(plano(gs.planDevolver_(fila(), PAOLA, [obs('ABIERTA')])), []);
  assert.ok(/al menos una observación/.test(gs.planDevolver_(fila(), PAOLA, [obs('CERRADA')]).join()));
  assert.ok(/Solo el revisor asignado/.test(gs.planDevolver_(fila(), CARLOS, [obs('ABIERTA')]).join()));
});

// ─────────────────────────────── Código y Vo.Bo. ───────────────────────────────

test('código: el siguiente libre por tipo + departamento + área, sin repetir lo usado ni lo guardado', function () {
  assert.strictEqual(gs.siguienteCodigo_('P', 'CI04', [], 0), 'P-CI04-001');
  assert.strictEqual(gs.siguienteCodigo_('P', 'CI04', ['P-CI04-001', 'P-CI04-007', 'P-CI01-020', 'PRO-CI04-030'], 0), 'P-CI04-008');
  assert.strictEqual(gs.siguienteCodigo_('P', 'CI04', ['P-CI04-002'], '12'), 'P-CI04-013');
  const usados = plano(gs.codigosUsados_([{ ID_SOLICITUD: 'A', CODIGO: 'p-ci04-003' }, { ID_SOLICITUD: 'B', CODIGO: 'P-CI04-004' }],
    [{ CODIGO: 'P-CI04-010' }], 'B'));
  assert.deepStrictEqual(usados, ['P-CI04-003', 'P-CI04-010'], 'la propia solicitud no cuenta');
});

test('código: formato del tipo, departamento y área de la solicitud, y que no esté usado', function () {
  assert.deepStrictEqual(plano(gs.validarCodigo_('p-ci04-005', 'P', 'CI04', [])), []);
  assert.ok(/debe ser P-CI04-NNN/.test(gs.validarCodigo_('P-CI01-005', 'P', 'CI04', []).join()));
  assert.ok(/debe ser/.test(gs.validarCodigo_('P-CI04-5', 'P', 'CI04', []).join()));
  assert.ok(/ya está en uso/.test(gs.validarCodigo_('P-CI04-005', 'P', 'CI04', ['P-CI04-005']).join()));
});

test('Vo.Bo.: asigna código, versión 0.0, quién revisó y cierra las observaciones atendidas', function () {
  const p = plano(gs.planVoBo_(fila(), PAOLA, DET, 'h1', [obs('ATENDIDA'), obs('CERRADA', { _fila: 8 })], 'p-ci04-001', [], 'Analista de Procesos', AHORA));
  assert.deepStrictEqual(p.errores, []);
  assert.deepStrictEqual([p.cambios.ESTADO, p.cambios.CODIGO, p.cambios.VERSION, p.cambios.REVISO_NOMBRE, p.cambios.REVISO_PUESTO],
    ['EN_AUTORIZACION_CH', 'P-CI04-001', '0.0', 'Paola Méndez', 'Analista de Procesos']);
  assert.deepStrictEqual(p.cerrarObservaciones, [7]);
});

test('Vo.Bo.: no con observaciones abiertas, ni si el contenido no es el confirmado, ni con código inválido', function () {
  assert.ok(/observación abierta/.test(gs.planVoBo_(fila(), PAOLA, DET, 'h1', [obs('ABIERTA')], 'P-CI04-001', [], '', AHORA).errores.join()));
  assert.ok(/no es el que confirmó/.test(gs.planVoBo_(fila(), PAOLA, DET, 'otra', [], 'P-CI04-001', [], '', AHORA).errores.join()));
  assert.ok(/ya está en uso/.test(gs.planVoBo_(fila(), PAOLA, DET, 'h1', [], 'P-CI04-001', ['P-CI04-001'], '', AHORA).errores.join()));
  assert.ok(/Solo el revisor asignado/.test(gs.planVoBo_(fila(), CARLOS, DET, 'h1', [], 'P-CI04-001', [], '', AHORA).errores.join()));
  assert.ok(/Solo el revisor asignado/.test(gs.planVoBo_(fila(), SOFIA, DET, 'h1', [], 'P-CI04-001', [], '', AHORA).errores.join()), 'el administrador no da Vo.Bo.');
});

test('puesto de quien revisa: el de su usuario en el catálogo', function () {
  assert.strictEqual(gs.puestoDeUsuario_('USR-0004', [{ ID_USUARIO: 'USR-0004', ID_PUESTO: 'PUE-7' }], [{ ID_PUESTO: 'PUE-7', NOMBRE: 'Analista de Procesos' }]), 'Analista de Procesos');
  assert.strictEqual(gs.puestoDeUsuario_('USR-0004', [{ ID_USUARIO: 'USR-0004', ID_PUESTO: '' }], []), '');
});
