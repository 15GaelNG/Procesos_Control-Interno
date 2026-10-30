/**
 * CONFIGURACIÓN GENERAL
 *
 * Todas las constantes de nivel superior del servidor viven en src/config/. Una constante
 * declarada dos veces (en cualquier archivo) hace que Apps Script marque "Identifier has already
 * been declared" y deja de responder TODO el servidor: antes de agregar una, búscala.
 *
 * Lo que cambia entre PRUEBAS y PRODUCCIÓN (IDs de carpetas, ambiente, llave de la IA) NO va aquí:
 * vive en las Propiedades del script de cada proyecto (Configuración del proyecto → Propiedades
 * del script). instalarPruebas() / instalarProduccion() las llenan. Ver docs/ambientes.md.
 */

const APP_NOMBRE = 'Procesos';
const APP_NOMBRE_LARGO = 'Sistema de Documentación de Procesos';

// Los archivos HTML se suben como "src/html/Index", "src/html/views/..." (ver .claspignore).
const PREFIJO_ARCHIVOS_HTML = 'src/html/';

// Carpeta de Drive del proyecto (la misma para los dos ambientes; cada uno tiene su subcarpeta).
const ID_CARPETA_PROYECTO = '17AlfoUEj20p8EzJ7zS7WYW2q0bF0Pn_1';

const AMBIENTES = {
  PRUEBAS: {
    clave: 'PRUEBAS',
    nombreBD: 'BD Procesos - PRUEBAS',
    carpeta: '02 Pruebas'
  },
  PRODUCCION: {
    clave: 'PRODUCCION',
    nombreBD: 'BD Procesos',
    carpeta: '01 Producción'
  }
};

// Carpetas que se crean dentro de la carpeta de cada ambiente. La clave es la Propiedad del script
// donde se guarda su ID; el código siempre busca la carpeta por ese ID, nunca por su nombre, así
// que se pueden renombrar o mover en Drive sin romper nada.
const CARPETAS_AMBIENTE = [
  { propiedad: 'ID_CARPETA_PLANTILLAS', nombre: 'Plantillas',
    descripcion: 'Plantillas de Google Docs por tipo de documento: preliminar (con marca de agua) y final (sin marca).' },
  { propiedad: 'ID_CARPETA_SOLICITUDES', nombre: 'Solicitudes',
    descripcion: 'Una carpeta por solicitud: imágenes, archivos preliminares e instantáneas del contenido.' },
  { propiedad: 'ID_CARPETA_OFICIALES', nombre: 'Documentos oficiales',
    descripcion: 'Versiones autorizadas sin marca de agua (Word y PDF). Solo se descargan a través del sistema.' },
  { propiedad: 'ID_CARPETA_RESPALDOS', nombre: 'Respaldos',
    descripcion: 'Copias de la base de datos.' }
];

// Carpeta compartida por los dos ambientes, al nivel de la carpeta del proyecto.
const CARPETA_DOCUMENTACION = '00 Documentación';

// Nombres de las Propiedades del script que usa el sistema (además de las de CARPETAS_AMBIENTE).
const PROP = {
  AMBIENTE: 'AMBIENTE',
  ID_BD: 'ID_BD',
  ID_CARPETA_AMBIENTE: 'ID_CARPETA_AMBIENTE',
  IA_LLAVE: 'IA_LLAVE'          // Se captura a mano en el editor; nunca en el código ni en la hoja.
};

// Hojas que no cambian a media llamada (usuarios, catálogos, parámetros): SheetUtils las lee una sola
// vez por ejecución. Las de operación (Solicitudes, Consecutivos…) se leen siempre de nuevo.
const TABLAS_ESTABLES = ['Config', 'Usuarios', 'UsuarioPerfiles', 'UsuarioDepartamentos', 'Departamentos', 'Areas',
  'Subareas', 'Puestos', 'TiposDocumento'];
// …y se recuerdan entre llamadas en la caché del script por este tiempo (una edición a mano en la hoja
// las olvida al momento: Disparadores.gs → onEdit). La caché acepta hasta 100 KB por hoja.
const TABLA_CACHE_SEGUNDOS = 1800;
const TABLA_CACHE_MAX_CARACTERES = 95000;
// Miniaturas de imágenes recordadas entre llamadas (Solicitudes.gs → miniaturasSolicitud_).
const MINIATURA_CACHE_SEGUNDOS = 21600;
const MINIATURA_CACHE_MAX_CARACTERES = 95000;

const ZONA_HORARIA = 'America/Mexico_City';

// IA (ver docs/ia.md). El modelo se toma de Config → IA_MODELO; si está vacío, se intentan en este
// orden los que la llave tenga disponibles (hasta IA_MAX_MODELOS), pasando al siguiente si uno está
// saturado o sin cuota. Uso real en pruebas (26–28/10/2026, hoja UsoIA): gemini-3.5-flash respondió los
// análisis en 3–10 s (a veces 503, saturado); gemini-flash-latest se quedó sin contestar hasta 6 min
// varias veces, por eso va al final. listarModelosIA() muestra cuáles hay.
const IA_URL_BASE = 'https://generativelanguage.googleapis.com/v1beta';
const IA_MODELOS_PREFERIDOS = [
  'gemini-3.5-flash',
  'gemini-3.6-flash',
  'gemini-3.5-flash-lite',
  'gemini-3.1-flash-lite',
  'gemini-2.5-flash',
  'gemini-flash-latest'
];
const IA_MAX_MODELOS = 4;
// «Corregir redacción» es corta y no necesita razonar: modelos «lite» (más rápidos) primero. Config →
// IA_MODELO_RAPIDO fija uno, como IA_MODELO para el análisis. Se usan los que la llave tenga.
const IA_MODELOS_RAPIDOS = [
  'gemini-3.5-flash-lite',
  'gemini-3.1-flash-lite',
  'gemini-flash-lite-latest',
  'gemini-2.5-flash-lite',
  'gemini-3.5-flash',
  'gemini-flash-latest'
];
// Un modelo que no contestó a tiempo se manda al final de la lista por estas horas.
const IA_HORAS_MODELO_LENTO = 3;
// Apps Script no puede cancelar una llamada que se quedó colgada (el 26/10/2026 tardaron hasta 6 min).
// Si la IA no ha contestado en estos segundos, la pantalla lanza el mismo trabajo con el siguiente
// modelo, en paralelo, hasta este número de intentos, y se queda con el primero que conteste.
const IA_ESPERA_OTRO_MODELO_S = 20;
const IA_INTENTOS_PARALELOS = 3;
// Sugerencia de redacción mientras se escribe (paso 3): se pide cuando la persona deja de escribir
// una actividad (o sale de ella) y el texto tiene al menos estos caracteres. Tiene su propio tope diario
// (Config → IA_MAX_SUGERENCIAS_DIA) para no gastar el de los análisis; Config → IA_SUGERIR_AL_ESCRIBIR = NO
// la apaga.
const IA_SUGERENCIA_MIN_CARACTERES = 20;
const IA_SUGERENCIA_ESPERA_MS = 2500;
const IA_MAX_SUGERENCIAS_DIA = 800;
// Datos que se ocultan antes de mandar un texto a la IA (utils/Privacidad.gs). Lo más específico
// primero: un RFC o una CURP no deben confundirse con una cuenta.
const PATRONES_SENSIBLES = [
  { marca: 'CORREO', patron: /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g },
  { marca: 'CURP', patron: /\b[A-Z][AEIOUX][A-Z]{2}\d{6}[HM][A-Z]{5}[A-Z0-9]\d\b/gi },
  { marca: 'RFC', patron: /\b[A-ZÑ&]{3,4}\d{6}[A-Z0-9]{3}\b/gi },
  { marca: 'CUENTA', patron: /\b\d(?:[ -]?\d){10,18}\b/g },
  { marca: 'TELÉFONO', patron: /(?:\+?52[ -]?)?(?:\(\d{2,3}\)[ -]?|\b\d{2,3}[ -])\d{3,4}[ -]?\d{4}\b|\b\d{10}\b/g },
  { marca: 'MONTO', patron: /\$\s?\d[\d,]*(?:\.\d+)?(?:\s?(?:MXN|USD|pesos|dólares))?/gi }
];
const IA_MAX_CARACTERES_ENTRADA = 60000;   // Tope de texto que se manda en una sola llamada.
// Topes de cada respuesta (26/10/2026: sin tope, gemini-flash-latest se quedó generando 6 minutos y Apps
// Script cortó la ejecución). La respuesta normal de un análisis ocupa ~1,200 tokens; el «razonamiento»
// interno del modelo se limita porque corregir y estructurar no lo necesita y es lo que más tarda.
const IA_MAX_TOKENS_SALIDA = 8192;
const IA_PRESUPUESTO_PENSAMIENTO = 1024;
const IA_TEMPERATURA = 0.2;

// Plantillas (documentos/Plantillas.gs). Procesos sube un Word por tipo con la marca de agua y el
// sistema crea «<nombre> - Preliminar» (con marca) y «<nombre> - Final» (sin marca) en Google Docs.
const MIME_DOCX = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
const SUFIJO_PRELIMINAR = ' - Preliminar';
const SUFIJO_FINAL = ' - Final';
const CARPETA_PRUEBAS_GENERACION = 'Pruebas de generación';
// Subcarpeta de cada solicitud donde quedan sus Word y PDF generados (fase 4).
const CARPETA_DOCUMENTOS_SOLICITUD = 'Documentos';
// Mientras se genera un documento de una solicitud, otro intento espera (segundos que dura el aviso).
const GENERACION_BLOQUEO_SEGUNDOS = 300;
// Subcarpeta de cada solicitud con la foto (JSON) de cada envío a revisión y del Vo.Bo.
const CARPETA_INSTANTANEAS_SOLICITUD = 'Instantáneas';
// Documentos existentes (Word o PDF) que se importaron con la IA (Importacion.gs).
const CARPETA_IMPORTADOS_SOLICITUD = 'Importados';
const IMPORTACION_MB_MAX = 10;
// Lo que se le manda a la IA del texto del documento (lo demás se recorta y se avisa).
const IMPORTACION_MAX_CARACTERES = 40000;
// Revisión (fase 5): tope de una observación o motivo, y dígitos del consecutivo del código (P-CI04-001).
const OBSERVACION_MAX = 2000;
const CONSECUTIVO_DIGITOS = 3;
// «Envíos a CH» (fase 6): cuántos resultados ya registrados muestra (los más recientes).
const ENVIOS_CH_RESUELTOS_MAX = 50;
// Tamaño máximo de una imagen en «Desarrollo», en píxeles de Google Docs (96 por pulgada).
// El área de texto mide 6.5 × 8 pulgadas (624 × ~770 px). Ancho 560 px ≈ 5.8": casi todo el ancho,
// para que se lean las capturas con letra chica. Alto 600 px ≈ 6.25": deja lugar al título de la
// actividad y al pie; sin este tope una captura de celular (vertical) se saldría de la hoja.
const ANCHO_IMAGEN_DOCUMENTO = 560;
const ALTO_IMAGEN_DOCUMENTO = 600;

// Fotos de perfil de Google (Fotos.gs): tamaño, cuánto se recuerdan (6 horas) y cuántas se le piden al
// directorio en una llamada (las demás, en la siguiente).
const FOTO_PERFIL_PX = 96;
const FOTO_CACHE_SEGUNDOS = 21600;
const FOTOS_POR_LLAMADA = 25;

// El tipo cuya plantilla usan todos los que no tengan la suya (decisión 36): Procedimiento.
const TIPO_PLANTILLA_GENERAL = 'TD-02';

// Contrato entre la plantilla (plantillas/Procedimiento.docx) y el generador (documentos/Llenado.gs).
// Cada marcador se escribe en la plantilla como {{CLAVE}}. Ver docs/plantillas.md#marcadores.
const MARCADORES_PLANTILLA = {
  // Se reemplazan por un texto, en cualquier parte (portada, encabezado, cuerpo, tablas, pie).
  simples: ['NOMBRE_PORTADA', 'CODIGO', 'TIPO_DOCUMENTO', 'NOMBRE_DOCUMENTO', 'DEPARTAMENTO', 'VERSION',
    'FECHA_ACTUALIZACION', 'OBJETIVO', 'ALCANCE',
    'ELABORO_NOMBRE', 'ELABORO_PUESTO', 'FECHA_ELABORACION',
    'REVISO_NOMBRE', 'REVISO_PUESTO', 'FECHA_REVISION',
    'AUTORIZO_NOMBRE', 'AUTORIZO_PUESTO', 'FECHA_AUTORIZACION',
    'CAMBIO_VERSION', 'CAMBIO_FECHA', 'CAMBIO_DESCRIPCION', 'CAMBIO_RESPONSABLE'],
  // Su párrafo se repite una vez por elemento de la lista.
  listas: ['PUESTOS', 'RESPONSABILIDADES', 'DEFINICIONES'],
  // Si su lista viene vacía se quita la sección completa (título incluido) y se renumeran las demás.
  opcionales: ['RESPONSABILIDADES', 'DEFINICIONES'],
  // Se sustituye por las actividades (número, responsable, descripción, imágenes con pie).
  desarrollo: 'DESARROLLO'
};

// Usuarios de prueba (solo en el ambiente de PRUEBAS; ver UsuariosDePrueba.gs). Usan el dominio
// reservado .test, que no existe: ningún aviso por correo les puede llegar a una persona real.
const USUARIOS_DE_PRUEBA = [
  { correo: 'colaborador.uno@procesos.test', nombre: 'Ana López (prueba)', perfiles: ['COLABORADOR'] },
  { correo: 'colaborador.dos@procesos.test', nombre: 'Luis Ramírez (prueba)', perfiles: ['COLABORADOR'] },
  { correo: 'revisor@procesos.test', nombre: 'Paola Méndez (prueba)', perfiles: ['REVISOR'] },
  { correo: 'revisor.colaborador@procesos.test', nombre: 'Carlos Ruiz (prueba)', perfiles: ['REVISOR', 'COLABORADOR'] },
  { correo: 'administrador@procesos.test', nombre: 'Sofía Torres (prueba)', perfiles: ['ADMINISTRADOR'] },
  { correo: 'soporte@procesos.test', nombre: 'Diego Herrera (prueba)', perfiles: ['SOPORTE_CI'] }
];

// Dominios de correo que se pueden dar de alta. En pruebas también el de los usuarios de prueba.
const DOMINIOS_CORREO = {
  PRODUCCION: ['ciudadmaderas.com'],
  PRUEBAS: ['ciudadmaderas.com', 'procesos.test']
};

// Cuántos renglones de la Bitacora muestra la pantalla (los más recientes).
const BITACORA_MAX_RENGLONES = 500;

// Topes de la captura (fase 2). Protegen la hoja y las llamadas a la IA de textos desmedidos.
const LIMITES_CAPTURA = {
  NOMBRE_MIN: 5,
  NOMBRE_MAX: 150,
  PREGUNTA_MAX: 2000,        // «¿Qué sucede para que inicie?» y «¿Cómo finaliza?»
  ACTIVIDADES_MAX: 150,
  ACTIVIDAD_MAX: 4000,       // Texto de una actividad
  RESPONSABLE_MAX: 120,
  PIE_MAX: 200,
  IMAGEN_MB_MAX: 4,          // Cada archivo ya optimizado que manda el navegador
  DERIVADO_MAX: 2000,        // Objetivo y alcance
  LINEAS_MAX: 40,            // Renglones de responsabilidades o de definiciones
  LINEA_MAX: 600,            // Cada uno de esos renglones
  RESPUESTA_MAX: 2000,       // Respuesta a una pregunta de la IA
  ENLACES_MAX: 50,           // Enlaces (páginas, carpetas de Drive, sistemas) por actividad
  ENLACE_MAX: 2000,          // Largo de cada dirección
  ENLACE_TEXTO_MAX: 200      // Descripción de cada enlace
};
// Coincidencias de nombre que se muestran al crear un documento nuevo, y desde qué parecido (0 a 1).
const COINCIDENCIAS_MAX = 5;
const COINCIDENCIAS_PARECIDO_MIN = 0.5;
// Miniatura que el navegador genera de cada imagen para mostrarla rápido en la captura.
const MINIATURA_ANCHO = 360;

// Colores institucionales (los mismos que SIVET / Control Interno y la plantilla).
const COLOR_AZUL = '#1E252B';
const COLOR_DORADO = '#B4A169';
