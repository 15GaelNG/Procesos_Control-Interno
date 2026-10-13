/**
 * CATÁLOGOS FIJOS DEL SISTEMA
 *
 * Valores que el código necesita conocer (perfiles, estados, tipos de solicitud…). Los catálogos
 * que Procesos administra (departamentos, puestos, tipos de documento, cadenas de autorización)
 * viven en la base de datos, no aquí.
 */

// Perfiles (requerimiento §1). Una persona puede tener varios (hoja UsuarioPerfiles).
// Ser ADMINISTRADOR no da permiso de revisar ni autorizar.
const PERFILES = {
  COLABORADOR: 'COLABORADOR',     // Elabora y captura el proceso
  REVISOR: 'REVISOR',             // Área de Procesos: revisa, observa, devuelve, da Vo.Bo.
  AUTORIZADOR: 'AUTORIZADOR',     // Responsable del área o Dirección, según su nivel en la cadena
  ADMINISTRADOR: 'ADMINISTRADOR'  // Usuarios, catálogos, plantillas y parámetros
};

const TIPOS_SOLICITUD = {
  NUEVO: 'NUEVO',
  ACTUALIZACION: 'ACTUALIZACION'
};

// Estados de una solicitud (requerimiento §4.3 y docs/flujos.md).
const ESTADOS = {
  BORRADOR: 'BORRADOR',
  CONFIRMADO: 'CONFIRMADO',              // El colaborador confirmó el borrador (no es Vo.Bo.)
  EN_REVISION: 'EN_REVISION',            // En la bandeja de Procesos
  DEVUELTO: 'DEVUELTO',                  // Con observaciones, de vuelta con el colaborador
  EN_AUTORIZACION: 'EN_AUTORIZACION',    // Recorriendo la cadena (ver NIVEL_AUTORIZACION_ACTUAL)
  AUTORIZADO: 'AUTORIZADO',              // Vo.Bo. final: se genera el archivo sin marca de agua
  NO_PROCEDENTE: 'NO_PROCEDENTE',        // Cerrada por Procesos con motivo; no consume código
  CANCELADO: 'CANCELADO'                 // El colaborador desistió de su borrador
};

// Qué estado puede pasar a cuál. Cualquier cambio de estado se valida contra esta tabla.
const TRANSICIONES = {
  BORRADOR: ['CONFIRMADO', 'CANCELADO'],
  CONFIRMADO: ['BORRADOR', 'EN_REVISION', 'CANCELADO'],
  EN_REVISION: ['DEVUELTO', 'EN_AUTORIZACION', 'NO_PROCEDENTE'],
  DEVUELTO: ['CONFIRMADO', 'CANCELADO'],
  EN_AUTORIZACION: ['EN_AUTORIZACION', 'DEVUELTO', 'AUTORIZADO'],
  AUTORIZADO: [],
  NO_PROCEDENTE: [],
  CANCELADO: []
};

const ESTATUS_DOCUMENTO = {
  VIGENTE: 'VIGENTE',
  OBSOLETO: 'OBSOLETO'
};

const ESTADOS_ACLARACION = ['PENDIENTE', 'RESPONDIDA', 'NO_APLICA', 'NO_LO_SE'];
const ESTADOS_OBSERVACION = ['ABIERTA', 'ATENDIDA', 'CERRADA'];
const DECISIONES_PROPUESTA = ['PENDIENTE', 'ACEPTADA', 'EDITADA', 'RECHAZADA'];
const DECISIONES_AUTORIZACION = ['PENDIENTE', 'AUTORIZADO', 'DEVUELTO'];

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
