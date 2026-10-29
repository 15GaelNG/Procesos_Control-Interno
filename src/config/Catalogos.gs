/**
 * CATÁLOGOS FIJOS DEL SISTEMA
 *
 * Valores que el código necesita conocer (perfiles, estados, tipos de solicitud…). Los catálogos
 * que Procesos administra (departamentos, áreas, puestos, tipos de documento) viven en la base de
 * datos, no aquí.
 */

// Perfiles (requerimiento §1 y decisión 19). Una persona puede tener varios (hoja UsuarioPerfiles).
// No hay superusuario: ser ADMINISTRADOR no da permiso de revisar, y quien necesita más recibe varios
// perfiles explícitos. No hay perfil de autorizador: el responsable y el director autorizan en el
// sistema CH (decisión 10).
const PERFILES = {
  COLABORADOR: 'COLABORADOR',     // Elabora y captura el proceso
  REVISOR: 'REVISOR',             // Área de Procesos: revisa, observa, devuelve, da Vo.Bo., registra lo de CH
  ADMINISTRADOR: 'ADMINISTRADOR', // Usuarios, catálogos, plantillas y parámetros
  SOPORTE_CI: 'SOPORTE_CI'        // Control Interno: consulta todo, incluida la bitácora; no cambia nada
};

// Cómo se llama cada perfil en pantalla.
const NOMBRES_PERFIL = {
  COLABORADOR: 'Colaborador',
  REVISOR: 'Revisor de Procesos',
  ADMINISTRADOR: 'Administrador',
  SOPORTE_CI: 'Soporte CI'
};

// Qué hace cada perfil, para la pantalla de usuarios.
const DESCRIPCIONES_PERFIL = {
  COLABORADOR: 'Documenta sus procesos y los envía a revisión.',
  REVISOR: 'Área de Procesos: revisa, hace observaciones, da el Vo.Bo. y registra el resultado de CH. Nunca revisa lo que él mismo elaboró.',
  ADMINISTRADOR: 'Usuarios, catálogos, plantillas, parámetros y tablero de indicadores. Para revisar documentos necesita además el perfil de revisor.',
  SOPORTE_CI: 'Consulta todo (solicitudes, usuarios, catálogos y bitácora) sin poder cambiar nada.'
};

// Pantallas de la app y qué perfiles las ven (requerimiento §1, ajustado por la decisión 10).
// `perfiles` vacío = todos. `fase` = cuándo llega (sin `fase`, ya existe). `acciones` es lo que ese
// perfil podrá hacer ahí; se muestra mientras la pantalla está en construcción, para validarlo con
// Procesos. Los perfiles van como texto: una constante no debe leer otra al declararse.
const MODULOS_APP = [
  { id: 'inicio', nombre: 'Inicio', icono: 'house', perfiles: [] },
  { id: 'tablero', nombre: 'Tablero', icono: 'chart-column', perfiles: ['ADMINISTRADOR', 'SOPORTE_CI'],
    descripcion: 'Cómo van los procesos: cuántos hay en cada etapa, tiempos, devoluciones, departamentos, colaboradores y revisores.' },
  { id: 'mis-solicitudes', seccion: 'Documentar', nombre: 'Mis solicitudes', icono: 'folder-open',
    perfiles: ['COLABORADOR'],
    descripcion: 'Tus documentos en elaboración y en qué etapa va cada uno.',
    acciones: ['Ver tus documentos y el estado de cada uno', 'Continuar un borrador',
      'Atender las observaciones de Procesos', 'Descargar el preliminar con «COPIA NO AUTORIZADA»'] },
  { id: 'nueva', seccion: 'Documentar', nombre: 'Nueva solicitud', icono: 'file-plus-2',
    perfiles: ['COLABORADOR'],
    descripcion: 'Documenta un proceso nuevo o actualiza uno vigente, actividad por actividad.',
    acciones: ['Elegir si es un documento nuevo o la actualización de uno vigente',
      'Capturar cómo inicia, cada actividad con su responsable e imágenes, y cómo termina',
      'Pedir a la IA que mejore la redacción y responder sus preguntas (fase 3)',
      'Confirmar el borrador y enviarlo a revisión de Procesos'] },
  { id: 'revision', seccion: 'Área de Procesos', nombre: 'Bandeja de revisión', icono: 'clipboard-check',
    perfiles: ['REVISOR', 'ADMINISTRADOR'],
    descripcion: 'Revisar, hacer observaciones, asignar código y dar el Vo.Bo. (el administrador solo reasigna).',
    acciones: ['Ver las solicitudes que tienes asignadas', 'Hacer observaciones por apartado o por actividad',
      'Devolver al colaborador o cerrar como no procedente', 'Asignar código y versión, y dar el Vo.Bo. de Procesos'] },
  { id: 'envios-ch', seccion: 'Área de Procesos', nombre: 'Envíos a CH', icono: 'send',
    perfiles: ['REVISOR'],
    descripcion: 'Archivos para subir al sistema CH, registro de lo que resolvió y documento final sin marca.',
    acciones: ['Descargar el PDF y el Word con marca de agua para subirlos a CH',
      'Registrar lo que resolvió CH: autorizado (quién y cuándo) o rechazado',
      'Con «autorizado», generar el documento final sin marca de agua'] },
  { id: 'inventario', seccion: 'Área de Procesos', nombre: 'Inventario documental', icono: 'library',
    perfiles: ['REVISOR', 'ADMINISTRADOR', 'SOPORTE_CI'],
    descripcion: 'Documentos vigentes, su versión y su historial de cambios.',
    acciones: ['Consultar los documentos vigentes con su código y versión',
      'Ver el historial de versiones y el control de cambios', 'Descargar el documento oficial'] },
  { id: 'solicitudes', seccion: 'Consulta', nombre: 'Todas las solicitudes', icono: 'folder-search',
    fase: 'la fase 2', perfiles: ['SOPORTE_CI'],
    descripcion: 'Todas las solicitudes del sistema, en modo de solo lectura.',
    acciones: ['Ver todas las solicitudes y en qué estado va cada una',
      'Abrir cualquier solicitud con su contenido, observaciones e historial',
      'Sin poder editar, revisar ni aprobar nada'] },
  { id: 'usuarios', seccion: 'Administración', nombre: 'Usuarios y perfiles', icono: 'users',
    perfiles: ['ADMINISTRADOR', 'SOPORTE_CI'],
    descripcion: 'Quién entra al sistema, con qué perfil y por qué departamentos documenta.' },
  { id: 'catalogos', seccion: 'Administración', nombre: 'Catálogos', icono: 'list-tree',
    perfiles: ['ADMINISTRADOR', 'SOPORTE_CI'],
    descripcion: 'Departamentos, áreas y subáreas con su clave para el código documental.',
    acciones: ['Consultar departamentos, áreas y subáreas con su clave (P-CI04-001)',
      'Puestos: la IA los usa para reconocer al responsable de cada actividad (siguiente paso)',
      'Agregar, corregir o dar de baja sin borrar (siguiente paso)'] },
  { id: 'plantillas', seccion: 'Administración', nombre: 'Plantillas y parámetros', icono: 'sliders-horizontal',
    fase: 'la fase 4', perfiles: ['ADMINISTRADOR', 'SOPORTE_CI'],
    descripcion: 'Plantilla de cada tipo de documento y ajustes del sistema.',
    acciones: ['Subir la plantilla de cada tipo de documento (preliminar y final)',
      'Ajustar la marca de agua, las imágenes y el uso de la IA',
      'Soporte CI solo consulta'] },
  { id: 'bitacora', seccion: 'Administración', nombre: 'Bitácora', icono: 'scroll-text',
    perfiles: ['ADMINISTRADOR', 'SOPORTE_CI'],
    descripcion: 'Quién hizo qué y cuándo: altas, cambios de permisos, cargas de catálogo y más.' }
];

// Cómo se llama en pantalla cada acción de la Bitacora (las que no estén aquí se muestran tal cual).
const NOMBRES_ACCION = {
  ALTA_USUARIO: 'Alta de usuario',
  CAMBIO_USUARIO: 'Cambio de usuario',
  VER_COMO: 'Ver como (pruebas)',
  IMPORTAR_CATALOGO: 'Carga del catálogo',
  CREAR_SOLICITUD: 'Nueva solicitud',
  CANCELAR_SOLICITUD: 'Solicitud cancelada',
  EDITAR_CONFIRMADO: 'Cambio después de confirmar',
  ANALIZAR_IA: 'Análisis con IA',
  CONFIRMAR_SOLICITUD: 'Confirmación del colaborador',
  GENERAR_PRELIMINAR: 'Documento preliminar generado',
  DESCARGAR_ARCHIVO: 'Descarga de archivo',
  ENVIAR_REVISION: 'Enviada a revisión',
  TOMAR_SOLICITUD: 'Revisor asignado',
  REASIGNAR_SOLICITUD: 'Revisor reasignado',
  LIBERAR_SOLICITUD: 'Solicitud liberada',
  DEVOLVER_SOLICITUD: 'Devuelta con observaciones',
  NO_PROCEDENTE: 'Cerrada como no procedente',
  VOBO_PROCESOS: 'Vo.Bo. de Procesos',
  ENVIO_CH: 'Subida a CH',
  AUTORIZADO_CH: 'Autorizada en CH',
  RECHAZADO_CH: 'Rechazada en CH',
  GENERAR_FINAL: 'Documento final generado',
  EDITAR_REVISOR: 'Corrección de Procesos',
  CAMBIAR_CODIGO: 'Cambio de código',
  AVISO_CORREO: 'Aviso por correo',
  VER_ARCHIVO: 'Archivo consultado'
};

const TIPOS_SOLICITUD = {
  NUEVO: 'NUEVO',
  ACTUALIZACION: 'ACTUALIZACION'
};

const NOMBRES_TIPO_SOLICITUD = {
  NUEVO: 'Documento nuevo',
  ACTUALIZACION: 'Actualizar un documento vigente'
};

// En qué estados el colaborador puede editar su solicitud. Editar una CONFIRMADA la regresa a
// BORRADOR: la confirmación queda ligada al contenido que se confirmó (§3.5).
const ESTADOS_EDITABLES = ['BORRADOR', 'CONFIRMADO', 'DEVUELTO'];

// Palabras que no cuentan al buscar documentos con nombre parecido (§2.1).
const PALABRAS_VACIAS = ['de', 'del', 'la', 'las', 'el', 'los', 'y', 'e', 'o', 'u', 'para', 'por', 'en', 'a',
  'al', 'con', 'sin', 'un', 'una', 'unos', 'unas', 'su', 'sus', 'que', 'se', 'lo', 'proceso', 'procedimiento'];

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
// De dónde viene un documento del inventario: elaborado en este sistema o del inventario anterior de Procesos.
const ORIGENES_DOCUMENTO = { SISTEMA: 'SISTEMA', HISTORICO: 'HISTORICO' };
const NOMBRES_ORIGEN_DOCUMENTO = { SISTEMA: 'Elaborado en el sistema', HISTORICO: 'Inventario anterior' };

// REEMPLAZADA: quedó sin contestar/decidir y un análisis nuevo la sustituyó (se conserva para la historia).
const ESTADOS_ACLARACION = ['PENDIENTE', 'RESPONDIDA', 'NO_APLICA', 'NO_LO_SE', 'REEMPLAZADA'];
// Cómo se le dice a la IA lo que respondió la persona cuando eligió un botón en lugar de escribir.
const RESPUESTA_POR_ESTADO = { NO_APLICA: 'No aplica', NO_LO_SE: 'No lo sé' };
// ABIERTA (la hizo Procesos) → ATENDIDA (el colaborador dice que la corrigió) → CERRADA (Procesos lo verificó).
// CAMBIO: no es una observación sino el registro de una corrección que hizo Procesos (decisión 26).
const ESTADOS_OBSERVACION = ['ABIERTA', 'ATENDIDA', 'CERRADA', 'CAMBIO'];
const NOMBRES_ESTADO_OBSERVACION = { ABIERTA: 'Por atender', ATENDIDA: 'Atendida', CERRADA: 'Cerrada', CAMBIO: 'Corregido por Procesos' };
// De qué parte del documento es una observación. ACTIVIDAD lleva además ID_ACTIVIDAD.
const APARTADOS_OBSERVACION = {
  GENERAL: 'General', NOMBRE: 'Nombre del documento', INICIO: 'Inicio del proceso', OBJETIVO: 'Objetivo', ALCANCE: 'Alcance',
  PUESTOS: 'Puestos y responsabilidades', RESPONSABILIDADES: 'Responsabilidades', DEFINICIONES: 'Definiciones',
  ACTIVIDAD: 'Actividad', FIN: 'Fin del proceso'
};
// Historial de cambios de una solicitud (Historial.gs): lo de la bitácora que no es un cambio ni un paso
// del trámite, y cómo se llama cada campo de una propuesta de la IA.
const ACCIONES_FUERA_DEL_HISTORIAL = ['DESCARGAR_ARCHIVO', 'VER_ARCHIVO', 'VER_COMO', 'AVISO_CORREO', 'EDITAR_REVISOR', 'ANALIZAR_IA'];
const NOMBRES_CAMPO_HISTORIAL = { TEXTO: 'Redacción', RESPONSABLE: 'Responsable', OBJETIVO: 'Objetivo', ALCANCE: 'Alcance',
  RESPONSABILIDADES: 'Responsabilidades', DEFINICIONES: 'Definiciones' };
// Desde que se juntaron puestos y responsabilidades (decisión 25) ya no se observa aparte; se conserva por las viejas.
const APARTADOS_RETIRADOS = ['RESPONSABILIDADES'];
const DECISIONES_PROPUESTA = ['PENDIENTE', 'ACEPTADA', 'EDITADA', 'RECHAZADA', 'REEMPLAZADA'];

// Qué propone la IA (columna CAMPO de PropuestasIA). ORDEN es solo una sugerencia: la IA nunca
// reordena (§3.4); la persona reordena a mano si está de acuerdo.
const CAMPOS_PROPUESTA = ['TEXTO', 'RESPONSABLE', 'OBJETIVO', 'ALCANCE', 'RESPONSABILIDADES', 'DEFINICIONES', 'ORDEN'];
// «Aceptar todas»: las correcciones de redacción, o lo demás que propone el análisis (ORDEN no: solo informa).
const GRUPOS_PROPUESTA = {
  REDACCION: ['TEXTO'],
  DEMAS: ['RESPONSABLE', 'OBJETIVO', 'ALCANCE', 'RESPONSABILIDADES', 'DEFINICIONES']
};
// Resultado de cada envío a CH (hoja EnviosCH), que Procesos registra a mano (decisión 15).
const RESULTADOS_CH = ['PENDIENTE', 'AUTORIZADO', 'RECHAZADO'];

// Preguntas complementarias de la IA (requerimiento §3.3). La de responsable la agrega el validador
// (ia/Analisis.gs) cuando el texto no dice quién hace la actividad.
const PREGUNTA_RESPONSABLE = '¿Qué puesto realiza esta actividad?';
const TIPOS_PREGUNTA = ['responsable', 'entrada', 'documento', 'sistema', 'validacion', 'autorizacion',
  'plazo', 'evidencia', 'excepcion', 'cierre', 'otro'];
const NOMBRES_TIPO_PREGUNTA = {
  responsable: 'Responsable', entrada: 'Entrada', documento: 'Documento', sistema: 'Sistema', validacion: 'Validación',
  autorizacion: 'Autorización', plazo: 'Plazo', evidencia: 'Evidencia', excepcion: 'Excepción', cierre: 'Cierre', otro: 'Otro'
};

// Motivos del control de cambios (requerimiento §4.2). COMPLETA excluye a los demás.
const MOTIVOS_CAMBIO = {
  CAMBIO_RESPONSABLE: 'Actualización por cambio de responsable',
  ACTIVIDADES_AGREGADAS: 'Se agregaron actividades',
  ACTIVIDADES_ELIMINADAS: 'Se eliminaron actividades',
  COMPLETA: 'Actualización completa del proceso'
};
