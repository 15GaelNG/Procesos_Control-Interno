/**
 * DOCUMENTOS: Word y PDF de una solicitud desde la plantilla (fase 4; requerimiento §4.1 y §4.4).
 *
 *   generarPreliminar_()  → copia la plantilla CON marca «COPIA NO AUTORIZADA», la llena con el contenido
 *                           (documentos/Llenado.gs), exporta PDF y Word a la carpeta de la solicitud y lo
 *                           registra en Archivos. Cada vez es un archivo NUEVO: los preliminares nunca se
 *                           reemplazan ni se les quita la leyenda (§4.4).
 *   generarFinal_()       → el documento FINAL, sin marca: otro archivo desde la plantilla sin marca, solo
 *                           cuando Procesos registró que CH lo autorizó (§4.4, decisiones 15 y 24).
 *   archivosSolicitud_()  → los archivos generados, marcando cuáles ya no corresponden al contenido.
 *   descargarArchivo_()   → el archivo para el navegador, revisando el permiso en el servidor (§4.4).
 *
 * Lo puro (datos del documento, quién puede generar o descargar) está probado en tests/documentos.test.js.
 */

// ─────────────────────────────── Qué va en el documento ───────────────────────────────

/**
 * Los datos para llenarPlantilla_ a partir del detalle de la solicitud (sin tocar Google).
 *   formatear(fecha, patron) → texto;  ahora: fecha de generación.
 * Las imágenes van como { idImagen, pie }: quien genera las cambia por su archivo JPG.
 */
function datosDocumento_(det, fila, formatear, ahora, historial) {
  const fecha = function (v) { return marcaDe_(v) ? formatear(new Date(marcaDe_(v)), 'dd/MM/yyyy') : ''; };
  const nuevo = fila.TIPO_SOLICITUD === TIPOS_SOLICITUD.NUEVO;
  // Una actualización recibe su versión con el Vo.Bo. de Procesos; antes, «Por asignar».
  const version = String(fila.VERSION || '').trim() || (nuevo ? '0.0' : 'Por asignar');
  // Ya autorizado, la fecha del documento es la de CH (respuestas de Procesos); antes, la de generación.
  const mesAnio = formatear(marcaDe_(fila.FECHA_AUTORIZACION) ? new Date(marcaDe_(fila.FECHA_AUTORIZACION)) : ahora, 'MM/yyyy');
  return {
    simples: {
      NOMBRE_PORTADA: det.nombre.toUpperCase(),
      CODIGO: det.codigo || 'Por asignar',
      TIPO_DOCUMENTO: det.tipoDocumento,
      NOMBRE_DOCUMENTO: det.nombre,
      DEPARTAMENTO: det.departamento,
      VERSION: version,
      FECHA_ACTUALIZACION: mesAnio,
      OBJETIVO: det.objetivo,
      ALCANCE: det.alcance,
      ELABORO_NOMBRE: String(fila.ELABORO_NOMBRE || ''), ELABORO_PUESTO: String(fila.ELABORO_PUESTO || ''),
      FECHA_ELABORACION: fecha(fila.FECHA_ELABORACION),
      REVISO_NOMBRE: String(fila.REVISO_NOMBRE || ''), REVISO_PUESTO: String(fila.REVISO_PUESTO || ''),
      FECHA_REVISION: fecha(fila.FECHA_REVISION),
      // «Autorizado por» solo con el autorizador final que reporta CH (decisiones 14 y 15).
      AUTORIZO_NOMBRE: String(fila.AUTORIZO_NOMBRE || ''), AUTORIZO_PUESTO: String(fila.AUTORIZO_PUESTO || ''),
      FECHA_AUTORIZACION: fecha(fila.FECHA_AUTORIZACION),
      // Un documento nuevo lleva su emisión inicial; el historial de las actualizaciones llega en la fase 7.
      CAMBIO_VERSION: version,
      CAMBIO_FECHA: mesAnio,
      CAMBIO_DESCRIPCION: nuevo ? 'Emisión inicial del documento.' : String(fila.DESCRIPCION_CAMBIO || ''),
      CAMBIO_RESPONSABLE: String(fila.ELABORO_NOMBRE || '')
    },
    // Control de cambios completo (§4.2): las versiones anteriores autorizadas y, al final, esta.
    cambios: (historial || []).filter(function (h) { return h.ID_SOLICITUD !== fila.ID_SOLICITUD; })
      .sort(function (a, b) { return marcaDe_(a.FECHA) - marcaDe_(b.FECHA); })
      .map(function (h) {
        return { CAMBIO_VERSION: String(h.VERSION || ''), CAMBIO_FECHA: marcaDe_(h.FECHA) ? formatear(new Date(marcaDe_(h.FECHA)), 'MM/yyyy') : '',
          CAMBIO_DESCRIPCION: String(h.DESCRIPCION || '') + (h.MOTIVOS ? ' (' + h.MOTIVOS + ')' : ''), CAMBIO_RESPONSABLE: String(h.RESPONSABLE || '') };
      })
      .concat([{ CAMBIO_VERSION: version, CAMBIO_FECHA: mesAnio,
        CAMBIO_DESCRIPCION: nuevo ? 'Emisión inicial del documento.' : String(fila.DESCRIPCION_CAMBIO || '') +
          (listaJson_(fila.MOTIVOS_CAMBIO).length ? ' (' + listaJson_(fila.MOTIVOS_CAMBIO).map(function (m) { return MOTIVOS_CAMBIO[m] || m; }).join('; ') + ')' : ''),
        CAMBIO_RESPONSABLE: String(fila.ELABORO_NOMBRE || '') }]),
    // Puestos y responsabilidades van juntos (decisión 25): la sección «Responsabilidades» de la
    // plantilla queda vacía y se quita, y la de puestos cambia de título.
    listas: {
      PUESTOS: puestosYResponsabilidades_(det),
      RESPONSABILIDADES: [],
      DEFINICIONES: det.definiciones
    },
    titulos: { PUESTOS: 'Puestos y responsabilidades' },
    actividades: det.actividades.filter(function (a) { return a.texto.trim(); }).map(function (a) {
      return { responsable: a.responsable, descripcion: a.texto, enlaces: a.enlaces || [],
        imagenes: a.imagenes.map(function (i) { return { idImagen: i.id, pie: i.pie }; }) };
    })
  };
}

/**
 * ¿Puede esta sesión generar el preliminar? El colaborador, cuando ya confirmó (§3.5: solo después de
 * la confirmación), también mientras Procesos la revisa o se autoriza en CH (su PDF); Procesos, mientras
 * la revisa o la manda a CH (fases 5 y 6). Nunca el final.
 */
function puedeGenerarPreliminar_(sesion, fila) {
  if (!sesion || !sesion.registrado) return false;
  const tiene = function (p) { return sesion.perfiles.indexOf(p) !== -1; };
  if (fila.ELABORO_ID === sesion.idUsuario && tiene('COLABORADOR') &&
    [ESTADOS.CONFIRMADO, ESTADOS.EN_REVISION, ESTADOS.EN_AUTORIZACION_CH].indexOf(fila.ESTADO) !== -1) return true;
  return tiene('REVISOR') && fila.ELABORO_ID !== sesion.idUsuario &&
    [ESTADOS.EN_REVISION, ESTADOS.EN_AUTORIZACION_CH].indexOf(fila.ESTADO) !== -1;
}

/** ¿A esta sesión solo se le genera y muestra el PDF? Al colaborador que la elaboró (el Word es para Procesos). */
function soloPdf_(sesion, fila) {
  return !!sesion && fila.ELABORO_ID === sesion.idUsuario;
}

/**
 * ¿Puede esta sesión descargar el archivo? Quien puede ver la solicitud (quien la elaboró, Procesos y
 * Soporte CI); el documento final, además, el administrador desde el inventario. Se revisa en el
 * servidor (§4.4).
 */
function puedeDescargar_(sesion, fila, archivo) {
  if (!sesion || !sesion.registrado) return false;
  if (permisoSolicitud_(sesion, fila).ver) return true;
  return archivo.TIPO === 'FINAL' && sesion.perfiles.indexOf('ADMINISTRADOR') !== -1;
}

/** Nombre de los archivos: «P-CI04-001 Alta de proveedores - Preliminar (2026-10-21 10.30)». */
function nombreArchivo_(det, tipo, sello) {
  const limpio = String(det.nombre).replace(/[\\/:*?"<>|]+/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 80);
  return (det.codigo || det.id) + ' ' + limpio + ' - ' + (tipo === 'FINAL' ? 'Final' : 'Preliminar') + ' (' + sello + ')';
}

// ─────────────────────────────── Plantillas ───────────────────────────────

/**
 * El Google Doc de la plantilla de un tipo de documento: la suya si la tiene y, si no, la general
 * (TIPO_PLANTILLA_GENERAL, decisión 36). El texto del tipo lo pone {{TIPO_DOCUMENTO}} al llenarla.
 */
function plantillaDeTipo_(tipo, cual, tipos) {
  const propia = plantillaPropia_(tipo, cual);
  if (propia) return propia;
  const general = (tipos || []).filter(function (x) { return x.ID_TIPO === TIPO_PLANTILLA_GENERAL; })[0];
  const deGeneral = general ? plantillaPropia_(general, cual) : null;
  if (deGeneral) return deGeneral;
  const sufijo = cual === 'FINAL' ? SUFIJO_FINAL : SUFIJO_PRELIMINAR;
  throw new Error('No está la plantilla «' + String((general || tipo).NOMBRE) + sufijo + '». Súbela a la carpeta Plantillas y corre prepararPlantillas().');
}

/** La plantilla de ese tipo: el ID guardado en TiposDocumento o la que se llame «<tipo> - Preliminar / - Final»; null si no hay. */
function plantillaPropia_(tipo, cual) {
  const columna = cual === 'FINAL' ? 'ID_PLANTILLA_FINAL' : 'ID_PLANTILLA_PRELIMINAR';
  const sufijo = cual === 'FINAL' ? SUFIJO_FINAL : SUFIJO_PRELIMINAR;
  const id = String(tipo[columna] || '').trim();
  if (id) {
    try {
      const archivo = DriveApp.getFileById(id);
      if (!archivo.isTrashed()) return archivo;
    } catch (e) { /* el ID ya no sirve: se busca por nombre */ }
  }
  const carpeta = DriveApp.getFolderById(propiedadObligatoria_('ID_CARPETA_PLANTILLAS'));
  return buscarDocPorNombre_(carpeta, String(tipo.NOMBRE) + sufijo);
}

// ─────────────────────────────── Generar ───────────────────────────────

function generarPreliminar_(sesion, idSolicitud) {
  const fila = filaSolicitud_(idSolicitud);
  if (!puedeGenerarPreliminar_(sesion, fila)) {
    throw new Error(fila.ESTADO === ESTADOS.BORRADOR || fila.ESTADO === ESTADOS.DEVUELTO
      ? 'Primero confirma en la vista previa que el documento describe tu proceso.' : 'No puedes generar el documento de esta solicitud.');
  }
  return generarArchivos_(sesion, fila, 'PRELIMINAR', soloPdf_(sesion, fila) ? ['PDF'] : ['PDF', 'DOCX']);
}

/**
 * El documento final sin marca de agua: solo con la solicitud AUTORIZADA (CH ya autorizó y Procesos lo
 * registró). Se puede volver a generar (p. ej. si se corrigió la plantilla): el inventario apunta al último.
 */
function generarFinal_(sesion, idSolicitud) {
  const fila = filaSolicitud_(idSolicitud);
  if (!puedeOperarCH_(sesion, fila)) throw new Error('El documento final lo genera Procesos (y nunca de una solicitud que elaboró).');
  if (fila.ESTADO !== ESTADOS.AUTORIZADO) throw new Error('El documento final solo se genera cuando CH ya lo autorizó.');
  const r = generarArchivos_(sesion, fila, 'FINAL', ['PDF', 'DOCX']);
  const doc = leerTabla_('Documentos').filter(function (d) { return d.ID_SOLICITUD_VIGENTE === idSolicitud; })[0];
  if (doc) actualizarFila_('Documentos', doc._fila, { ID_ARCHIVO_PDF: r.pdf, ID_ARCHIVO_WORD: r.docx });
  return r;
}

/**
 * Copia la plantilla del tipo (PRELIMINAR con «COPIA NO AUTORIZADA» o FINAL sin marca), la llena, exporta
 * los formatos pedidos (PDF y/o DOCX) a Solicitudes/<folio>/Documentos y los registra en Archivos.
 * Siempre archivos NUEVOS.
 */
function generarArchivos_(sesion, fila, cual, formatos) {
  const idSolicitud = fila.ID_SOLICITUD;
  const final = cual === 'FINAL';
  const t = tablasSolicitud_();
  const imagenes = leerTabla_('Imagenes');
  const det = detalleSolicitud_(fila, leerTabla_('Actividades'), imagenes, t, { editar: false }, formatoFecha_);
  const huella = huellaDeDetalle_(det);
  if ((fila.ESTADO === ESTADOS.CONFIRMADO && huella !== String(fila.HUELLA_CONFIRMADA)) || (final && !contenidoAprobado_(fila, huella))) {
    throw new Error(final ? 'El contenido no es el que se confirmó y autorizó: no se puede generar el final.'
      : 'El contenido cambió después de confirmar. Revisa la vista previa y vuelve a confirmar.');
  }

  // Un solo documento a la vez por solicitud (un doble clic no genera dos).
  const cache = CacheService.getScriptCache();
  const clave = 'generando-' + idSolicitud;
  if (cache.get(clave)) throw new Error('Ya se está generando el documento de esta solicitud. Espera un momento.');
  cache.put(clave, '1', GENERACION_BLOQUEO_SEGUNDOS);
  try {
    const tipo = t.tipos.filter(function (x) { return x.ID_TIPO === fila.ID_TIPO; })[0];
    if (!tipo) throw new Error('La solicitud no tiene un tipo de documento válido.');
    const plantilla = plantillaDeTipo_(tipo, cual, t.tipos);
    const ahora = new Date();
    const historial = fila.ID_DOCUMENTO ? leerTabla_('HistorialCambios').filter(function (h) { return h.ID_DOCUMENTO === fila.ID_DOCUMENTO; }) : [];
    const datos = datosDocumento_(det, fila, function (f, p) { return Utilities.formatDate(f, ZONA_HORARIA, p); }, ahora, historial);
    const archivoDe = {};
    imagenes.forEach(function (i) { archivoDe[i.ID_IMAGEN] = i.ID_ARCHIVO_DOCUMENTO || i.ID_ARCHIVO; });
    datos.actividades.forEach(function (a) {
      a.imagenes = a.imagenes.map(function (i) { return { blob: DriveApp.getFileById(archivoDe[i.idImagen]).getBlob(), pie: i.pie }; });
    });

    const carpeta = asegurarCarpeta_(DriveApp.getFolderById(fila.ID_CARPETA), CARPETA_DOCUMENTOS_SOLICITUD, null,
      'Word y PDF generados. Los preliminares llevan «COPIA NO AUTORIZADA» y nunca se reemplazan; el final, sin marca, solo tras la autorización de CH.');
    const nombre = nombreArchivo_(det, cual, Utilities.formatDate(ahora, ZONA_HORARIA, 'yyyy-MM-dd HH.mm'));
    const copia = plantilla.makeCopy(nombre, carpeta);
    const doc = DocumentApp.openById(copia.getId());
    const reporte = llenarPlantilla_(doc, datos);
    doc.saveAndClose();
    if (reporte.sinLlenar.length) console.warn('Marcadores sin llenar en ' + idSolicitud + ': ' + reporte.sinLlenar.join(', '));

    const archivos = formatos.map(function (f) {
      return { formato: f, archivo: f === 'PDF' ? carpeta.createFile(copia.getAs(MimeType.PDF)).setName(nombre + '.pdf')
        : carpeta.createFile(exportarDocx_(copia.getId())).setName(nombre + '.docx') };
    });
    // El Google Doc intermedio no se conserva: lo oficial son el PDF y el Word (va a la papelera de Drive).
    copia.setTrashed(true);

    const quien = correoReal_(sesion);
    const ids = reservarIds_('ARC', archivos.length, 6);
    agregarFilas_('Archivos', archivos.map(function (x, i) {
      return { ID_ARCHIVO: ids[i], ID_SOLICITUD: idSolicitud, REVISION: String(fila.REVISION || '0'), TIPO: cual, FORMATO: x.formato,
        ID_DRIVE: x.archivo.getId(), CON_MARCA_AGUA: final ? 'NO' : 'SI', HUELLA_CONTENIDO: huella, GENERADO_POR: quien, FECHA: ahora,
        NOMBRE: x.archivo.getName(), PESO_KB: String(Math.round(x.archivo.getSize() / 1024)) };
    }));
    const formatosTexto = formatos.map(function (f) { return f === 'PDF' ? 'PDF' : 'Word'; }).join(' y ');
    registrarBitacora_(sesion, final ? 'GENERAR_FINAL' : 'GENERAR_PRELIMINAR',
      nombre + ' (' + formatosTexto + (final ? ', sin marca de agua).' : ', con marca de agua).'), idSolicitud);
    const r = { nombre: nombre };
    archivos.forEach(function (x, i) { r[x.formato === 'PDF' ? 'pdf' : 'docx'] = ids[i]; });
    return r;
  } finally {
    cache.remove(clave);
  }
}

// ─────────────────────────────── Consultar y descargar ───────────────────────────────

/** Los archivos de una solicitud, el más reciente primero; `vigente` = corresponde al contenido actual. */
function archivosSolicitud_(filas, idSolicitud, huellaActual, formatear) {
  return filas.filter(function (a) { return a.ID_SOLICITUD === idSolicitud; })
    .sort(function (a, b) { return marcaDe_(b.FECHA) - marcaDe_(a.FECHA) || String(a.FORMATO).localeCompare(String(b.FORMATO)); })
    .map(function (a) {
      return { id: a.ID_ARCHIVO, tipo: a.TIPO, formato: a.FORMATO, nombre: String(a.NOMBRE || a.ID_ARCHIVO),
        pesoKb: Number(a.PESO_KB) || 0, conMarca: esActivo_(a.CON_MARCA_AGUA), revision: String(a.REVISION || ''),
        fecha: marcaDe_(a.FECHA) ? formatear(new Date(marcaDe_(a.FECHA))) : '', generadoPor: String(a.GENERADO_POR || ''),
        vigente: String(a.HUELLA_CONTENIDO) === String(huellaActual) };
    });
}

/**
 * El archivo como { nombre, tipo, formato, base64 } para que el navegador lo descargue o lo muestre en el
 * visor (paraVer); el permiso se revisa aquí (puedeDescargar_).
 */
function descargarArchivo_(sesion, idArchivo, paraVer) {
  const a = leerTabla_('Archivos').filter(function (x) { return x.ID_ARCHIVO === idArchivo; })[0];
  if (!a) throw new Error('No existe ese archivo.');
  const fila = filaSolicitud_(a.ID_SOLICITUD);
  if (!puedeDescargar_(sesion, fila, a)) throw new Error('No puedes descargar este archivo.');
  const blob = DriveApp.getFileById(a.ID_DRIVE).getBlob();
  registrarBitacora_(sesion, paraVer ? 'VER_ARCHIVO' : 'DESCARGAR_ARCHIVO', String(a.NOMBRE || a.ID_ARCHIVO), a.ID_SOLICITUD);
  return { nombre: String(a.NOMBRE || idArchivo), tipo: blob.getContentType(), formato: String(a.FORMATO || ''),
    base64: Utilities.base64Encode(blob.getBytes()) };
}
