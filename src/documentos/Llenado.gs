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
 * @param {{responsable: string, descripcion: string, imagenes: {blob: Blob, pie: string}[]}[]} datos.actividades
 * @return {{encontrados: Object<string,string[]>, sinLlenar: string[]}}
 */
function llenarPlantilla_(doc, datos) {
  const cuerpo = doc.getBody();
  const secciones = seccionesDelDocumento_(doc);
  const encontrados = marcadoresEnSecciones_(secciones);

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
  elementos.forEach(function (elemento) {
    const copia = p.parrafo.copy();
    const nuevo = p.parrafo.getType() === DocumentApp.ElementType.LIST_ITEM
      ? cuerpo.insertListItem(++indice, copia) : cuerpo.insertParagraph(++indice, copia);
    reemplazarMarcador_(nuevo, clave, elemento);
    const dosPuntos = String(elemento).indexOf(':');
    if (dosPuntos > 0 && dosPuntos < 80) nuevo.editAsText().setBold(0, dosPuntos, true);
  });
  p.parrafo.removeFromParent();
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

  actividades.forEach(function (a, i) {
    nuevo('Actividad ' + (i + 1) + ' · ' + (a.responsable || 'Responsable por confirmar'), estilo(negrita)).setSpacingBefore(10).setSpacingAfter(2);
    nuevo(a.descripcion, estilo()).setSpacingAfter(4);
    (a.imagenes || []).forEach(function (img, j) {
      const par = nuevo('', estilo(), DocumentApp.HorizontalAlignment.CENTER);
      par.setText('');
      const imagen = par.appendInlineImage(img.blob);
      const ancho = Math.min(ANCHO_IMAGEN_DOCUMENTO, imagen.getWidth());
      imagen.setHeight(Math.round(imagen.getHeight() * ancho / imagen.getWidth())).setWidth(ancho);
      nuevo('Imagen ' + (i + 1) + '.' + (j + 1) + (img.pie ? '. ' + img.pie : ''), estilo(pie), DocumentApp.HorizontalAlignment.CENTER).setSpacingAfter(6);
    });
  });
  p.parrafo.removeFromParent();
}
