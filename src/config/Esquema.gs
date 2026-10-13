/**
 * ESQUEMA DE LA BASE DE DATOS
 *
 * Única fuente de verdad de las hojas y sus columnas. instalarBase_() crea lo que falte a partir de
 * aquí y verificarBase() compara la hoja real contra esto. La descripción de cada columna está en
 * docs/base-de-datos.md: si cambias algo aquí, cámbialo allá en el mismo commit.
 *
 * Reglas:
 *  - El nombre de la hoja y de cada columna es parte del contrato con el código: el código busca
 *    las columnas por su encabezado, no por su posición, pero renombrar uno lo rompe.
 *  - Columnas nuevas, siempre al final (instalarBase_ las agrega sin tocar los datos).
 *  - Los IDs son texto con prefijo (USR-0001, SOL-2026-0001…) y nunca se reutilizan.
 *  - Nada se borra físicamente: las filas se desactivan (ACTIVO = NO) o se marcan (ELIMINADA = SI)
 *    para conservar la trazabilidad.
 */

// Colores literales a propósito: una constante de nivel superior no debe leer otra de otro archivo
// (Apps Script no garantiza el orden en que carga los archivos).
const GRUPOS_BD = {
  CONFIGURACION: { nombre: 'Configuración', color: '#667085' },
  CATALOGOS: { nombre: 'Catálogos', color: '#B4A169' },
  OPERACION: { nombre: 'Operación', color: '#1E252B' },
  TRAZABILIDAD: { nombre: 'Trazabilidad', color: '#7A6A3A' }
};

const ESQUEMA_BD = [
  // ───────────────────────────── Configuración ─────────────────────────────
  {
    hoja: 'Config', grupo: 'CONFIGURACION',
    descripcion: 'Parámetros del sistema que Procesos o el administrador pueden ajustar sin tocar código.',
    columnas: ['CLAVE', 'VALOR', 'DESCRIPCION'],
    semilla: [
      ['MARCA_AGUA_TEXTO', 'COPIA NO AUTORIZADA', 'Leyenda de todo archivo generado antes de la autorización final (§4.4).'],
      ['IMG_ANCHO_MAX', '1600', 'Ancho máximo en píxeles al optimizar imágenes (§3.2).'],
      ['IMG_CALIDAD', '0.82', 'Calidad de compresión de imágenes, de 0 a 1 (§3.2: 80–85 %).'],
      ['IMG_PESO_OBJETIVO_KB', '300', 'Peso al que se intenta llegar por imagen (§3.2: 100–300 KB).'],
      ['IMG_MAX_POR_ACTIVIDAD', '10', 'Imágenes permitidas por actividad.'],
      ['IA_ACTIVA', 'NO', 'SI / NO. Con NO el sistema funciona sin sugerencias de IA.'],
      ['IA_PROVEEDOR', 'GEMINI', 'Proveedor de IA (ver docs/ia.md). La llave va en las Propiedades del script, no aquí.'],
      ['IA_MODELO', '', 'Modelo a usar; se define en la prueba de concepto.'],
      ['IA_MAX_LLAMADAS_DIA', '200', 'Tope diario de llamadas a la IA, para no rebasar la cuota gratuita.'],
      ['PREFIJO_SOLICITUD', 'SOL', 'Prefijo del identificador interno de solicitudes (SOL-2026-0001).'],
      ['CORREO_PROCESOS', '', 'Buzón del área de Procesos para avisos.']
    ]
  },
  {
    hoja: 'Consecutivos', grupo: 'CONFIGURACION',
    descripcion: 'Último número usado por cada serie de IDs y códigos. Se escribe siempre con bloqueo.',
    columnas: ['SERIE', 'ULTIMO', 'FECHA_ACTUALIZACION']
  },

  // ─────────────────────────────── Catálogos ───────────────────────────────
  {
    hoja: 'Usuarios', grupo: 'CATALOGOS',
    descripcion: 'Personas que entran al sistema. Se identifican por su correo de Google.',
    columnas: ['ID_USUARIO', 'CORREO', 'NOMBRE', 'ID_PUESTO', 'ACTIVO', 'FECHA_ALTA',
      'ACTUALIZADO_POR', 'FECHA_ACTUALIZACION']
  },
  {
    hoja: 'UsuarioPerfiles', grupo: 'CATALOGOS',
    descripcion: 'Perfiles de cada usuario (puede tener varios). Para AUTORIZADOR se indica el nivel y el departamento.',
    columnas: ['ID_USUARIO_PERFIL', 'ID_USUARIO', 'PERFIL', 'ID_DEPARTAMENTO', 'NIVEL_AUTORIZACION',
      'ACTIVO', 'FECHA_ALTA']
  },
  {
    hoja: 'UsuarioDepartamentos', grupo: 'CATALOGOS',
    descripcion: 'Departamentos por los que un usuario puede elaborar documentos (§2: si tiene varios, elige).',
    columnas: ['ID_USUARIO_DEPARTAMENTO', 'ID_USUARIO', 'ID_DEPARTAMENTO', 'PRINCIPAL', 'ACTIVO']
  },
  {
    hoja: 'Departamentos', grupo: 'CATALOGOS',
    descripcion: 'Catálogo institucional de departamentos.',
    columnas: ['ID_DEPARTAMENTO', 'NOMBRE', 'CLAVE_CODIGO', 'DIRECCION', 'ACTIVO']
  },
  {
    hoja: 'Puestos', grupo: 'CATALOGOS',
    descripcion: 'Catálogo institucional de puestos. La IA coteja contra él a los responsables (§3.3).',
    columnas: ['ID_PUESTO', 'NOMBRE', 'ID_DEPARTAMENTO', 'SINONIMOS', 'ACTIVO']
  },
  {
    hoja: 'TiposDocumento', grupo: 'CATALOGOS',
    descripcion: 'Manual, Procedimiento, Protocolo, Política, con su prefijo de código y sus dos plantillas.',
    columnas: ['ID_TIPO', 'NOMBRE', 'PREFIJO_CODIGO', 'ID_PLANTILLA_PRELIMINAR', 'ID_PLANTILLA_FINAL', 'ACTIVO'],
    semilla: [
      ['TD-01', 'Manual', '', '', '', 'SI'],
      ['TD-02', 'Procedimiento', 'PRO', '', '', 'SI'],
      ['TD-03', 'Protocolo', '', '', '', 'SI'],
      ['TD-04', 'Política', '', '', '', 'SI']
    ]
  },
  {
    hoja: 'CadenasAutorizacion', grupo: 'CATALOGOS',
    descripcion: 'Quién autoriza y en qué orden después del Vo.Bo. de Procesos. Vacío en tipo o departamento = aplica a todos.',
    columnas: ['ID_CADENA', 'ID_TIPO', 'ID_DEPARTAMENTO', 'NIVEL', 'NOMBRE_NIVEL', 'ID_USUARIO', 'ACTIVO'],
    semilla: [
      ['CAD-01', '', '', 1, 'Responsable del área', '', 'SI'],
      ['CAD-02', '', '', 2, 'Dirección', '', 'SI']
    ]
  },

  // ─────────────────────────────── Operación ───────────────────────────────
  {
    hoja: 'Documentos', grupo: 'OPERACION',
    descripcion: 'Inventario documental: un renglón por documento oficial con su versión vigente.',
    columnas: ['ID_DOCUMENTO', 'CODIGO', 'NOMBRE', 'ID_TIPO', 'ID_DEPARTAMENTO', 'VERSION_VIGENTE',
      'FECHA_VIGENCIA', 'ESTATUS', 'ID_SOLICITUD_VIGENTE', 'ID_ARCHIVO_WORD', 'ID_ARCHIVO_PDF',
      'CONTENIDO_ESTRUCTURADO', 'ORIGEN', 'FECHA_REGISTRO']
  },
  {
    hoja: 'Solicitudes', grupo: 'OPERACION',
    descripcion: 'Cada trámite de documento nuevo o de actualización, de borrador a autorizado.',
    columnas: ['ID_SOLICITUD', 'TIPO_SOLICITUD', 'ID_TIPO', 'ID_DOCUMENTO', 'NOMBRE_DOCUMENTO',
      'ID_DEPARTAMENTO', 'ESTADO', 'NIVEL_AUTORIZACION_ACTUAL', 'INICIO_PROCESO', 'FIN_PROCESO',
      'OBJETIVO', 'ALCANCE', 'RESPONSABILIDADES', 'DEFINICIONES', 'MOTIVOS_CAMBIO', 'CODIGO', 'VERSION',
      'REVISION', 'HUELLA_CONTENIDO', 'HUELLA_CONFIRMADA', 'FECHA_CONFIRMACION',
      'ELABORO_ID', 'ELABORO_NOMBRE', 'ELABORO_PUESTO', 'FECHA_ELABORACION',
      'REVISO_ID', 'REVISO_NOMBRE', 'REVISO_PUESTO', 'FECHA_REVISION',
      'AUTORIZO_ID', 'AUTORIZO_NOMBRE', 'AUTORIZO_PUESTO', 'FECHA_AUTORIZACION',
      'MOTIVO_CIERRE', 'ID_CARPETA', 'FECHA_ACTUALIZACION']
  },
  {
    hoja: 'Actividades', grupo: 'OPERACION',
    descripcion: 'Pasos del proceso de cada solicitud, en el orden que definió el colaborador.',
    columnas: ['ID_ACTIVIDAD', 'ID_SOLICITUD', 'ORDEN', 'TEXTO_ORIGINAL', 'TEXTO_FINAL', 'ID_PUESTO',
      'PUESTO_TEXTO', 'RESPONSABLE_CONFIRMADO', 'ELIMINADA', 'FECHA_ACTUALIZACION']
  },
  {
    hoja: 'Imagenes', grupo: 'OPERACION',
    descripcion: 'Imágenes de cada actividad. Se ligan por ID_ACTIVIDAD, así que reordenar no rompe la relación.',
    columnas: ['ID_IMAGEN', 'ID_ACTIVIDAD', 'ID_SOLICITUD', 'ORDEN', 'ID_ARCHIVO', 'ID_ARCHIVO_DOCUMENTO',
      'FORMATO', 'ANCHO', 'ALTO', 'PESO_KB', 'PIE', 'ELIMINADA', 'FECHA_CARGA']
  },
  {
    hoja: 'Aclaraciones', grupo: 'OPERACION',
    descripcion: 'Preguntas complementarias (de la IA o de Procesos) y lo que respondió el colaborador.',
    columnas: ['ID_ACLARACION', 'ID_SOLICITUD', 'ID_ACTIVIDAD', 'TIPO', 'PREGUNTA', 'RESPUESTA',
      'ESTADO', 'ORIGEN', 'FECHA_PREGUNTA', 'FECHA_RESPUESTA']
  },
  {
    hoja: 'PropuestasIA', grupo: 'OPERACION',
    descripcion: 'Lo que propuso la IA y lo que decidió la persona. La IA propone, la persona decide.',
    columnas: ['ID_PROPUESTA', 'ID_SOLICITUD', 'ID_ACTIVIDAD', 'CAMPO', 'VALOR_ANTERIOR', 'PROPUESTA',
      'JUSTIFICACION', 'EVIDENCIA', 'DECISION', 'VALOR_FINAL', 'FECHA_PROPUESTA', 'FECHA_DECISION']
  },
  {
    hoja: 'Observaciones', grupo: 'OPERACION',
    descripcion: 'Observaciones de Procesos o de los autorizadores, por apartado o por actividad.',
    columnas: ['ID_OBSERVACION', 'ID_SOLICITUD', 'REVISION', 'APARTADO', 'ID_ACTIVIDAD', 'AUTOR_ID',
      'AUTOR_NOMBRE', 'PERFIL', 'TEXTO', 'ESTADO', 'RESPUESTA', 'FECHA', 'FECHA_ATENCION']
  },
  {
    hoja: 'Autorizaciones', grupo: 'OPERACION',
    descripcion: 'Cada nivel de la cadena de autorización por solicitud, con nombre y puesto fijados al decidir.',
    columnas: ['ID_AUTORIZACION', 'ID_SOLICITUD', 'REVISION', 'NIVEL', 'NOMBRE_NIVEL', 'ID_USUARIO',
      'NOMBRE', 'PUESTO', 'DECISION', 'COMENTARIO', 'FECHA_ASIGNACION', 'FECHA_DECISION']
  },
  {
    hoja: 'Archivos', grupo: 'OPERACION',
    descripcion: 'Todo archivo Word/PDF generado. Los preliminares nunca se reemplazan (§4.4).',
    columnas: ['ID_ARCHIVO', 'ID_SOLICITUD', 'REVISION', 'TIPO', 'FORMATO', 'ID_DRIVE', 'CON_MARCA_AGUA',
      'HUELLA_CONTENIDO', 'GENERADO_POR', 'FECHA']
  },

  // ────────────────────────────── Trazabilidad ─────────────────────────────
  {
    hoja: 'Instantaneas', grupo: 'TRAZABILIDAD',
    descripcion: 'Foto completa del contenido (JSON en Drive) cada vez que se confirma o se envía.',
    columnas: ['ID_INSTANTANEA', 'ID_SOLICITUD', 'REVISION', 'MOTIVO', 'HUELLA', 'ID_ARCHIVO_JSON',
      'USUARIO', 'FECHA']
  },
  {
    hoja: 'HistorialCambios', grupo: 'TRAZABILIDAD',
    descripcion: 'Control de cambios oficial de cada documento. Solo se escribe al autorizar una versión (§4.2).',
    columnas: ['ID_CAMBIO', 'ID_DOCUMENTO', 'VERSION', 'FECHA', 'MOTIVOS', 'DESCRIPCION',
      'AUTORIZO_NOMBRE', 'AUTORIZO_PUESTO', 'ID_SOLICITUD']
  },
  {
    hoja: 'Bitacora', grupo: 'TRAZABILIDAD',
    descripcion: 'Toda acción relevante: quién, qué, cuándo y sobre qué solicitud (§4.3).',
    columnas: ['FECHA', 'USUARIO', 'ACCION', 'ID_SOLICITUD', 'ESTADO_ANTERIOR', 'ESTADO_NUEVO', 'DETALLE']
  },
  {
    hoja: 'UsoIA', grupo: 'TRAZABILIDAD',
    descripcion: 'Cada llamada a la IA: para cuidar la cuota y auditar qué se le envió.',
    columnas: ['FECHA', 'USUARIO', 'ID_SOLICITUD', 'OPERACION', 'PROVEEDOR', 'MODELO',
      'TOKENS_ENTRADA', 'TOKENS_SALIDA', 'DURACION_MS', 'RESULTADO']
  }
];
