// Historial de cambios de una solicitud (src/services/Historial.gs, decisión 26): correcciones de
// Procesos y propuestas de la IA con antes y después, y los pasos del trámite; lo más reciente primero.
const test = require('node:test');
const assert = require('node:assert');
const { cargarGs } = require('./cargar-gs');

const gs = cargarGs(['src/config/Config.gs', 'src/config/Catalogos.gs', 'src/utils/Texto.gs', 'src/services/Usuarios.gs',
  'src/services/Solicitudes.gs', 'src/services/Historial.gs']);
const plano = function (v) { return JSON.parse(JSON.stringify(v)); };

const FILA = { ID_SOLICITUD: 'SOL-1', ELABORO_NOMBRE: 'Ana López' };
const DET = { actividades: [{ id: 'ACT-1' }, { id: 'ACT-2' }] };
const USUARIOS = [{ CORREO: 'ana@cm.com', NOMBRE: 'Ana López' }, { CORREO: 'paola@cm.com', NOMBRE: 'Paola Méndez' },
  { CORREO: 'gael@cm.com', NOMBRE: 'Gael' }];
const dia = function (d, h) { return new Date(2026, 9, d, h || 9); };

test('arma el historial con correcciones de Procesos, propuestas de la IA y pasos del trámite', function () {
  const bitacora = [
    { FECHA: dia(20), USUARIO: 'ana@cm.com', ACCION: 'CREAR_SOLICITUD', ID_SOLICITUD: 'SOL-1', DETALLE: 'Alta' },
    { FECHA: dia(22), USUARIO: 'gael@cm.com', ACCION: 'ENVIAR_REVISION', ID_SOLICITUD: 'SOL-1', DETALLE: '[viendo como ana@cm.com] Revisión 1.' },
    { FECHA: dia(23), USUARIO: 'ana@cm.com', ACCION: 'DESCARGAR_ARCHIVO', ID_SOLICITUD: 'SOL-1', DETALLE: 'x.pdf' },
    { FECHA: dia(23), USUARIO: 'paola@cm.com', ACCION: 'EDITAR_REVISOR', ID_SOLICITUD: 'SOL-1', DETALLE: 'repetido' },
    { FECHA: dia(23), USUARIO: 'ana@cm.com', ACCION: 'CREAR_SOLICITUD', ID_SOLICITUD: 'SOL-9', DETALLE: 'otra' }
  ];
  const observaciones = [
    { ID_SOLICITUD: 'SOL-1', ESTADO: 'CAMBIO', APARTADO: 'ACTIVIDAD', ID_ACTIVIDAD: 'ACT-2', AUTOR_NOMBRE: 'Paola Méndez', FECHA: dia(24),
      TEXTO: 'Antes: Actividad 2: Revisa\nAhora: Actividad 2: Revisa la constancia' },
    { ID_SOLICITUD: 'SOL-1', ESTADO: 'ABIERTA', APARTADO: 'OBJETIVO', TEXTO: 'no es un cambio', FECHA: dia(24) }
  ];
  const propuestas = [
    { ID_SOLICITUD: 'SOL-1', CAMPO: 'RESPONSABILIDADES', ID_ACTIVIDAD: '', DECISION: 'ACEPTADA', VALOR_ANTERIOR: '[]',
      VALOR_FINAL: '["Auxiliar: recibe","Jefe: autoriza"]', FECHA_DECISION: dia(21) },
    { ID_SOLICITUD: 'SOL-1', CAMPO: 'TEXTO', ID_ACTIVIDAD: 'ACT-1', DECISION: 'EDITADA', VALOR_ANTERIOR: 'recibe', VALOR_FINAL: 'Recibe.', FECHA_DECISION: dia(21, 10) },
    { ID_SOLICITUD: 'SOL-1', CAMPO: 'OBJETIVO', DECISION: 'RECHAZADA', FECHA_DECISION: dia(21) },
    { ID_SOLICITUD: 'SOL-1', CAMPO: 'ORDEN', DECISION: 'ACEPTADA', FECHA_DECISION: dia(21) }
  ];
  const h = plano(gs.historialSolicitud_('SOL-1', FILA, DET, bitacora, observaciones, propuestas, USUARIOS, function (f) { return f.getDate() + '/10'; }));
  assert.deepStrictEqual(h.map(function (e) { return [e.fecha, e.tipo, e.titulo, e.quien]; }), [
    ['24/10', 'PROCESOS', 'Procesos corrigió: Actividad 2', 'Paola Méndez'],
    ['22/10', 'TRAMITE', 'Enviada a revisión', 'Ana López (con «Ver como»)'],
    ['21/10', 'IA', 'Aceptó con cambios la propuesta de la IA: Actividad 1 · Redacción', 'Ana López'],
    ['21/10', 'IA', 'Aceptó la propuesta de la IA: Responsabilidades', 'Ana López'],
    ['20/10', 'TRAMITE', 'Nueva solicitud', 'Ana López']
  ]);
  assert.deepStrictEqual([h[0].antes, h[0].despues], ['Actividad 2: Revisa', 'Actividad 2: Revisa la constancia']);
  assert.strictEqual(h[1].detalle, 'Revisión 1.');
  assert.deepStrictEqual([h[3].antes, h[3].despues], ['', 'Auxiliar: recibe\nJefe: autoriza']);
});
