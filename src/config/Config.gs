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

const ZONA_HORARIA = 'America/Mexico_City';

// IA (ver docs/ia.md). El modelo se toma de Config → IA_MODELO; si está vacío, se intentan en este
// orden los que la llave tenga disponibles (hasta IA_MAX_MODELOS), pasando al siguiente si uno está
// saturado o sin cuota. Primero los Flash ya estables (menos saturados que los recién salidos).
// Google cambia los nombres seguido: listarModelosIA() muestra cuáles hay.
const IA_URL_BASE = 'https://generativelanguage.googleapis.com/v1beta';
const IA_MODELOS_PREFERIDOS = [
  'gemini-3.5-flash',
  'gemini-3.6-flash',
  'gemini-flash-latest',
  'gemini-2.5-flash',
  'gemini-3.5-flash-lite',
  'gemini-3.1-flash-lite'
];
const IA_MAX_MODELOS = 4;
const IA_MAX_CARACTERES_ENTRADA = 60000;   // Tope de texto que se manda en una sola llamada.

// Plantillas (documentos/Plantillas.gs). Procesos sube un Word por tipo con la marca de agua y el
// sistema crea «<nombre> - Preliminar» (con marca) y «<nombre> - Final» (sin marca) en Google Docs.
const MIME_DOCX = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
const SUFIJO_PRELIMINAR = ' - Preliminar';
const SUFIJO_FINAL = ' - Final';
const CARPETA_PRUEBAS_GENERACION = 'Pruebas de generación';

// Colores institucionales (los mismos que SIVET / Control Interno y la plantilla).
const COLOR_AZUL = '#1E252B';
const COLOR_DORADO = '#B4A169';
