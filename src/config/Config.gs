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

// Colores institucionales (los mismos que SIVET / Control Interno y la plantilla).
const COLOR_AZUL = '#1E252B';
const COLOR_DORADO = '#B4A169';
