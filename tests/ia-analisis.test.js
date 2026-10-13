// Pruebas del validador del análisis de la IA (src/ia/Analisis.gs): la IA propone, el validador
// descarta lo que no tiene sustento en el texto del colaborador (requerimiento §3.3 y §3.4).
const test = require('node:test');
const assert = require('node:assert');
const { cargarGs } = require('./cargar-gs');

const gs = cargarGs(['src/config/Catalogos.gs', 'src/ia/Analisis.gs', 'src/ia/ClienteIA.gs']);
// Lo que devuelve el contexto aislado se pasa por JSON para comparar con deepStrictEqual.
const plano = function (v) { return JSON.parse(JSON.stringify(v)); };

const ENTRADA = {
  inicio: 'cuando un area pide dar de alta un proveedor nuevo',
  fin: 'cuando el proveedor queda activo en el sistema SAP',
  actividades: [
    { id: 'ACT-1', texto: 'el auxiliar de compras recibe la solicitud y checa la constancia fiscal' },
    { id: 'ACT-2', texto: 'se capturan los datos del proveedor en SAP' },
    { id: 'ACT-3', texto: 'el jefe de compras revisa y autoriza en 2 dias' }
  ],
  puestos: [
    { id: 'PUE-1', nombre: 'Auxiliar de Compras', sinonimos: 'aux. compras' },
    { id: 'PUE-2', nombre: 'Jefe de Compras', sinonimos: '' },
    { id: 'PUE-3', nombre: 'Analista de Tesorería', sinonimos: '' }
  ]
};

function act(id, texto, responsable) {
  return { id: id, texto_propuesto: texto, cambios: 'ortografía', responsable: responsable || null };
}

test('las actividades salen en el orden del colaborador aunque la IA las reordene', function () {
  const r = gs.validarAnalisis_(ENTRADA, { actividades: [
    act('ACT-3', 'El Jefe de Compras revisa y autoriza en 2 días.'),
    act('ACT-1', 'El Auxiliar de Compras recibe la solicitud.'),
    act('ACT-2', 'Se capturan los datos en SAP.')
  ] });
  assert.deepStrictEqual(plano(r.analisis.actividades.map(function (a) { return a.id; })), ['ACT-1', 'ACT-2', 'ACT-3']);
});

test('se descartan actividades inventadas y se conservan las que la IA omitió', function () {
  const r = gs.validarAnalisis_(ENTRADA, { actividades: [
    act('ACT-1', 'El Auxiliar de Compras recibe la solicitud.'),
    act('ACT-9', 'Tesorería registra la cuenta bancaria.')
  ] });
  assert.strictEqual(r.analisis.actividades.length, 3);
  assert.strictEqual(r.analisis.actividades[1].textoPropuesto, ENTRADA.actividades[1].texto);
  assert.ok(r.avisos.some(function (a) { return a.indexOf('no existían') !== -1; }));
  assert.ok(r.avisos.some(function (a) { return a.indexOf('ACT-2') !== -1; }));
});

test('un responsable con evidencia real del texto se acepta y se liga al catálogo', function () {
  const r = gs.validarAnalisis_(ENTRADA, { actividades: [
    act('ACT-1', 'x', { puesto: 'Auxiliar de Compras', id_puesto: 'PUE-1', evidencia: 'el auxiliar de compras' })
  ] });
  const resp = r.analisis.actividades[0].responsable;
  assert.strictEqual(resp.idPuesto, 'PUE-1');
  assert.strictEqual(resp.puesto, 'Auxiliar de Compras');
  assert.strictEqual(resp.requiereConfirmacion, false);
});

test('la evidencia se compara sin importar acentos, mayúsculas ni puntuación', function () {
  const r = gs.validarAnalisis_(ENTRADA, { actividades: [
    act('ACT-3', 'x', { puesto: 'Jefe de Compras', id_puesto: 'PUE-2', evidencia: 'El Jefe de Compras, revisa' })
  ] });
  assert.strictEqual(r.analisis.actividades[2].responsable.idPuesto, 'PUE-2');
});

test('un responsable inventado se descarta y se pregunta quién hace la actividad', function () {
  const r = gs.validarAnalisis_(ENTRADA, { actividades: [
    act('ACT-2', 'El Analista de Tesorería captura los datos en SAP.',
      { puesto: 'Analista de Tesorería', id_puesto: 'PUE-3', evidencia: 'el analista de tesoreria captura' })
  ] });
  assert.strictEqual(r.analisis.actividades[1].responsable, null);
  assert.ok(r.analisis.preguntas.some(function (q) {
    return q.idActividad === 'ACT-2' && q.tipo === 'responsable' && q.pregunta === '¿Qué puesto realiza esta actividad?';
  }));
  assert.ok(r.avisos.some(function (a) { return a.indexOf('Analista de Tesorería') !== -1; }));
});

test('si la IA se equivoca de ID, se liga al puesto del catálogo que el texto sí menciona', function () {
  const r = gs.validarAnalisis_(ENTRADA, { actividades: [
    act('ACT-1', 'x', { puesto: 'Comprador', id_puesto: 'PUE-3', evidencia: 'el auxiliar de compras' })
  ] });
  const resp = r.analisis.actividades[0].responsable;
  assert.strictEqual(resp.idPuesto, 'PUE-1');
  assert.strictEqual(resp.puesto, 'Auxiliar de Compras');
  assert.strictEqual(resp.requiereConfirmacion, false);
});

test('un puesto que no está en el catálogo se conserva pero pide confirmación', function () {
  const entrada = Object.assign({}, ENTRADA, { actividades: [{ id: 'ACT-1', texto: 'el coordinador de pagos valida la factura' }] });
  const r = gs.validarAnalisis_(entrada, { actividades: [
    act('ACT-1', 'x', { puesto: 'Coordinador de Pagos', id_puesto: null, evidencia: 'el coordinador de pagos' })
  ] });
  const resp = r.analisis.actividades[0].responsable;
  assert.strictEqual(resp.puesto, 'Coordinador de Pagos');
  assert.strictEqual(resp.idPuesto, null);
  assert.strictEqual(resp.requiereConfirmacion, true);
});

test('si la evidencia menciona dos puestos del catálogo, es ambiguo y se pide confirmación', function () {
  const entrada = Object.assign({}, ENTRADA, { actividades: [{ id: 'ACT-1', texto: 'el auxiliar de compras o el jefe de compras revisan' }] });
  const r = gs.validarAnalisis_(entrada, { actividades: [
    act('ACT-1', 'x', { puesto: 'Compras', id_puesto: null, evidencia: 'el auxiliar de compras o el jefe de compras' })
  ] });
  assert.strictEqual(r.analisis.actividades[0].responsable.requiereConfirmacion, true);
});

test('avisa si la redacción propuesta agrega cifras que no estaban', function () {
  const r = gs.validarAnalisis_(ENTRADA, { actividades: [
    act('ACT-3', 'El Jefe de Compras revisa y autoriza en un plazo máximo de 2 días y 24 horas.')
  ] });
  assert.deepStrictEqual(plano(r.analisis.actividades[2].cifrasNuevas), ['24']);
  assert.ok(r.avisos.some(function (a) { return a.indexOf('24') !== -1; }));
});

test('las preguntas se limpian: sin duplicados, tipos válidos y actividades existentes', function () {
  const r = gs.validarAnalisis_(ENTRADA, {
    actividades: [],
    preguntas: [
      { id_actividad: 'ACT-1', tipo: 'excepcion', pregunta: '¿Qué ocurre si falta la constancia fiscal?' },
      { id_actividad: 'ACT-1', tipo: 'excepcion', pregunta: '¿Que ocurre si falta la constancia fiscal' },
      { id_actividad: 'ACT-77', tipo: 'inventado', pregunta: '¿Quién autoriza?' },
      { id_actividad: 'ACT-2', tipo: 'responsable', pregunta: '¿Quién captura?' },
      { pregunta: '' }
    ]
  });
  const generales = r.analisis.preguntas.filter(function (q) { return q.tipo !== 'responsable'; });
  assert.strictEqual(generales.length, 2);
  assert.strictEqual(generales[1].idActividad, null);
  assert.strictEqual(generales[1].tipo, 'otro');
  // La de responsable de ACT-2 la pone el validador una sola vez.
  assert.strictEqual(r.analisis.preguntas.filter(function (q) { return q.idActividad === 'ACT-2' && q.tipo === 'responsable'; }).length, 1);
});

test('responsabilidades solo de puestos confirmados en sus actividades', function () {
  const r = gs.validarAnalisis_(ENTRADA, {
    actividades: [act('ACT-1', 'x', { puesto: 'Auxiliar de Compras', id_puesto: 'PUE-1', evidencia: 'auxiliar de compras' })],
    responsabilidades: [
      { puesto: 'Auxiliar de Compras', id_puesto: 'PUE-1', responsabilidades: ['Recibir y revisar solicitudes'], actividades: ['ACT-1'] },
      { puesto: 'Analista de Tesorería', id_puesto: 'PUE-3', responsabilidades: ['Registrar cuentas'], actividades: ['ACT-2'] },
      { puesto: 'Jefe de Compras', id_puesto: 'PUE-2', responsabilidades: ['Autorizar'], actividades: ['ACT-1'] }
    ]
  });
  assert.deepStrictEqual(plano(r.analisis.responsabilidades.map(function (x) { return x.puesto; })), ['Auxiliar de Compras']);
});

test('definiciones solo de términos que aparecen en el texto', function () {
  const r = gs.validarAnalisis_(ENTRADA, { actividades: [], definiciones: [
    { termino: 'SAP', definicion: 'Sistema de gestión.' },
    { termino: 'OC', definicion: 'Orden de compra.' }
  ] });
  assert.deepStrictEqual(plano(r.analisis.definiciones.map(function (d) { return d.termino; })), ['SAP']);
});

test('si la IA responde basura, se conserva todo lo del colaborador y se pregunta cada responsable', function () {
  const r = gs.validarAnalisis_(ENTRADA, null);
  assert.strictEqual(r.analisis.actividades.length, 3);
  assert.strictEqual(r.analisis.objetivo, null);
  assert.strictEqual(r.analisis.preguntas.filter(function (q) { return q.tipo === 'responsable'; }).length, 3);
});

test('extraerJson_ lee la respuesta aunque venga envuelta en ```json', function () {
  assert.deepStrictEqual(plano(gs.extraerJson_('```json\n{"a":1}\n```')), { a: 1 });
  assert.deepStrictEqual(plano(gs.extraerJson_('Aquí está: {"a":2} listo')), { a: 2 });
  assert.strictEqual(gs.extraerJson_('sin json'), null);
});
