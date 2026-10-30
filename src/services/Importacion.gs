/**
 * IMPORTAR UN WORD O PDF EXISTENTE CON IA (fase 7; propuesta de Procesos en su respuesta sobre el
 * inventario, decisión 33).
 *
 * El colaborador sube el documento que ya tenía; Google lo convierte a texto (Drive; los PDF con OCR); la
 * IA lo separa en inicio, actividades con su responsable, fin y, si el documento los trae, objetivo,
 * alcance, responsabilidades y definiciones. Solo separa lo que dice el documento: no inventa ni agrega
 * (validarImportacion_ limpia lo que regresa). El colaborador lo revisa en pantalla antes de usarlo y
 * después lo corrige como cualquier captura. Sin datos sensibles hacia la IA. El archivo original se
 * guarda en la carpeta de la solicitud.
 */

function importarDocumento_(sesion, idSolicitud, archivo) {
  const fila = filaSolicitud_(idSolicitud);
  if (!permisoSolicitud_(sesion, fila).editar) throw new Error('No puedes editar esta solicitud.');
  if (obtenerConfig_('IA_ACTIVA', 'NO') !== 'SI') throw new Error('La IA está apagada en este momento: captura las actividades a mano.');
  const a = archivo || {};
  const nombre = String(a.nombre || 'documento').slice(0, 120);
  const blob = blobDeDocumento_(a, nombre);
  const texto = textoDeDocumento_(blob, fila, nombre);
  if (texto.replace(/\s+/g, '').length < 40) {
    throw new Error('No se pudo leer texto de ese documento (¿es una imagen escaneada?). Prueba con el Word, o captura las actividades a mano.');
  }
  const mapa = {};
  const enviado = ocultarDatosSensibles_(texto.slice(0, IMPORTACION_MAX_CARACTERES), mapa);
  const prompt = construirPromptImportacion_(String(fila.NOMBRE_DOCUMENTO || ''), enviado);
  const r = llamarIAJson_({ operacion: 'IMPORTACION', sistema: prompt.sistema, usuario: prompt.usuario, idSolicitud: idSolicitud });
  const resultado = restaurarDatosSensibles_(validarImportacion_(r.datos), mapa);
  registrarBitacora_(sesion, 'IMPORTAR_DOCUMENTO', nombre + ': ' + resultado.actividades.length + ' actividades (' + r.modelo + ').', idSolicitud);
  return Object.assign(resultado, { modelo: r.modelo, recortado: texto.length > IMPORTACION_MAX_CARACTERES });
}

/** Valida el archivo que manda el navegador ({ base64, tipo, nombre }) y devuelve su blob. */
function blobDeDocumento_(a, nombre) {
  const tipos = ['application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'application/msword', 'application/pdf'];
  if (tipos.indexOf(a.tipo) === -1) throw new Error('Sube el documento en Word (.docx o .doc) o en PDF.');
  const bytes = Utilities.base64Decode(String(a.base64 || ''));
  if (!bytes.length) throw new Error('El archivo llegó vacío.');
  if (bytes.length > IMPORTACION_MB_MAX * 1024 * 1024) throw new Error('El archivo pesa más de ' + IMPORTACION_MB_MAX + ' MB.');
  return Utilities.newBlob(bytes, a.tipo, nombre);
}

/** El texto del documento: se guarda el original en la carpeta y una copia temporal en Google Docs lo lee. */
function textoDeDocumento_(blob, fila, nombre) {
  const carpeta = asegurarCarpeta_(DriveApp.getFolderById(fila.ID_CARPETA), CARPETA_IMPORTADOS_SOLICITUD, null,
    'Documentos existentes que se importaron con la IA para capturar este proceso.');
  carpeta.createFile(blob.copyBlob().setName(nombre));
  const copia = Drive.Files.create({ name: 'Lectura temporal · ' + nombre, mimeType: MimeType.GOOGLE_DOCS, parents: [carpeta.getId()] },
    blob, { ocrLanguage: 'es' });
  try {
    return DocumentApp.openById(copia.id).getBody().getText();
  } finally {
    try { DriveApp.getFileById(copia.id).setTrashed(true); } catch (e) { /* se queda en la carpeta */ }
  }
}
