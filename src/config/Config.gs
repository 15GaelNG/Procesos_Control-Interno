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
// saturado o sin cuota. En la prueba del 13/10/2026 gemini-3.6-flash y gemini-3.5-flash dieron 503
// (saturados en el nivel gratuito) y gemini-flash-latest respondió bien; gemini-2.5-flash va al final
// porque Google anunció su retiro. listarModelosIA() muestra cuáles hay.
const IA_URL_BASE = 'https://generativelanguage.googleapis.com/v1beta';
const IA_MODELOS_PREFERIDOS = [
  'gemini-flash-latest',
  'gemini-3.5-flash',
  'gemini-3.6-flash',
  'gemini-3.5-flash-lite',
  'gemini-3.1-flash-lite',
  'gemini-2.5-flash'
];
const IA_MAX_MODELOS = 4;
const IA_MAX_CARACTERES_ENTRADA = 60000;   // Tope de texto que se manda en una sola llamada.

// Plantillas (documentos/Plantillas.gs). Procesos sube un Word por tipo con la marca de agua y el
// sistema crea «<nombre> - Preliminar» (con marca) y «<nombre> - Final» (sin marca) en Google Docs.
const MIME_DOCX = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
const SUFIJO_PRELIMINAR = ' - Preliminar';
const SUFIJO_FINAL = ' - Final';
const CARPETA_PRUEBAS_GENERACION = 'Pruebas de generación';
// Tamaño máximo de una imagen en «Desarrollo», en píxeles de Google Docs (96 por pulgada).
// El área de texto mide 6.5 × 8 pulgadas (624 × ~770 px). Ancho 560 px ≈ 5.8": casi todo el ancho,
// para que se lean las capturas con letra chica. Alto 600 px ≈ 6.25": deja lugar al título de la
// actividad y al pie; sin este tope una captura de celular (vertical) se saldría de la hoja.
const ANCHO_IMAGEN_DOCUMENTO = 560;
const ALTO_IMAGEN_DOCUMENTO = 600;

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
  IMAGEN_MB_MAX: 4           // Cada archivo ya optimizado que manda el navegador
};
// Coincidencias de nombre que se muestran al crear un documento nuevo, y desde qué parecido (0 a 1).
const COINCIDENCIAS_MAX = 5;
const COINCIDENCIAS_PARECIDO_MIN = 0.5;
// Miniatura que el navegador genera de cada imagen para mostrarla rápido en la captura.
const MINIATURA_ANCHO = 360;

// Colores institucionales (los mismos que SIVET / Control Interno y la plantilla).
const COLOR_AZUL = '#1E252B';
const COLOR_DORADO = '#B4A169';
