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

// Pantallas de la app y qué perfiles las ven (requerimiento §1, ajustado por la decisión 10).
// `perfiles` vacío = todos. `fase` = cuándo llega (sin `fase`, ya existe). `acciones` es lo que ese
// perfil podrá hacer ahí; se muestra mientras la pantalla está en construcción, para validarlo con
// Procesos. Los perfiles van como texto: una constante no debe leer otra al declararse.
const MODULOS_APP = [
  { id: 'inicio', nombre: 'Inicio', icono: 'house', perfiles: [] },
  { id: 'mis-solicitudes', seccion: 'Documentar', nombre: 'Mis solicitudes', icono: 'folder-open',
    perfiles: ['COLABORADOR'],
    descripcion: 'Tus documentos en elaboración y en qué etapa va cada uno.',
    acciones: ['Ver tus documentos y el estado de cada uno', 'Continuar un borrador',
      'Atender las observaciones de Procesos', 'Descargar el preliminar con «COPIA NO AUTORIZADA»'] },
  { id: 'nueva', seccion: 'Documentar', nombre: 'Nueva solicitud', icono: 'file-plus-2', fase: 'la fase 2',
    perfiles: ['COLABORADOR'],
    descripcion: 'Documenta un proceso nuevo o actualiza uno vigente, actividad por actividad.',
    acciones: ['Elegir si es un documento nuevo o la actualización de uno vigente',
      'Capturar cómo inicia, cada actividad con su responsable e imágenes, y cómo termina',
      'Pedir a la IA que mejore la redacción y responder sus preguntas (fase 3)',
      'Confirmar el borrador y enviarlo a revisión de Procesos'] },
  { id: 'revision', seccion: 'Área de Procesos', nombre: 'Bandeja de revisión', icono: 'clipboard-check',
    fase: 'la fase 5', perfiles: ['REVISOR'],
    descripcion: 'Revisar, hacer observaciones, asignar código y dar el Vo.Bo.',
    acciones: ['Ver las solicitudes que tienes asignadas', 'Hacer observaciones por apartado o por actividad',
      'Devolver al colaborador o cerrar como no procedente', 'Asignar código y versión, y dar el Vo.Bo. de Procesos'] },
  { id: 'envios-ch', seccion: 'Área de Procesos', nombre: 'Envíos a CH', icono: 'send', fase: 'la fase 6',
    perfiles: ['REVISOR'],
    descripcion: 'Archivos para subir al sistema CH y registro de su resultado.',
    acciones: ['Descargar el PDF y el Word con marca de agua para subirlos a CH',
      'Registrar lo que resolvió CH: autorizado (quién y cuándo) o rechazado',
      'Con «autorizado», generar el documento final sin marca de agua'] },
  { id: 'inventario', seccion: 'Área de Procesos', nombre: 'Inventario documental', icono: 'library',
    fase: 'la fase 6', perfiles: ['REVISOR', 'ADMINISTRADOR'],
    descripcion: 'Documentos vigentes, su versión y su historial de cambios.',
    acciones: ['Consultar los documentos vigentes con su código y versión',
      'Ver el historial de versiones y el control de cambios', 'Descargar el documento oficial'] },
  { id: 'usuarios', seccion: 'Administración', nombre: 'Usuarios y perfiles', icono: 'users',
    fase: 'esta fase (fase 1)', perfiles: ['ADMINISTRADOR'],
    descripcion: 'Quién entra al sistema y con qué perfil.',
    acciones: ['Dar de alta a las personas con su correo de Ciudad Maderas', 'Asignar uno o varios perfiles',
      'Indicar por qué departamentos puede documentar cada quien', 'Dar de baja sin borrar su historial'] },
  { id: 'catalogos', seccion: 'Administración', nombre: 'Catálogos', icono: 'list-tree',
    perfiles: ['ADMINISTRADOR'],
    descripcion: 'Departamentos, áreas y subáreas con su clave para el código documental.',
    acciones: ['Consultar departamentos, áreas y subáreas con su clave (P-CI04-001)',
      'Puestos: la IA los usa para reconocer al responsable de cada actividad (siguiente paso)',
      'Agregar, corregir o dar de baja sin borrar (siguiente paso)'] },
  { id: 'plantillas', seccion: 'Administración', nombre: 'Plantillas y parámetros', icono: 'sliders-horizontal',
    fase: 'la fase 4', perfiles: ['ADMINISTRADOR'],
    descripcion: 'Plantilla de cada tipo de documento y ajustes del sistema.',
    acciones: ['Subir la plantilla de cada tipo de documento (preliminar y final)',
      'Ajustar la marca de agua, las imágenes y el uso de la IA'] }
];

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
