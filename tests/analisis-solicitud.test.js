// Fase 3 (src/services/AnalisisSolicitud.gs): lo que se manda a la IA y sin qué datos, cómo su
// respuesta se vuelve propuestas y preguntas, las decisiones de la persona y lo que falta para confirmar.
const test = require('node:test');
const assert = require('node:assert');
const { cargarGs } = require('./cargar-gs');

const gs = cargarGs(['src/config/Config.gs', 'src/config/Catalogos.gs', 'src/utils/Texto.gs', 'src/utils/Huella.gs',
  'src/utils/Privacidad.gs', 'src/services/Sesion.gs', 'src/services/Usuarios.gs', 'src/services/Solicitudes.gs',
  'src/ia/Analisis.gs', 'src/ia/Prompts.gs', 'src/services/AnalisisSolicitud.gs']);
const plano = function (v) { return JSON.parse(JSON.stringify(v)); };

function detalle(cambios) {
  return Object.assign({
    id: 'SOL-2026-0001', nombre: 'Alta de proveedores', tipoDocumento: 'Procedimiento', departamento: 'COMPRAS', area: 'COMPRAS',
    inicio: 'Cuando un área pide dar de alta un proveedor; dudas a compras@ciudadmaderas.com', fin: 'Cuando queda activo en SAP',
    objetivo: '', alcance: '', responsabilidades: [], definiciones: [], puedeEditar: true,
    actividades: [
      { id: 'ACT-1', texto: 'El auxiliar de compras recibe la solicitud', responsable: '', responsableConfirmado: false, imagenes: [] },
      { id: 'ACT-2', texto: 'Se capturan los datos en SAP', responsable: 'aux. compras', responsableConfirmado: false, imagenes: [] },
      { id: 'ACT-3', texto: '   ', responsable: '', responsableConfirmado: false, imagenes: [] }
    ]
  }, cambios);
}
const PUESTOS = [
  { ID_PUESTO: 'PUE-1', NOMBRE: 'Auxiliar de Compras', SINONIMOS: 'aux. compras', ACTIVO: 'SI' },
  { ID_PUESTO: 'PUE-2', NOMBRE: 'Jefe de Compras', SINONIMOS: '', ACTIVO: 'SI' },
  { ID_PUESTO: 'PUE-9', NOMBRE: 'Puesto viejo', SINONIMOS: '', ACTIVO: 'NO' }
];
const ACLARACIONES = [
  { _fila: 2, ID_ACLARACION: 'ACL-1', ID_SOLICITUD: 'SOL-2026-0001', ID_ACTIVIDAD: '', TIPO: 'excepcion', PREGUNTA: '¿Qué pasa si falta la constancia?',
    RESPUESTA: 'Se regresa al área solicitante', ESTADO: 'RESPONDIDA', ORIGEN: 'IA' },
  { _fila: 3, ID_ACLARACION: 'ACL-2', ID_SOLICITUD: 'SOL-2026-0001', ID_ACTIVIDAD: 'ACT-2', TIPO: 'plazo', PREGUNTA: '¿En cuánto tiempo?',
    RESPUESTA: '', ESTADO: 'NO_LO_SE', ORIGEN: 'IA' },
  { _fila: 4, ID_ACLARACION: 'ACL-3', ID_SOLICITUD: 'SOL-2026-0001', ID_ACTIVIDAD: 'ACT-1', TIPO: 'sistema', PREGUNTA: '¿En qué sistema?',
    RESPUESTA: '', ESTADO: 'PENDIENTE', ORIGEN: 'IA' }
];

// ─────────────────────────────── Entrada y privacidad ───────────────────────────────

test('entrada: solo actividades con texto, el responsable indicado, puestos activos y las respuestas previas', function () {
  const e = plano(gs.entradaAnalisis_(detalle(), ACLARACIONES, PUESTOS));
  assert.deepStrictEqual(e.actividades.map(function (a) { return a.id + '|' + a.responsableIndicado; }), ['ACT-1|', 'ACT-2|aux. compras']);
  assert.deepStrictEqual(e.puestos.map(function (p) { return p.id; }), ['PUE-1', 'PUE-2']);
  assert.deepStrictEqual(e.respuestas.map(function (r) { return r.respuesta; }), ['Se regresa al área solicitante', 'No lo sé']);
});

test('privacidad: los datos sensibles no salen hacia la IA y regresan al restaurar', function () {
  const mapa = {};
  const enviada = gs.ocultarEntrada_(gs.entradaAnalisis_(detalle(), [], PUESTOS), mapa);
  assert.ok(enviada.inicio.indexOf('compras@') === -1 && enviada.inicio.indexOf('[CORREO 1]') !== -1);
  const prompt = gs.construirPromptAnalisis_(enviada);
  assert.ok(prompt.usuario.indexOf('@ciudadmaderas.com') === -1, 'el correo no debe ir en el prompt');
  assert.strictEqual(gs.restaurarDatosSensibles_('Escribir a [CORREO 1]', mapa), 'Escribir a compras@ciudadmaderas.com');
});

test('el prompt lleva el responsable indicado y las respuestas anteriores', function () {
  const prompt = gs.construirPromptAnalisis_(gs.entradaAnalisis_(detalle(), ACLARACIONES, PUESTOS));
  assert.ok(prompt.usuario.indexOf('Responsable indicado: aux. compras') !== -1);
  assert.ok(prompt.usuario.indexOf('¿Qué pasa si falta la constancia? → Se regresa al área solicitante') !== -1);
});

test('corregir redacción: prompt corto (solo actividades, sin puestos ni datos privados); el análisis ya no reescribe', function () {
  const mapa = {};
  const enviada = gs.ocultarEntrada_(gs.entradaAnalisis_(detalle(), ACLARACIONES, PUESTOS), mapa);
  const r = gs.construirPromptRedaccion_(enviada);
  assert.ok(r.usuario.indexOf('1. [ACT-1] El auxiliar de compras recibe la solicitud') !== -1);
  assert.ok(r.usuario.indexOf('Catálogo de puestos') === -1 && r.usuario.indexOf('Respuestas del colaborador') === -1);
  assert.ok(/texto_propuesto/.test(r.sistema));
  assert.ok(!/texto_propuesto/.test(gs.construirPromptAnalisis_(enviada).sistema), 'el análisis ya no pide reescribir');
});

test('corregir redacción: cada actividad lleva las respuestas que el colaborador dio sobre ella (no «No lo sé»)', function () {
  const respuestas = ACLARACIONES.concat([
    { _fila: 5, ID_ACLARACION: 'ACL-4', ID_SOLICITUD: 'SOL-2026-0001', ID_ACTIVIDAD: 'ACT-1', TIPO: 'sistema', PREGUNTA: '¿Cómo llega la solicitud?',
      RESPUESTA: 'Por correo en 24 horas', ESTADO: 'RESPONDIDA', ORIGEN: 'IA' }]);
  const entrada = gs.entradaAnalisis_(detalle(), respuestas, PUESTOS);
  const r = gs.construirPromptRedaccion_(entrada);
  assert.ok(r.usuario.indexOf('Información del colaborador:\n   - ¿Cómo llega la solicitud? → Por correo en 24 horas') !== -1);
  assert.ok(r.usuario.indexOf('¿En cuánto tiempo?') === -1, '«No lo sé» no se manda');
  assert.ok(r.usuario.indexOf('Se regresa al área solicitante') === -1, 'las respuestas generales no van en la redacción');
  const v = plano(gs.validarRedaccion_(entrada, { actividades: [
    { id: 'ACT-1', texto_propuesto: 'El auxiliar de compras recibe por correo la solicitud en un plazo de 24 horas.' },
    { id: 'ACT-2', texto_propuesto: 'Se capturan los datos en SAP.' }] }));
  assert.deepStrictEqual(v.analisis.actividades[0].cifrasNuevas, [], 'el 24 viene de su respuesta');
});

test('sugerencia al escribir: solo se muestra si cambia algo y avisa cifras nuevas', function () {
  assert.deepStrictEqual(plano(gs.respuestaSugerencia_('recibe la solicitud', ' Recibe la solicitud. ', 'Mayúscula', [])),
    { texto: ' Recibe la solicitud. ', igual: false, cambios: 'Mayúscula', aviso: '' });
  assert.strictEqual(gs.respuestaSugerencia_('Recibe la solicitud.', 'Recibe  la solicitud.', '', []).igual, true);
  assert.ok(/no estaban en tu texto \(3\)/.test(gs.respuestaSugerencia_('a', 'b en 3 días', '', ['3']).aviso));
});

test('validar redacción: una por actividad que exista; la que falte se conserva; avisa cifras nuevas', function () {
  const entrada = gs.entradaAnalisis_(detalle(), [], PUESTOS);
  const v = plano(gs.validarRedaccion_(entrada, { actividades: [
    { id: 'ACT-1', texto_propuesto: 'El auxiliar de compras recibe la solicitud en 3 días.', cambios: 'Puntuación' },
    { id: 'ACT-9', texto_propuesto: 'Inventada' }
  ] }));
  assert.deepStrictEqual(v.analisis.actividades.map(function (a) { return a.id + ':' + a.textoPropuesto; }),
    ['ACT-1:El auxiliar de compras recibe la solicitud en 3 días.', 'ACT-2:Se capturan los datos en SAP']);
  assert.deepStrictEqual(v.analisis.actividades[0].cifrasNuevas, ['3']);
  assert.strictEqual(v.avisos.length, 3, 'una inventada, una que faltó y una con cifras');
  assert.deepStrictEqual([v.analisis.preguntas, v.analisis.objetivo], [[], null]);
});

test('validador: el responsable indicado manda y no se vuelven a hacer preguntas ya respondidas', function () {
  const entrada = gs.entradaAnalisis_(detalle(), ACLARACIONES, PUESTOS);
  entrada.puestos = entrada.puestos.map(function (p) { return { id: p.id, nombre: p.nombre, sinonimos: p.sinonimos }; });
  const v = plano(gs.validarAnalisis_(entrada, {
    actividades: [
      { id: 'ACT-1', texto_propuesto: 'El Auxiliar de Compras recibe la solicitud.', responsable: { puesto: 'Auxiliar de Compras', id_puesto: 'PUE-1', evidencia: 'auxiliar de compras' } },
      { id: 'ACT-2', texto_propuesto: 'Se capturan los datos en SAP.', responsable: { puesto: 'Jefe de Compras', id_puesto: 'PUE-2', evidencia: 'jefe' } }
    ],
    preguntas: [
      { id_actividad: null, tipo: 'excepcion', pregunta: '¿Qué pasa si falta la constancia?' },
      { id_actividad: 'ACT-2', tipo: 'plazo', pregunta: '¿Cuánto tarda la captura?' },
      { id_actividad: 'ACT-2', tipo: 'responsable', pregunta: '¿Quién captura?' },
      { id_actividad: null, tipo: 'autorizacion', pregunta: '¿Quién autoriza el alta?' }
    ]
  }));
  assert.deepStrictEqual(v.analisis.actividades[1].responsable, { puesto: 'Auxiliar de Compras', idPuesto: 'PUE-1',
    evidencia: 'aux. compras', requiereConfirmacion: false, indicado: true });
  assert.deepStrictEqual(v.analisis.preguntas.map(function (q) { return q.pregunta; }), ['¿Quién autoriza el alta?']);
});

// ─────────────────────────────── Propuestas ───────────────────────────────

const AHORA = new Date(2026, 9, 21, 10, 0, 0);
function analisis() {
  return {
    actividades: [
      { id: 'ACT-1', textoPropuesto: 'El Auxiliar de Compras recibe la solicitud.', cambios: 'Mayúsculas y punto', cifrasNuevas: [],
        responsable: { puesto: 'Auxiliar de Compras', idPuesto: 'PUE-1', evidencia: 'auxiliar de compras', requiereConfirmacion: false } },
      { id: 'ACT-2', textoPropuesto: 'Se capturan los datos en SAP en 2 días.', cambios: '', cifrasNuevas: ['2'],
        responsable: { puesto: 'Auxiliar de Compras', idPuesto: 'PUE-1', evidencia: 'aux. compras', requiereConfirmacion: false, indicado: true } }
    ],
    objetivo: { texto: 'Dar de alta proveedores con su documentación completa.', basadoEn: ['ACT-1', 'ACT-2'] },
    alcance: null,
    responsabilidades: [{ puesto: 'Auxiliar de Compras', responsabilidades: ['Recibir la solicitud', 'Capturar en SAP'], actividades: ['ACT-1', 'ACT-2'] }],
    definiciones: [{ termino: 'SAP', definicion: 'Sistema administrativo' }],
    preguntas: [{ idActividad: null, tipo: 'autorizacion', pregunta: '¿Quién autoriza el alta?' }],
    sugerenciasOrden: [{ descripcion: 'Validar antes de capturar', motivo: 'Evita capturas inútiles', actividades: ['ACT-2', 'ACT-1'] }]
  };
}
const PROPUESTAS_PREVIAS = [
  { _fila: 2, ID_PROPUESTA: 'PIA-1', ID_SOLICITUD: 'SOL-2026-0001', DECISION: 'PENDIENTE' },
  { _fila: 3, ID_PROPUESTA: 'PIA-2', ID_SOLICITUD: 'SOL-2026-0001', DECISION: 'ACEPTADA' },
  { _fila: 4, ID_PROPUESTA: 'PIA-3', ID_SOLICITUD: 'SOL-2026-0009', DECISION: 'PENDIENTE' }
];

test('propuestas: lo pendiente del análisis anterior se reemplaza; lo decidido o respondido se queda', function () {
  const p = plano(gs.planPropuestas_(analisis(), detalle(), PROPUESTAS_PREVIAS, ACLARACIONES, AHORA));
  assert.deepStrictEqual(p.reemplazarPropuestas, [2]);
  assert.deepStrictEqual(p.reemplazarAclaraciones, [4]);
});

test('propuestas: texto por actividad con aviso de cifras nuevas, responsable solo donde no lo indicó', function () {
  const p = plano(gs.planPropuestas_(analisis(), detalle(), [], [], AHORA));
  const campos = p.propuestas.map(function (x) { return x.CAMPO + ':' + x.ID_ACTIVIDAD; });
  assert.deepStrictEqual(campos, ['TEXTO:ACT-1', 'RESPONSABLE:ACT-1', 'TEXTO:ACT-2', 'RESPONSABLE:ACT-2', 'OBJETIVO:',
    'RESPONSABILIDADES:', 'DEFINICIONES:', 'ORDEN:']);
  const texto2 = p.propuestas[2];
  assert.ok(/Ojo: menciona datos que no estaban en tu texto \(2\)/.test(texto2.JUSTIFICACION));
  assert.strictEqual(p.propuestas[3].JUSTIFICACION, 'Así se llama en el catálogo de puestos.', 'normaliza el nombre indicado');
  assert.strictEqual(p.propuestas[4].JUSTIFICACION, 'Basado en: Actividades 1 y 2.');
  assert.deepStrictEqual(JSON.parse(p.propuestas[5].PROPUESTA), ['Auxiliar de Compras: Recibir la solicitud; Capturar en SAP']);
  assert.strictEqual(p.propuestas[7].EVIDENCIA, 'Actividades 2 y 1');
  assert.deepStrictEqual(p.aclaraciones.map(function (q) { return q.PREGUNTA + ':' + q.ESTADO; }), ['¿Quién autoriza el alta?:PENDIENTE']);
});

test('propuestas: «corregir redacción» solo toca la redacción y el análisis solo lo demás', function () {
  const previas = [
    { _fila: 2, ID_SOLICITUD: 'SOL-2026-0001', CAMPO: 'TEXTO', DECISION: 'PENDIENTE' },
    { _fila: 3, ID_SOLICITUD: 'SOL-2026-0001', CAMPO: 'OBJETIVO', DECISION: 'PENDIENTE' }
  ];
  const r = plano(gs.planPropuestas_(analisis(), detalle(), previas, ACLARACIONES, AHORA, 'REDACCION'));
  assert.deepStrictEqual([r.reemplazarPropuestas, r.reemplazarAclaraciones, r.aclaraciones.length], [[2], [], 0]);
  assert.deepStrictEqual(r.propuestas.map(function (x) { return x.CAMPO; }), ['TEXTO', 'TEXTO']);
  const a = plano(gs.planPropuestas_(analisis(), detalle(), previas, ACLARACIONES, AHORA, 'ANALISIS'));
  assert.deepStrictEqual([a.reemplazarPropuestas, a.reemplazarAclaraciones], [[3], [4]]);
  assert.ok(a.propuestas.every(function (x) { return x.CAMPO !== 'TEXTO'; }));
  assert.strictEqual(a.aclaraciones.length, 1);
});

test('propuestas: si la IA propone lo mismo que ya hay, no se propone nada', function () {
  const det = detalle({ objetivo: 'Dar de alta proveedores con su documentación completa', definiciones: ['SAP: Sistema administrativo'] });
  det.actividades[0].texto = 'El Auxiliar de Compras recibe la solicitud.';
  det.actividades[0].responsable = 'Auxiliar de Compras';
  const a = analisis();
  a.actividades[0].responsable.indicado = true;
  const p = plano(gs.planPropuestas_(a, det, [], [], AHORA));
  const campos = p.propuestas.map(function (x) { return x.CAMPO + ':' + x.ID_ACTIVIDAD; });
  assert.ok(campos.indexOf('TEXTO:ACT-1') === -1 && campos.indexOf('OBJETIVO:') === -1 && campos.indexOf('DEFINICIONES:') === -1);
});

test('estado del análisis: sin las reemplazadas, en orden, con listas ya leídas', function () {
  const propuestas = [
    { ID_PROPUESTA: 'PIA-9', ID_SOLICITUD: 'SOL-2026-0001', ID_ACTIVIDAD: '', CAMPO: 'DEFINICIONES', PROPUESTA: '["SAP: sistema"]', DECISION: 'PENDIENTE', FECHA_PROPUESTA: AHORA },
    { ID_PROPUESTA: 'PIA-8', ID_SOLICITUD: 'SOL-2026-0001', ID_ACTIVIDAD: 'ACT-2', CAMPO: 'TEXTO', PROPUESTA: 'x', DECISION: 'PENDIENTE', FECHA_PROPUESTA: AHORA },
    { ID_PROPUESTA: 'PIA-7', ID_SOLICITUD: 'SOL-2026-0001', ID_ACTIVIDAD: 'ACT-1', CAMPO: 'TEXTO', PROPUESTA: 'y', DECISION: 'REEMPLAZADA', FECHA_PROPUESTA: AHORA },
    { ID_PROPUESTA: 'PIA-6', ID_SOLICITUD: 'SOL-2026-0001', ID_ACTIVIDAD: 'ACT-BORRADA', CAMPO: 'TEXTO', PROPUESTA: 'z', DECISION: 'PENDIENTE', FECHA_PROPUESTA: AHORA }
  ];
  const e = plano(gs.estadoAnalisis_(detalle(), propuestas, ACLARACIONES, true, function () { return 'hoy'; }));
  assert.deepStrictEqual(e.propuestas.map(function (p) { return p.id; }), ['PIA-8', 'PIA-9']);
  assert.deepStrictEqual(e.propuestas[1].propuesta, ['SAP: sistema']);
  assert.deepStrictEqual([e.propuestas[0].numero, e.ultimoAnalisis, e.iaActiva], [2, 'hoy', true]);
  assert.deepStrictEqual(e.preguntas.map(function (q) { return q.id + ':' + q.nombreTipo; }), ['ACL-1:Excepción', 'ACL-3:Sistema', 'ACL-2:Plazo']);
});

// ─────────────────────────────── Decisiones ───────────────────────────────

const ACT_FILA = { _fila: 5, ID_ACTIVIDAD: 'ACT-1', ELIMINADA: 'NO' };
function propuesta(campo, cambios) {
  return Object.assign({ ID_PROPUESTA: 'PIA-1', ID_SOLICITUD: 'SOL-2026-0001', ID_ACTIVIDAD: campo === 'TEXTO' || campo === 'RESPONSABLE' ? 'ACT-1' : '',
    CAMPO: campo, VALOR_ANTERIOR: 'El auxiliar de compras recibe la solicitud', PROPUESTA: 'El Auxiliar de Compras recibe la solicitud.', DECISION: 'PENDIENTE' }, cambios);
}
const decidir = function (p, decision, valor) { return plano(gs.planDecision_(p, decision, valor, ACT_FILA, detalle(), PUESTOS)); };

test('decidir texto: aceptar lo pone como texto final; editar usa lo que escribió; descartar no cambia nada', function () {
  assert.deepStrictEqual(decidir(propuesta('TEXTO'), 'ACEPTADA').actividad, { TEXTO_FINAL: 'El Auxiliar de Compras recibe la solicitud.' });
  const ed = decidir(propuesta('TEXTO'), 'EDITADA', 'El auxiliar recibe y revisa la solicitud.');
  assert.deepStrictEqual([ed.actividad.TEXTO_FINAL, ed.propuesta.DECISION, ed.propuesta.VALOR_FINAL],
    ['El auxiliar recibe y revisa la solicitud.', 'EDITADA', 'El auxiliar recibe y revisa la solicitud.']);
  const no = decidir(propuesta('TEXTO'), 'RECHAZADA');
  assert.deepStrictEqual([no.actividad, no.propuesta.DECISION], [{}, 'RECHAZADA']);
  assert.ok(/Escribe cómo debe quedar/.test(decidir(propuesta('TEXTO'), 'EDITADA', '  ').errores.join()));
});

test('decidir texto: si la actividad cambió después del análisis, la propuesta ya no aplica', function () {
  const r = decidir(propuesta('TEXTO', { VALOR_ANTERIOR: 'Otro texto que ya no está' }), 'ACEPTADA');
  assert.strictEqual(r.obsoleta, true);
  assert.ok(/vuelve a analizar/.test(r.errores.join()));
});

test('aceptar todas las correcciones: solo redacción pendiente de esta solicitud; las de actividades que cambiaron quedan vencidas', function () {
  const propuestas = [
    propuesta('TEXTO'),
    propuesta('TEXTO', { ID_PROPUESTA: 'PIA-2', ID_ACTIVIDAD: 'ACT-2', VALOR_ANTERIOR: 'Texto que ya cambió' }),
    propuesta('TEXTO', { ID_PROPUESTA: 'PIA-3', DECISION: 'RECHAZADA' }),
    propuesta('RESPONSABLE', { ID_PROPUESTA: 'PIA-4' }),
    propuesta('TEXTO', { ID_PROPUESTA: 'PIA-5', ID_SOLICITUD: 'OTRA' })
  ];
  const actividades = [ACT_FILA, { _fila: 6, ID_ACTIVIDAD: 'ACT-2', ELIMINADA: 'NO' }];
  const p = plano(gs.planAceptarRedacciones_(propuestas, actividades, detalle(), 'SOL-2026-0001'));
  assert.deepStrictEqual(p.aplicar.map(function (x) { return x.propuesta.ID_PROPUESTA + ':' + x.plan.actividad.TEXTO_FINAL; }),
    ['PIA-1:El Auxiliar de Compras recibe la solicitud.']);
  assert.deepStrictEqual(p.vencidas.map(function (v) { return v.propuesta.ID_PROPUESTA + ':' + v.obsoleta; }), ['PIA-2:true']);
});

test('decidir responsable: se liga al catálogo cuando coincide y queda confirmado', function () {
  assert.deepStrictEqual(decidir(propuesta('RESPONSABLE', { PROPUESTA: 'aux. compras' }), 'ACEPTADA').actividad,
    { PUESTO_TEXTO: 'Auxiliar de Compras', ID_PUESTO: 'PUE-1', RESPONSABLE_CONFIRMADO: 'SI' });
  assert.deepStrictEqual(decidir(propuesta('RESPONSABLE'), 'EDITADA', 'Coordinador de proveedores').actividad,
    { PUESTO_TEXTO: 'Coordinador de proveedores', ID_PUESTO: '', RESPONSABLE_CONFIRMADO: 'SI' });
});

test('decidir objetivo, responsabilidades y orden', function () {
  assert.deepStrictEqual(decidir(propuesta('OBJETIVO', { PROPUESTA: 'Dar de alta proveedores.' }), 'ACEPTADA').solicitud, { OBJETIVO: 'Dar de alta proveedores.' });
  const r = decidir(propuesta('RESPONSABILIDADES', { PROPUESTA: '["A: x"]' }), 'EDITADA', 'A: x\n\n  B:   y  ');
  assert.deepStrictEqual(r.solicitud, { RESPONSABILIDADES: '["A: x","B: y"]' });
  assert.deepStrictEqual(decidir(propuesta('ORDEN', { PROPUESTA: 'Validar antes' }), 'ACEPTADA').solicitud, {}, 'el orden nunca lo cambia la IA');
  assert.ok(/ya se decidió/.test(decidir(propuesta('TEXTO', { DECISION: 'ACEPTADA' }), 'ACEPTADA').errores.join()));
});

// ─────────────────────────────── Preguntas y textos derivados ───────────────────────────────

test('responder: texto, «No aplica» o «No lo sé»; la de responsable se vuelve el responsable', function () {
  const q = { TIPO: 'responsable', ID_ACTIVIDAD: 'ACT-1' };
  assert.deepStrictEqual(plano(gs.planRespuesta_(q, 'RESPONDIDA', 'Jefe de compras')), { errores: [], aclaracion: { ESTADO: 'RESPONDIDA', RESPUESTA: 'Jefe de compras' }, responsable: 'Jefe de compras' });
  assert.deepStrictEqual(plano(gs.planRespuesta_({ TIPO: 'plazo' }, 'NO_LO_SE', 'ignorado')).aclaracion, { ESTADO: 'NO_LO_SE', RESPUESTA: '' });
  assert.ok(/Escribe la respuesta/.test(gs.planRespuesta_({ TIPO: 'plazo' }, 'RESPONDIDA', ' ').errores.join()));
  assert.ok(gs.planRespuesta_({ TIPO: 'plazo' }, 'PENDIENTE', '').errores.length);
});

test('textos derivados a mano: solo se guarda lo que cambió', function () {
  const p = plano(gs.planDerivados_({ objetivo: '  Dar de alta proveedores ', alcance: '', responsabilidades: 'A: x\n\nB: y' }, detalle()));
  assert.deepStrictEqual(p.solicitud, { OBJETIVO: 'Dar de alta proveedores', RESPONSABILIDADES: '["A: x","B: y"]' });
  assert.ok(gs.planDerivados_({ objetivo: 'x'.repeat(2001) }, detalle()).errores.length);
});

// ─────────────────────────────── Confirmación ───────────────────────────────

test('para confirmar: actividades con texto y responsable, objetivo, alcance y preguntas respondidas', function () {
  const f = plano(gs.faltantesConfirmacion_(detalle(), ACLARACIONES));
  assert.deepStrictEqual(f, ['Falta quién realiza la actividad 1.', 'La actividad 3 está vacía: escríbela o elimínala.',
    'Falta el objetivo.', 'Falta el alcance.', 'Falta responder 1 pregunta (puede ser «No aplica» o «No lo sé»).']);
  const lista = detalle({ objetivo: 'O', alcance: 'A' });
  lista.actividades = lista.actividades.slice(0, 2);
  lista.actividades[0].responsable = 'Auxiliar de Compras';
  assert.deepStrictEqual(plano(gs.faltantesConfirmacion_(lista, ACLARACIONES.slice(0, 2))), []);
});

test('puestos involucrados: cada puesto una vez, en el orden en que aparece', function () {
  const d = detalle();
  d.actividades = [{ texto: 'a', responsable: 'Jefe de Compras' }, { texto: 'b', responsable: 'Auxiliar' }, { texto: 'c', responsable: 'jefe de compras' }];
  assert.deepStrictEqual(plano(gs.puestosInvolucrados_(d)), ['Jefe de Compras', 'Auxiliar']);
});
