/**
 * CATÁLOGOS FIJOS DEL SISTEMA
 *
 * Valores que el código necesita conocer (perfiles, estados, tipos de solicitud…). Los catálogos
 * que Procesos administra (departamentos, áreas, puestos, tipos de documento) viven en la base de
 * datos, no aquí.
 */

// Perfiles (requerimiento §1). Una persona puede tener varios (hoja UsuarioPerfiles).
// Ser ADMINISTRADOR no da permiso de revisar. No hay perfil de autorizador: el responsable y el
// director autorizan en el sistema CH (decisión 10).
const PERFILES = {
  COLABORADOR: 'COLABORADOR',     // Elabora y captura el proceso
  REVISOR: 'REVISOR',             // Área de Procesos: revisa, observa, devuelve, da Vo.Bo., registra lo de CH
  ADMINISTRADOR: 'ADMINISTRADOR'  // Usuarios, catálogos, plantillas y parámetros
};

// Cómo se llama cada perfil en pantalla.
const NOMBRES_PERFIL = {
  COLABORADOR: 'Colaborador',
  REVISOR: 'Revisor de Procesos',
  ADMINISTRADOR: 'Administrador'
};

const TIPOS_SOLICITUD = {
  NUEVO: 'NUEVO',
  ACTUALIZACION: 'ACTUALIZACION'
};

// Estados de una solicitud (requerimiento §4.3, ajustado por las decisiones 10 y 15; ver
// docs/analisis-inicial.md §3.2).
const ESTADOS = {
  BORRADOR: 'BORRADOR',
  CONFIRMADO: 'CONFIRMADO',                  // El colaborador confirmó el borrador (no es Vo.Bo.)
  EN_REVISION: 'EN_REVISION',                // En la bandeja del revisor de Procesos asignado
  DEVUELTO: 'DEVUELTO',                      // Con observaciones, de vuelta con el colaborador
  EN_AUTORIZACION_CH: 'EN_AUTORIZACION_CH',  // Con Vo.Bo. de Procesos; se firma en el sistema CH
  AUTORIZADO: 'AUTORIZADO',                  // CH autorizó: se genera el archivo sin marca de agua
  NO_PROCEDENTE: 'NO_PROCEDENTE',            // Cerrada por Procesos con motivo; no consume código
  CANCELADO: 'CANCELADO'                     // El colaborador desistió de su borrador
};

// Qué estado puede pasar a cuál. Cualquier cambio de estado se valida contra esta tabla.
// Si CH rechaza, por ahora regresa al colaborador (DEVUELTO); falta que Procesos lo confirme (pregunta D).
const TRANSICIONES = {
  BORRADOR: ['CONFIRMADO', 'CANCELADO'],
  CONFIRMADO: ['BORRADOR', 'EN_REVISION', 'CANCELADO'],
  EN_REVISION: ['DEVUELTO', 'EN_AUTORIZACION_CH', 'NO_PROCEDENTE'],
  DEVUELTO: ['CONFIRMADO', 'CANCELADO'],
  EN_AUTORIZACION_CH: ['AUTORIZADO', 'DEVUELTO'],
  AUTORIZADO: [],
  NO_PROCEDENTE: [],
  CANCELADO: []
};

// Cómo se llama cada estado en pantalla.
const NOMBRES_ESTADO = {
  BORRADOR: 'Borrador',
  CONFIRMADO: 'Confirmado',
  EN_REVISION: 'En revisión de Procesos',
  DEVUELTO: 'Con observaciones',
  EN_AUTORIZACION_CH: 'En autorización (CH)',
  AUTORIZADO: 'Autorizado',
  NO_PROCEDENTE: 'No procedente',
  CANCELADO: 'Cancelado'
};

// Lo decide Procesos al dar el Vo.Bo. de una actualización (respuesta de Procesos sobre versiones).
const TIPOS_CAMBIO = {
  MAYOR: 'MAYOR',   // 1.0 → 2.0: cambian actividades, responsables, controles o estructura
  MENOR: 'MENOR'    // 1.0 → 1.1: redacción, aclaraciones o correcciones puntuales
};

const ESTATUS_DOCUMENTO = {
  VIGENTE: 'VIGENTE',
  OBSOLETO: 'OBSOLETO'
};

const ESTADOS_ACLARACION = ['PENDIENTE', 'RESPONDIDA', 'NO_APLICA', 'NO_LO_SE'];
const ESTADOS_OBSERVACION = ['ABIERTA', 'ATENDIDA', 'CERRADA'];
const DECISIONES_PROPUESTA = ['PENDIENTE', 'ACEPTADA', 'EDITADA', 'RECHAZADA'];
// Resultado de cada envío a CH (hoja EnviosCH), que Procesos registra a mano (decisión 15).
const RESULTADOS_CH = ['PENDIENTE', 'AUTORIZADO', 'RECHAZADO'];

// Preguntas complementarias de la IA (requerimiento §3.3). La de responsable la agrega el validador
// (ia/Analisis.gs) cuando el texto no dice quién hace la actividad.
const PREGUNTA_RESPONSABLE = '¿Qué puesto realiza esta actividad?';
const TIPOS_PREGUNTA = ['responsable', 'entrada', 'documento', 'sistema', 'validacion', 'autorizacion',
  'plazo', 'evidencia', 'excepcion', 'cierre', 'otro'];

// Motivos del control de cambios (requerimiento §4.2). COMPLETA excluye a los demás.
const MOTIVOS_CAMBIO = {
  CAMBIO_RESPONSABLE: 'Actualización por cambio de responsable',
  ACTIVIDADES_AGREGADAS: 'Se agregaron actividades',
  ACTIVIDADES_ELIMINADAS: 'Se eliminaron actividades',
  COMPLETA: 'Actualización completa del proceso'
};
