/**
 * PLANTILLAS (fase 0: prueba de concepto) — se corre a mano desde el editor.
 *
 *   prepararPlantillas()  → por cada Word (.docx) en la carpeta Plantillas del ambiente crea dos
 *                           Google Docs: «<nombre> - Preliminar» (tal cual, con «COPIA NO AUTORIZADA»)
 *                           y «<nombre> - Final» (el mismo Word sin la marca de agua).
 *   probarPlantillas()    → llena una copia de cada una con datos de EJEMPLO y la exporta a PDF y Word
 *                           en «Plantillas/Pruebas de generación», para revisar qué tanto conserva el
 *                           diseño y qué textos se pudieron reemplazar.
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

  const docs = carpeta.getFilesByType(MimeType.GOOGLE_DOCS);
  let total = 0;
  while (docs.hasNext()) {
    const plantilla = docs.next();
    const nombre = plantilla.getName();
    if (!/ - (Preliminar|Final)$/.test(nombre)) continue;
    total++;
    const copia = plantilla.makeCopy('PRUEBA ' + sello + ' · ' + nombre, destino);
    const doc = DocumentApp.openById(copia.getId());
    const reporte = llenarConEjemplo_(doc);
    doc.saveAndClose();

    const pdf = destino.createFile(copia.getAs(MimeType.PDF)).setName(copia.getName() + '.pdf');
    const docx = destino.createFile(exportarDocx_(copia.getId())).setName(copia.getName() + '.docx');

    lineas.push(nombre.toUpperCase());
    lineas.push('  Google Doc: ' + urlDoc_(copia.getId()));
    lineas.push('  PDF:        ' + pdf.getUrl());
    lineas.push('  Word:       ' + docx.getUrl());
    lineas.push('  Textos de la plantilla:');
    reporte.textos.forEach(function (t) {
      lineas.push('    ' + (t.reemplazos ? '✔' : '✘') + ' «' + t.buscar + '»' +
        (t.reemplazos ? ' → ' + t.reemplazos + ' vez/veces en ' + t.secciones.join(', ') : ' — no se encontró (¿está en un cuadro de texto?)'));
    });
    lineas.push('  Desarrollo: ' + (reporte.desarrollo ? 'se insertaron 3 actividades de ejemplo con imagen' : '✘ no se encontró el título «Desarrollo»'));
    lineas.push('');
  }
  if (!total) lineas.push('No hay plantillas «- Preliminar» / «- Final». Corre primero prepararPlantillas().');
  Logger.log(lineas.join('\n'));
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

/**
 * Reemplaza los textos de ejemplo de la plantilla institucional y agrega actividades en
 * «Desarrollo». Revisa cuerpo, encabezados y pies (todas sus variantes: primera página, pares…).
 */
function llenarConEjemplo_(doc) {
  const textos = [
    { buscar: 'NOMBRE DEL PROCESO', poner: 'ALTA DE PROVEEDORES' },
    { buscar: 'Nombre del proceso o procedimiento', poner: 'Alta de proveedores' },
    { buscar: 'Nombre del departamento', poner: 'Compras' },
    { buscar: 'Proceso / Procedimiento', poner: 'Procedimiento' },
    { buscar: 'Establecer los lineamientos estándar para la ejecución homogénea de procesos dentro de Ciudad Maderas, asegurando agilidad operativa y calidad en el servicio.',
      poner: 'Describir cómo se registra un proveedor nuevo para que las áreas puedan solicitarle bienes o servicios. (TEXTO DE EJEMPLO)' },
    { buscar: 'Aplica directamente para los desarrollos inmobiliarios, direcciones y áreas involucradas en la ejecución del procedimiento.',
      poner: 'Aplica al departamento de Compras y a las áreas que solicitan el alta de un proveedor. (TEXTO DE EJEMPLO)' },
    { buscar: 'Dirección de Operaciones Inmobiliarias', poner: 'Compras: Auxiliar de Compras, Jefe de Compras' },
    { buscar: '[Nombre del Elaborador]', poner: 'Persona de Ejemplo · Auxiliar de Compras' },
    { buscar: '[Nombre del Revisor]', poner: 'Persona de Ejemplo · Analista de Procesos' },
    { buscar: '[Nombre del Autorizador]', poner: 'Persona de Ejemplo · Dirección' },
    { buscar: 'PRO-CM01-001', poner: 'PRO-XX00-000' },
    { buscar: 'MM/ AÑO', poner: '10/2026' },
    { buscar: 'Código', poner: 'PRO-XX00-000' }
  ];
  const secciones = seccionesDelDocumento_(doc);
  textos.forEach(function (t) {
    t.reemplazos = 0;
    t.secciones = [];
    const patron = escaparRegex_(t.buscar);
    secciones.forEach(function (s) {
      let n = 0;
      let encontrado = s.elemento.findText(patron);
      while (encontrado) { n++; encontrado = s.elemento.findText(patron, encontrado); }
      if (n) {
        s.elemento.replaceText(patron, t.poner);
        t.reemplazos += n;
        if (t.secciones.indexOf(s.nombre) === -1) t.secciones.push(s.nombre);
      }
    });
  });
  return { textos: textos, desarrollo: insertarActividadesDeEjemplo_(doc.getBody()) };
}

/** Cuerpo + todos los encabezados y pies (DocumentApp solo expone el principal por getHeader()). */
function seccionesDelDocumento_(doc) {
  const secciones = [{ nombre: 'cuerpo', elemento: doc.getBody() }];
  const raiz = doc.getBody().getParent();
  let h = 0;
  let f = 0;
  for (let i = 0; i < raiz.getNumChildren(); i++) {
    const hijo = raiz.getChild(i);
    if (hijo.getType() === DocumentApp.ElementType.HEADER_SECTION) secciones.push({ nombre: 'encabezado ' + (++h), elemento: hijo.asHeaderSection() });
    if (hijo.getType() === DocumentApp.ElementType.FOOTER_SECTION) secciones.push({ nombre: 'pie ' + (++f), elemento: hijo.asFooterSection() });
  }
  return secciones;
}

function insertarActividadesDeEjemplo_(cuerpo) {
  const titulo = cuerpo.findText('Desarrollo');
  if (!titulo) return false;
  const parrafo = titulo.getElement().getParent();
  let indice = cuerpo.getChildIndex(parrafo.getType() === DocumentApp.ElementType.PARAGRAPH ? parrafo : parrafo.getParent());
  const actividades = [
    ['Auxiliar de Compras', 'Recibe la solicitud del área y revisa que incluya la constancia de situación fiscal y el estado de cuenta.'],
    ['(pendiente de confirmar)', 'Captura los datos del proveedor en el sistema.'],
    ['Jefe de Compras', 'Revisa la captura y, si es correcta, autoriza el alta.']
  ];
  actividades.forEach(function (a, n) {
    const encabezado = cuerpo.insertParagraph(++indice, 'Actividad ' + (n + 1) + ' · ' + a[0]);
    encabezado.editAsText().setBold(true);
    cuerpo.insertParagraph(++indice, a[1]).editAsText().setBold(false);
    if (n === 0) {
      const imagen = cuerpo.insertParagraph(++indice, '').appendInlineImage(imagenDeEjemplo_());
      const ancho = 420;
      imagen.setHeight(Math.round(imagen.getHeight() * ancho / imagen.getWidth())).setWidth(ancho);
      cuerpo.insertParagraph(++indice, 'Imagen 1. Captura de ejemplo').editAsText().setItalic(true).setFontSize(9);
    }
  });
  return true;
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

function escaparRegex_(texto) {
  return texto.replace(/[.*+?^${}()|[\]\\\/]/g, '\\$&');
}
