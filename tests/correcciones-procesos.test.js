// Procesos corrige el contenido y el código (src/services/Revision.gs, decisiones 26 y 28), y
// «Puestos y responsabilidades» en una sola sección (decisión 25).
const test = require('node:test');
const assert = require('node:assert');
const { cargarGs } = require('./cargar-gs');

const gs = cargarGs(['src/config/Config.gs', 'src/config/Catalogos.gs', 'src/utils/Texto.gs', 'src/utils/Huella.gs',
  'src/services/Sesion.gs', 'src/services/Usuarios.gs', 'src/services/Solicitudes.gs', 'src/services/AnalisisSolicitud.gs',
  'src/services/Documentos.gs', 'src/services/AutorizacionCH.gs', 'src/services/Revision.gs']);
const plano = function (v) { return JSON.parse(JSON.stringify(v)); };

const PAOLA = { registrado: true, idUsuario: 'USR-0004', nombre: 'Paola Méndez', perfiles: ['REVISOR'] };
const CARLOS = { registrado: true, idUsuario: 'USR-0005', nombre: 'Carlos Ruiz', perfiles: ['REVISOR'] };
function fila(cambios) {
  return Object.assign({ _fila: 2, ID_SOLICITUD: 'SOL-1', TIPO_SOLICITUD: 'NUEVO', ESTADO: 'EN_REVISION', ELABORO_ID: 'USR-0002',
    REVISOR_ASIGNADO_ID: 'USR-0004', HUELLA_CONFIRMADA: 'h1', HUELLA_REVISOR: '', CODIGO: '' }, cambios);
}
const DET = { id: 'SOL-1', prefijo: 'P', cuerpo: 'CI04', objetivo: 'Dar de alta', alcance: 'Compras', inicio: 'Llega', fin: 'Termina',
  responsabilidades: ['Auxiliar: recibe'], definiciones: [],
  actividades: [{ id: 'ACT-1', texto: 'Recibe', responsable: 'Auxiliar', imagenes: [] }, { id: 'ACT-2', texto: 'Autoriza', responsable: 'Jefe', imagenes: [] }] };
const ACTIVIDADES = [{ _fila: 5, ID_ACTIVIDAD: 'ACT-1', ID_SOLICITUD: 'SOL-1', ELIMINADA: 'NO' }, { _fila: 6, ID_ACTIVIDAD: 'ACT-2', ID_SOLICITUD: 'SOL-1', ELIMINADA: 'NO' }];
const PUESTOS = [{ ID_PUESTO: 'PUE-1', NOMBRE: 'Jefe de Compras', SINONIMOS: 'jefe', ACTIVO: 'SI' }];

test('contenido aprobado: el que confirmó el colaborador o el que dejó Procesos al corregirlo', function () {
  assert.ok(gs.contenidoAprobado_(fila(), 'h1'));
  assert.ok(gs.contenidoAprobado_(fila({ HUELLA_REVISOR: 'h2' }), 'h2'));
  assert.ok(!gs.contenidoAprobado_(fila({ HUELLA_REVISOR: 'h2' }), 'h3'));
  assert.ok(!gs.contenidoAprobado_(fila({ HUELLA_CONFIRMADA: '' }), ''), 'una huella vacía nunca');
});

test('corregir texto: solo el revisor asignado, en revisión, sin dejarlo vacío', function () {
  const p = plano(gs.planEdicionRevisor_({ apartado: 'OBJETIVO', valor: ' Dar de alta proveedores ' }, fila(), DET, ACTIVIDADES, PAOLA, PUESTOS));
  assert.deepStrictEqual([p.errores, p.solicitud, p.antes, p.despues], [[], { OBJETIVO: 'Dar de alta proveedores' }, 'Dar de alta', 'Dar de alta proveedores']);
  assert.ok(gs.planEdicionRevisor_({ apartado: 'OBJETIVO', valor: 'Dar de alta' }, fila(), DET, ACTIVIDADES, PAOLA, PUESTOS).sinCambios);
  assert.ok(/vacío/.test(gs.planEdicionRevisor_({ apartado: 'FIN', valor: '  ' }, fila(), DET, ACTIVIDADES, PAOLA, PUESTOS).errores.join()));
  assert.ok(/primero toma/.test(gs.planEdicionRevisor_({ apartado: 'FIN', valor: 'x' }, fila(), DET, ACTIVIDADES, CARLOS, PUESTOS).errores.join()));
  assert.ok(/primero toma/.test(gs.planEdicionRevisor_({ apartado: 'FIN', valor: 'x' }, fila({ ESTADO: 'DEVUELTO' }), DET, ACTIVIDADES, PAOLA, PUESTOS).errores.join()));
  assert.ok(/no se puede corregir/.test(gs.planEdicionRevisor_({ apartado: 'NOMBRE', valor: 'x' }, fila(), DET, ACTIVIDADES, PAOLA, PUESTOS).errores.join()));
});

test('corregir una actividad: el texto va al del documento y el responsable se coteja con el catálogo', function () {
  const p = plano(gs.planEdicionRevisor_({ apartado: 'ACTIVIDAD', idActividad: 'ACT-2', valor: 'Autoriza el alta', responsable: 'jefe' },
    fila(), DET, ACTIVIDADES, PAOLA, PUESTOS));
  assert.deepStrictEqual(p.actividad, { _fila: 6, cambios: { TEXTO_FINAL: 'Autoriza el alta', PUESTO_TEXTO: 'Jefe de Compras', ID_PUESTO: 'PUE-1', RESPONSABLE_CONFIRMADO: 'SI' } });
  assert.deepStrictEqual([p.antes, p.despues], ['Actividad 2 · Jefe: Autoriza', 'Actividad 2 · jefe: Autoriza el alta']);
  assert.ok(/ya no existe/.test(gs.planEdicionRevisor_({ apartado: 'ACTIVIDAD', idActividad: 'ACT-9', valor: 'x' }, fila(), DET, ACTIVIDADES, PAOLA, PUESTOS).errores.join()));
});

test('corregir puestos y responsabilidades: un renglón que solo repite un puesto no se guarda', function () {
  const p = plano(gs.planEdicionRevisor_({ apartado: 'PUESTOS', valor: 'Auxiliar: recibe y revisa\nJefe\n' }, fila(), DET, ACTIVIDADES, PAOLA, PUESTOS));
  assert.deepStrictEqual(p.solicitud, { RESPONSABILIDADES: '["Auxiliar: recibe y revisa"]' });
});

test('el registro de la corrección dice cómo estaba y cómo quedó', function () {
  assert.strictEqual(gs.textoCorreccion_('a', ''), 'Antes: a\nAhora: (vacío)');
});

test('puestos y responsabilidades: cada puesto con lo suyo; lo de otros puestos al final', function () {
  const det = Object.assign({}, DET, { responsabilidades: ['auxiliar: Recibe la solicitud', 'Jefe', 'Contraloría: revisa montos', 'Auxiliar: archiva'] });
  assert.deepStrictEqual(plano(gs.puestosYResponsabilidades_(det)),
    ['Auxiliar: Recibe la solicitud; archiva', 'Jefe', 'Contraloría: revisa montos']);
  assert.deepStrictEqual(plano(gs.puestosYResponsabilidades_(Object.assign({}, DET, { responsabilidades: [] }))), ['Auxiliar', 'Jefe']);
});

test('corregir el código: después del Vo.Bo., con el formato de la solicitud y sin repetir', function () {
  const ch = fila({ ESTADO: 'EN_AUTORIZACION_CH', CODIGO: 'P-CI04-001' });
  assert.deepStrictEqual(plano(gs.planCambioCodigo_(ch, PAOLA, DET, 'p-ci04-007', [])), { errores: [], codigo: 'P-CI04-007' });
  assert.ok(/ya está en uso/.test(gs.planCambioCodigo_(ch, PAOLA, DET, 'P-CI04-002', ['P-CI04-002']).errores.join()));
  assert.ok(/debe ser P-CI04-NNN/.test(gs.planCambioCodigo_(ch, PAOLA, DET, 'P-XX01-002', []).errores.join()));
  assert.ok(/mismo código/.test(gs.planCambioCodigo_(ch, PAOLA, DET, 'P-CI04-001', []).errores.join()));
  assert.ok(/después del Vo.Bo./.test(gs.planCambioCodigo_(fila(), PAOLA, DET, 'P-CI04-003', []).errores.join()));
  assert.ok(/lo corrige Procesos/.test(gs.planCambioCodigo_(fila({ ESTADO: 'AUTORIZADO', ELABORO_ID: 'USR-0004' }), PAOLA, DET, 'P-CI04-003', []).errores.join()));
});

test('las correcciones de Procesos no se atienden ni se cierran', function () {
  const obs = { ID_OBSERVACION: 'OBS-1', ESTADO: 'CAMBIO' };
  const ana = { registrado: true, idUsuario: 'USR-0002', perfiles: ['COLABORADOR'] };
  assert.ok(/no hay que atenderla/.test(gs.planCambioObservacion_(obs, fila({ ESTADO: 'DEVUELTO' }), ana, 'ATENDER', '', new Date()).errores.join()));
  assert.ok(/no hay que atenderla/.test(gs.planCambioObservacion_(obs, fila(), PAOLA, 'CERRAR', '', new Date()).errores.join()));
});
