/**
 * LLENADO DE PLANTILLAS — pone los datos de una solicitud en una COPIA de la plantilla (Google Docs).
 *
 * El contrato con la plantilla son los marcadores {{CLAVE}} de MARCADORES_PLANTILLA
 * (config/Config.gs, explicado en docs/plantillas.md#marcadores). La plantilla nunca se modifica:
 * siempre se trabaja sobre una copia.
 *
 * @param {Document} doc
 * @param {Object} datos
 * @param {Object<string,string>} datos.simples        { CODIGO: 'P-CM01-001', … }
 * @param {Object<string,string[]>} datos.listas        { PUESTOS: ['…'], RESPONSABILIDADES: ['Puesto: …'] }
 * @param {Object<string,string>} [datos.titulos]       { PUESTOS: 'Puestos y responsabilidades' }: nuevo título de su sección
 * @param {{responsable: string, descripcion: string, enlaces: {url: string, texto: string}[],
 *          imagenes: {blob: Blob, pie: string}[]}[]} datos.actividades
 * @return {{encontrados: Object<string,string[]>, sinLlenar: string[]}}
 */
function llenarPlantilla_(doc, datos) {
  const cuerpo = doc.getBody();
  const secciones = seccionesDelDocumento_(doc);
  const encontrados = marcadoresEnSecciones_(secciones);

  Object.keys(datos.titulos || {}).forEach(function (clave) { renombrarSeccion_(cuerpo, clave, datos.titulos[clave]); });
  MARCADORES_PLANTILLA.listas.forEach(function (clave) {
    const elementos = (datos.listas || {})[clave] || [];
    if (!elementos.length && MARCADORES_PLANTILLA.opcionales.indexOf(clave) !== -1) {
      quitarSeccion_(cuerpo, clave);
    } else {
      repetirParrafo_(cuerpo, clave, elementos);
    }
  });
  // Se renumera ANTES de insertar las actividades, para no confundirlas con títulos de sección.
  renumerarSecciones_(cuerpo);
  if (encontrados[MARCADORES_PLANTILLA.desarrollo]) insertarDesarrollo_(cuerpo, datos.actividades || []);

  const simples = datos.simples || {};
  Object.keys(simples).forEach(function (clave) {
    secciones.forEach(function (s) { reemplazarMarcador_(s.elemento, clave, simples[clave]); });
  });
  limpiarFinal_(cuerpo);

  return { encontrados: encontrados, sinLlenar: Object.keys(marcadoresEnSecciones_(secciones)) };
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

/** { CLAVE: ['cuerpo', 'pie 1'] } de los marcadores que hay en el documento. */
function marcadoresEnSecciones_(secciones) {
  const encontrados = {};
  secciones.forEach(function (s) {
    marcadoresEnTexto_(s.elemento.getText()).forEach(function (clave) {
      encontrados[clave] = encontrados[clave] || [];
      if (encontrados[clave].indexOf(s.nombre) === -1) encontrados[clave].push(s.nombre);
    });
  });
  return encontrados;
}

/**
 * Tamaño de una imagen dentro del documento: cabe en ANCHO × ALTO máximos sin deformarse y nunca se
 * agranda (una imagen chica se queda de su tamaño). Sin servicios de Google (se prueba en node).
 */
function tamanoImagen_(ancho, alto) {
  if (!ancho || !alto) return { ancho: ancho || 0, alto: alto || 0 };
  const escala = Math.min(1, ANCHO_IMAGEN_DOCUMENTO / ancho, ALTO_IMAGEN_DOCUMENTO / alto);
  return { ancho: Math.round(ancho * escala), alto: Math.round(alto * escala) };
}

/** Claves de los {{MARCADORES}} de un texto, sin repetir. Sin servicios de Google (se prueba en node). */
function marcadoresEnTexto_(texto) {
  const claves = [];
  const re = /\{\{([A-Z0-9_]+)\}\}/g;
  let m;
  while ((m = re.exec(String(texto))) !== null) { if (claves.indexOf(m[1]) === -1) claves.push(m[1]); }
  return claves;
}

function patronMarcador_(clave) {
  return '\\{\\{' + clave + '\\}\\}';
}

/**
 * Reemplaza {{CLAVE}} por `valor` conservando el formato del marcador (letra, tamaño, color). No usa
 * replaceText para que caracteres como $ o \ del valor se pongan tal cual.
 */
function reemplazarMarcador_(contenedor, clave, valor) {
  const texto = valor === null || valor === undefined ? '' : String(valor);
  let encontrado = contenedor.findText(patronMarcador_(clave));
  while (encontrado) {
    const t = encontrado.getElement().asText();
    const inicio = encontrado.getStartOffset();
    const atributos = t.getAttributes(inicio);
    t.deleteText(inicio, encontrado.getEndOffsetInclusive());
    if (texto) {
      t.insertText(inicio, texto);
      t.setAttributes(inicio, inicio + texto.length - 1, atributos);
    }
    encontrado = contenedor.findText(patronMarcador_(clave));
  }
}

/** El párrafo (o viñeta) que contiene el marcador, con su posición dentro del cuerpo. */
function parrafoDelMarcador_(cuerpo, clave) {
  const encontrado = cuerpo.findText(patronMarcador_(clave));
  if (!encontrado) return null;
  let parrafo = encontrado.getElement();
  while (parrafo.getParent() && parrafo.getParent().getType() !== DocumentApp.ElementType.BODY_SECTION) parrafo = parrafo.getParent();
  return { parrafo: parrafo, indice: cuerpo.getChildIndex(parrafo) };
}

/** Un párrafo por elemento, copiando el formato del párrafo del marcador. «Puesto: texto» pone el puesto en negritas. */
function repetirParrafo_(cuerpo, clave, elementos) {
  const p = parrafoDelMarcador_(cuerpo, clave);
  if (!p) return;
  let indice = p.indice;
  const nuevos = elementos.map(function (elemento) {
    const copia = p.parrafo.copy();
    const nuevo = p.parrafo.getType() === DocumentApp.ElementType.LIST_ITEM
      ? cuerpo.insertListItem(++indice, copia) : cuerpo.insertParagraph(++indice, copia);
    reemplazarMarcador_(nuevo, clave, elemento);
    const dosPuntos = String(elemento).indexOf(':');
    if (dosPuntos > 0 && dosPuntos < 80) nuevo.editAsText().setBold(0, dosPuntos, true);
    return nuevo;
  });
  // Entre elementos va poco espacio; el último conserva el de la plantilla (separa de la sección siguiente).
  nuevos.slice(0, -1).forEach(function (n) { n.setSpacingAfter(Math.min(n.getSpacingAfter() || 0, 4)); });
  p.parrafo.removeFromParent();
}

/**
 * Quita los párrafos vacíos del final del documento (dejaban una hoja en blanco). El último párrafo
 * no se puede borrar (Google Docs lo exige, sobre todo después de una tabla): se deja de 1 pt.
 */
function limpiarFinal_(cuerpo) {
  const vacio = function (e) {
    if (e.getType() !== DocumentApp.ElementType.PARAGRAPH) return false;
    const p = e.asParagraph();
    for (let i = 0; i < p.getNumChildren(); i++) {
      if (p.getChild(i).getType() !== DocumentApp.ElementType.TEXT) return false;   // trae imagen u otro objeto
    }
    return !p.getText().trim();
  };
  while (cuerpo.getNumChildren() > 1 && vacio(cuerpo.getChild(cuerpo.getNumChildren() - 1)) &&
         vacio(cuerpo.getChild(cuerpo.getNumChildren() - 2))) {
    cuerpo.getChild(cuerpo.getNumChildren() - 2).removeFromParent();
  }
  const ultimo = cuerpo.getChild(cuerpo.getNumChildren() - 1);
  if (vacio(ultimo)) {
    const a = {};
    a[DocumentApp.Attribute.FONT_SIZE] = 1;
    ultimo.asParagraph().setAttributes(a).setSpacingBefore(0).setSpacingAfter(0).setLineSpacing(1);
  }
}

/** Quita el párrafo del marcador y el título de su sección (el párrafo anterior). */
function quitarSeccion_(cuerpo, clave) {
  const p = parrafoDelMarcador_(cuerpo, clave);
  if (!p) return;
  const titulo = p.indice > 0 ? cuerpo.getChild(p.indice - 1) : null;
  p.parrafo.removeFromParent();
  if (titulo && titulo.getType() === DocumentApp.ElementType.PARAGRAPH &&
      /^\s*\d+\.\s/.test(titulo.asParagraph().getText())) titulo.removeFromParent();
}

/** Cambia el título de la sección de un marcador («3. Puestos involucrados» → «3. Puestos y responsabilidades»). */
function renombrarSeccion_(cuerpo, clave, titulo) {
  const p = parrafoDelMarcador_(cuerpo, clave);
  if (!p || p.indice < 1) return;
  const anterior = cuerpo.getChild(p.indice - 1);
  if (anterior.getType() !== DocumentApp.ElementType.PARAGRAPH) return;
  const t = anterior.asParagraph().editAsText();
  const m = /^(\s*\d+\.\s+)(.*\S)\s*$/.exec(t.getText());
  if (!m) return;
  const inicio = m[1].length;
  const atributos = t.getAttributes(inicio);
  t.deleteText(inicio, inicio + m[2].length - 1);
  t.insertText(inicio, titulo);
  t.setAttributes(inicio, inicio + titulo.length - 1, atributos);
}

/** Vuelve a numerar «1. Objetivo…», «2. …» en orden, por si se quitó una sección opcional. */
function renumerarSecciones_(cuerpo) {
  let n = 0;
  for (let i = 0; i < cuerpo.getNumChildren(); i++) {
    const hijo = cuerpo.getChild(i);
    if (hijo.getType() !== DocumentApp.ElementType.PARAGRAPH) continue;
    const t = hijo.asParagraph().editAsText();
    const m = /^(\s*)(\d+)\.\s/.exec(t.getText());
    if (!m) continue;
    n++;
    if (Number(m[2]) === n) continue;
    const inicio = m[1].length;
    const atributos = t.getAttributes(inicio);
    t.deleteText(inicio, inicio + m[2].length - 1);
    t.insertText(inicio, String(n));
    t.setAttributes(inicio, inicio + String(n).length - 1, atributos);
  }
}

/**
 * «04. Desarrollo» según Procesos: número, responsable, descripción e imágenes debajo con pie y
 * tamaño uniforme. Los párrafos copian sangría y espaciado del marcador; la letra se fija aquí para
 * que un formato no se «contagie» al siguiente (en la prueba, la cursiva del pie pasaba a la actividad).
 */
function insertarDesarrollo_(cuerpo, actividades) {
  const p = parrafoDelMarcador_(cuerpo, MARCADORES_PLANTILLA.desarrollo);
  if (!p) return;
  const estilo = function (extra) {
    const a = {};
    a[DocumentApp.Attribute.FONT_FAMILY] = 'Montserrat';
    a[DocumentApp.Attribute.FONT_SIZE] = 10;
    a[DocumentApp.Attribute.BOLD] = false;
    a[DocumentApp.Attribute.ITALIC] = false;
    a[DocumentApp.Attribute.FOREGROUND_COLOR] = '#384245';
    Object.keys(extra || {}).forEach(function (k) { a[k] = extra[k]; });
    return a;
  };
  let indice = p.indice;
  const nuevo = function (texto, atributos, alineacion) {
    const par = cuerpo.insertParagraph(++indice, p.parrafo.copy());
    par.setText(texto || ' ');
    par.editAsText().setAttributes(atributos);
    if (alineacion) par.setAlignment(alineacion);
    return par;
  };
  const negrita = {}; negrita[DocumentApp.Attribute.BOLD] = true; negrita[DocumentApp.Attribute.FOREGROUND_COLOR] = '#06263A';
  const pie = {}; pie[DocumentApp.Attribute.ITALIC] = true; pie[DocumentApp.Attribute.FONT_SIZE] = 8; pie[DocumentApp.Attribute.FOREGROUND_COLOR] = '#667085';
  const liga = {}; liga[DocumentApp.Attribute.FOREGROUND_COLOR] = '#1F5FA8'; liga[DocumentApp.Attribute.UNDERLINE] = true;

  actividades.forEach(function (a, i) {
    nuevo('Actividad ' + (i + 1) + ' · ' + (a.responsable || 'Responsable por confirmar'), estilo(negrita)).setSpacingBefore(10).setSpacingAfter(2);
    nuevo(a.descripcion, estilo()).setSpacingAfter(4);
    // Enlaces (páginas, carpetas, sistemas): «Descripción: dirección», con la dirección como liga.
    (a.enlaces || []).forEach(function (e) {
      const etiqueta = (e.texto || 'Enlace') + ': ';
      const par = nuevo(etiqueta + e.url, estilo()).setSpacingAfter(2);
      const t = par.editAsText();
      t.setLinkUrl(etiqueta.length, etiqueta.length + e.url.length - 1, e.url);
      t.setAttributes(etiqueta.length, etiqueta.length + e.url.length - 1, liga);
    });
    (a.imagenes || []).forEach(function (img, j) {
      // Google Docs no deja un párrafo con texto vacío: se crea con un espacio, se agrega la imagen
      // y luego se quita el espacio (si no se puede, se queda; no se nota porque va centrado).
      const par = nuevo(' ', estilo(), DocumentApp.HorizontalAlignment.CENTER);
      const imagen = par.appendInlineImage(img.blob);
      try {
        if (par.getChild(0).getType() === DocumentApp.ElementType.TEXT) par.getChild(0).removeFromParent();
      } catch (e) { /* se queda el espacio */ }
      const t = tamanoImagen_(imagen.getWidth(), imagen.getHeight());
      imagen.setWidth(t.ancho).setHeight(t.alto);
      nuevo('Imagen ' + (i + 1) + '.' + (j + 1) + (img.pie ? '. ' + img.pie : ''), estilo(pie), DocumentApp.HorizontalAlignment.CENTER).setSpacingAfter(6);
    });
  });
  p.parrafo.removeFromParent();
}
