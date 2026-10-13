/**
 * PLANTILLAS (fase 0: prueba de concepto) — se corre a mano desde el editor.
 *
 *   prepararPlantillas()  → por cada Word (.docx) en la carpeta Plantillas del ambiente crea dos
 *                           Google Docs: «<nombre> - Preliminar» (tal cual, con «COPIA NO AUTORIZADA»)
 *                           y «<nombre> - Final» (el mismo Word sin la marca de agua).
 *   probarPlantillas()    → llena una copia de cada plantilla v2 (con marcadores {{...}}) con datos de
 *                           EJEMPLO usando llenarPlantilla_ (documentos/Llenado.gs) y la exporta a PDF
 *                           y Word en «Plantillas/Pruebas de generación».
 *
 * Así Procesos solo sube UN Word por tipo de documento (con la marca) y el sistema arma las dos
 * versiones. El final nunca se obtiene «borrando» la marca de un archivo ya generado: es otro
 * archivo desde la plantilla sin marca (requerimiento §4.4).
 */

function prepararPlantillas() {
  const carpeta = DriveApp.getFolderById(propiedadObligatoria_('ID_CARPETA_PLANTILLAS'));
  const marca = obtenerConfig_('MARCA_AGUA_TEXTO', 'COPIA NO AUTORIZADA');
  const lineas = [];
  const archivos = carpeta.getFilesByType(MIME_DOCX);
  let total = 0;
  while (archivos.hasNext()) {
    const word = archivos.next();
    total++;
    const base = word.getName().replace(/\.docx$/i, '');
    lineas.push('WORD: ' + word.getName());

    const preliminar = buscarDocPorNombre_(carpeta, base + SUFIJO_PRELIMINAR);
    if (preliminar) {
      lineas.push('  · Preliminar ya existe (bórrala si quieres regenerarla): ' + urlDoc_(preliminar.getId()));
    } else {
      lineas.push('  · Preliminar creada: ' + urlDoc_(convertirAGoogleDocs_(word.getBlob(), base + SUFIJO_PRELIMINAR, carpeta.getId())));
    }

    const final = buscarDocPorNombre_(carpeta, base + SUFIJO_FINAL);
    if (final) {
      lineas.push('  · Final ya existe (bórrala si quieres regenerarla): ' + urlDoc_(final.getId()));
    } else {
      const sinMarca = docxSinMarcaDeAgua_(word.getBlob(), marca);
      lineas.push('  · Marcas de agua quitadas: ' + sinMarca.quitadas + ' (en ' + sinMarca.encabezados.join(', ') + ')');
      if (!sinMarca.quitadas) lineas.push('    ⚠ No se encontró «' + marca + '» en los encabezados: la versión final saldría igual que la preliminar.');
      lineas.push('  · Final creada: ' + urlDoc_(convertirAGoogleDocs_(sinMarca.blob, base + SUFIJO_FINAL, carpeta.getId())));
    }
  }
  if (!total) lineas.push('No hay archivos Word (.docx) en la carpeta Plantillas de este ambiente.');
  Logger.log(lineas.join('\n'));
}

function probarPlantillas() {
  const carpeta = DriveApp.getFolderById(propiedadObligatoria_('ID_CARPETA_PLANTILLAS'));
  const destino = asegurarCarpeta_(carpeta, CARPETA_PRUEBAS_GENERACION, null,
    'Documentos generados con datos de ejemplo para revisar las plantillas. Se pueden borrar.');
  const sello = Utilities.formatDate(new Date(), ZONA_HORARIA, 'yyyy-MM-dd HH.mm');
  const lineas = ['Resultados en: https://drive.google.com/drive/folders/' + destino.getId(), ''];
  const esperados = MARCADORES_PLANTILLA.simples.concat(MARCADORES_PLANTILLA.listas, [MARCADORES_PLANTILLA.desarrollo]);

  const docs = carpeta.getFilesByType(MimeType.GOOGLE_DOCS);
  let total = 0;
  while (docs.hasNext()) {
    const plantilla = docs.next();
    const nombre = plantilla.getName();
    if (!/ - (Preliminar|Final)$/.test(nombre)) continue;
    if (!marcadoresEnTexto_(DocumentApp.openById(plantilla.getId()).getBody().getText()).length) {
      lineas.push(nombre + ': se omite (no tiene marcadores {{...}}; es una plantilla anterior a la v2).', '');
      continue;
    }
    total++;
    const copia = plantilla.makeCopy('PRUEBA ' + sello + ' · ' + nombre, destino);
    const doc = DocumentApp.openById(copia.getId());
    const reporte = llenarPlantilla_(doc, datosDeEjemplo_());
    doc.saveAndClose();

    const pdf = destino.createFile(copia.getAs(MimeType.PDF)).setName(copia.getName() + '.pdf');
    const docx = destino.createFile(exportarDocx_(copia.getId())).setName(copia.getName() + '.docx');

    lineas.push(nombre.toUpperCase());
    lineas.push('  Google Doc: ' + urlDoc_(copia.getId()));
    lineas.push('  PDF:        ' + pdf.getUrl());
    lineas.push('  Word:       ' + docx.getUrl());
    lineas.push('  Marcadores de la plantilla:');
    esperados.forEach(function (clave) {
      const donde = reporte.encontrados[clave];
      lineas.push('    ' + (donde ? '✔' : '✘') + ' {{' + clave + '}}' + (donde ? ' (' + donde.join(', ') + ')' : ' — no está en la plantilla'));
    });
    Object.keys(reporte.encontrados).filter(function (c) { return esperados.indexOf(c) === -1; }).forEach(function (c) {
      lineas.push('    ? {{' + c + '}} — está en la plantilla pero el sistema no lo conoce');
    });
    lineas.push('  Sin llenar al final: ' + (reporte.sinLlenar.length ? reporte.sinLlenar.join(', ') : 'ninguno'));
    lineas.push('');
  }
  if (!total) lineas.push('No hay plantillas v2 «- Preliminar» / «- Final». Sube Procedimiento.docx y corre prepararPlantillas().');
  Logger.log(lineas.join('\n'));
}

/** Datos INVENTADOS para la prueba (el proceso de ejemplo de probarIA). */
function datosDeEjemplo_() {
  return {
    simples: {
      NOMBRE_PORTADA: 'ALTA DE PROVEEDORES', CODIGO: 'P-CM01-001', TIPO_DOCUMENTO: 'Procedimiento',
      NOMBRE_DOCUMENTO: 'Alta de proveedores', DEPARTAMENTO: 'Compras', VERSION: '0.0', FECHA_ACTUALIZACION: '10/2026',
      OBJETIVO: 'Registrar a los proveedores nuevos que solicitan las áreas, verificando su documentación fiscal y bancaria antes de autorizarlos. (EJEMPLO)',
      ALCANCE: 'Inicia cuando un área solicita el alta de un proveedor y termina cuando el proveedor queda activo y se avisa al área. (EJEMPLO)',
      ELABORO_NOMBRE: 'Persona de Ejemplo', ELABORO_PUESTO: 'Auxiliar de Compras', FECHA_ELABORACION: '13/10/2026',
      REVISO_NOMBRE: 'Persona de Ejemplo', REVISO_PUESTO: 'Analista de Procesos', FECHA_REVISION: '14/10/2026',
      AUTORIZO_NOMBRE: 'Persona de Ejemplo', AUTORIZO_PUESTO: 'Director de Administración', FECHA_AUTORIZACION: '',
      CAMBIO_VERSION: '0.0', CAMBIO_FECHA: '10/2026', CAMBIO_DESCRIPCION: 'Emisión inicial del documento.', CAMBIO_RESPONSABLE: 'Auxiliar de Compras'
    },
    listas: {
      PUESTOS: ['Compras: Auxiliar de Compras, Jefe de Compras', 'Área solicitante'],
      RESPONSABILIDADES: [
        'Auxiliar de Compras: recibir la solicitud, revisar la documentación y capturar los datos del proveedor.',
        'Jefe de Compras: revisar la captura y autorizar el alta.'],
      DEFINICIONES: []   // vacía a propósito: la sección debe desaparecer y renumerarse las demás
    },
    actividades: [
      { responsable: 'Auxiliar de Compras', descripcion: 'Recibe la solicitud del área y revisa que incluya la constancia de situación fiscal y el estado de cuenta.',
        imagenes: [{ blob: imagenDeEjemplo_(), pie: 'Bandeja de solicitudes (ejemplo)' }] },
      { responsable: 'Auxiliar de Compras', descripcion: 'Captura los datos del proveedor en el sistema.', imagenes: [] },
      { responsable: 'Jefe de Compras', descripcion: 'Revisa la captura y, si es correcta, autoriza el alta.', imagenes: [] },
      { responsable: '', descripcion: 'Se avisa al área solicitante que el proveedor quedó registrado.', imagenes: [] }
    ]
  };
}

// ─────────────────────────────────── Marca de agua ───────────────────────────────────

/**
 * Copia del .docx sin la marca de agua de sus encabezados.
 * @return {{blob: Blob, quitadas: number, encabezados: string[]}}
 */
function docxSinMarcaDeAgua_(blobDocx, marca) {
  const partes = Utilities.unzip(blobDocx.setContentType('application/zip'));
  let quitadas = 0;
  const encabezados = [];
  const nuevas = partes.map(function (parte) {
    if (!/^word\/header\d*\.xml$/.test(parte.getName())) return parte;
    const r = quitarMarcaDeAguaXml_(parte.getDataAsString('UTF-8'), marca);
    if (!r.quitadas) return parte;
    quitadas += r.quitadas;
    encabezados.push(parte.getName().replace('word/', ''));
    return Utilities.newBlob(r.xml, 'application/xml', parte.getName()).setDataFromString(r.xml, 'UTF-8');
  });
  const blob = Utilities.zip(nuevas, 'sin-marca.docx').setContentType(MIME_DOCX);
  return { blob: blob, quitadas: quitadas, encabezados: encabezados };
}

/**
 * Quita del XML de un encabezado de Word el objeto (WordArt clásico o forma moderna) que contiene
 * el texto de la marca, junto con el run (<w:r>) que lo envuelve. Lo demás queda intacto.
 * Sin servicios de Google: se prueba en tests/plantillas.test.js.
 * @return {{xml: string, quitadas: number}}
 */
function quitarMarcaDeAguaXml_(xml, marca) {
  let quitadas = 0;
  let i = xml.indexOf(marca);
  while (i !== -1) {
    // El contenedor más externo que encierra el texto de la marca.
    let inicio = -1;
    let fin = -1;
    ['mc:AlternateContent', 'w:pict', 'w:drawing'].forEach(function (etiqueta) {
      const s = ultimaApertura_(xml, etiqueta, i);
      const cierre = '</' + etiqueta + '>';
      const e = xml.indexOf(cierre, i);
      const encierra = s !== -1 && e !== -1 && xml.lastIndexOf(cierre, i) < s;
      if (encierra && (inicio === -1 || s < inicio)) { inicio = s; fin = e + cierre.length; }
    });
    if (inicio === -1) break;
    // El run que lo contiene.
    const run = Math.max(xml.lastIndexOf('<w:r>', inicio), xml.lastIndexOf('<w:r ', inicio));
    const finRun = xml.indexOf('</w:r>', fin);
    if (run === -1 || finRun === -1) break;
    xml = xml.slice(0, run) + xml.slice(finRun + '</w:r>'.length);
    quitadas++;
    i = xml.indexOf(marca);
  }
  return { xml: xml, quitadas: quitadas };
}

/** Posición de la última apertura de <etiqueta> (con atributos o sin ellos) antes de `antes`. */
function ultimaApertura_(xml, etiqueta, antes) {
  return Math.max(xml.lastIndexOf('<' + etiqueta + '>', antes), xml.lastIndexOf('<' + etiqueta + ' ', antes));
}

// ─────────────────────────────────── Generación ───────────────────────────────────

/** Convierte un .docx a Google Docs dentro de la carpeta. Devuelve el ID del nuevo documento. */
function convertirAGoogleDocs_(blobDocx, nombre, idCarpeta) {
  const archivo = Drive.Files.create({ name: nombre, mimeType: MimeType.GOOGLE_DOCS, parents: [idCarpeta] },
    blobDocx.setContentType(MIME_DOCX), { supportsAllDrives: true });
  return archivo.id;
}

/** El Google Doc exportado como Word. */
function exportarDocx_(idDoc) {
  const resp = UrlFetchApp.fetch('https://docs.google.com/document/d/' + idDoc + '/export?format=docx', {
    headers: { Authorization: 'Bearer ' + ScriptApp.getOAuthToken() },
    muteHttpExceptions: true
  });
  if (resp.getResponseCode() !== 200) throw new Error('No se pudo exportar a Word (' + resp.getResponseCode() + ').');
  return resp.getBlob().setContentType(MIME_DOCX);
}

/** Imagen PNG de relleno (una gráfica sencilla), para probar la inserción y el tamaño. */
function imagenDeEjemplo_() {
  const datos = Charts.newDataTable().addColumn(Charts.ColumnType.STRING, 'Paso').addColumn(Charts.ColumnType.NUMBER, 'Valor')
    .addRow(['Solicitud', 3]).addRow(['Captura', 5]).addRow(['Autorización', 2]).build();
  return Charts.newBarChart().setDataTable(datos).setTitle('Captura de ejemplo').setDimensions(800, 400).build()
    .getAs('image/png').setName('ejemplo.png');
}

// ─────────────────────────────────── Ayudantes ───────────────────────────────────

function buscarDocPorNombre_(carpeta, nombre) {
  const it = carpeta.getFilesByName(nombre);
  while (it.hasNext()) {
    const f = it.next();
    if (f.getMimeType() === MimeType.GOOGLE_DOCS && !f.isTrashed()) return f;
  }
  return null;
}

function propiedadObligatoria_(clave) {
  const valor = PropertiesService.getScriptProperties().getProperty(clave);
  if (!valor) throw new Error('Falta la Propiedad del script ' + clave + '. Corre la instalación del ambiente.');
  return valor;
}

function urlDoc_(id) {
  return 'https://docs.google.com/document/d/' + id + '/edit';
}
