/**
 * ACCESO A LA BASE DE DATOS (Google Sheets)
 *
 * Todo el código lee y escribe por NOMBRE DE COLUMNA, nunca por posición: así agregar columnas al
 * final (ver config/Esquema.gs) no rompe nada.
 */

/** La hoja de la base de datos del ambiente: la guardada en ID_BD o, si no hay, la hoja ligada. */
function obtenerBD_() {
  const id = PropertiesService.getScriptProperties().getProperty(PROP.ID_BD);
  return id ? SpreadsheetApp.openById(id) : SpreadsheetApp.getActiveSpreadsheet();
}

function obtenerHoja_(nombre) {
  const hoja = obtenerBD_().getSheetByName(nombre);
  if (!hoja) throw new Error('No existe la hoja "' + nombre + '". Corre verificarBase() desde el editor.');
  return hoja;
}

function leerEncabezados_(hoja) {
  if (hoja.getLastColumn() === 0) return [];
  return hoja.getRange(1, 1, 1, hoja.getLastColumn()).getValues()[0].map(function (v) { return String(v).trim(); });
}

/** Toda la hoja como arreglo de objetos { COLUMNA: valor }, con _fila (número de renglón en la hoja). */
function leerTabla_(nombre) {
  const hoja = obtenerHoja_(nombre);
  const encabezados = leerEncabezados_(hoja);
  if (hoja.getLastRow() < 2) return [];
  return hoja.getRange(2, 1, hoja.getLastRow() - 1, encabezados.length).getValues().map(function (fila, i) {
    const obj = { _fila: i + 2 };
    encabezados.forEach(function (col, j) { obj[col] = fila[j]; });
    return obj;
  });
}

/** Agrega un renglón a partir de un objeto { COLUMNA: valor }. Las columnas que no vengan quedan vacías. */
function agregarFila_(nombre, objeto) {
  const hoja = obtenerHoja_(nombre);
  const encabezados = leerEncabezados_(hoja);
  const fila = encabezados.map(function (col) { return objeto[col] === undefined ? '' : objeto[col]; });
  hoja.appendRow(fila);
  return hoja.getLastRow();
}

/** Agrega varios renglones en una sola escritura (mucho más rápido que agregarFila_ en un ciclo). */
function agregarFilas_(nombre, objetos) {
  if (!objetos.length) return;
  const hoja = obtenerHoja_(nombre);
  const encabezados = leerEncabezados_(hoja);
  const filas = objetos.map(function (o) {
    return encabezados.map(function (col) { return o[col] === undefined ? '' : o[col]; });
  });
  hoja.getRange(hoja.getLastRow() + 1, 1, filas.length, encabezados.length).setValues(filas);
}

/** Actualiza solo las columnas indicadas de un renglón existente. */
function actualizarFila_(nombre, numeroFila, cambios) {
  const hoja = obtenerHoja_(nombre);
  const encabezados = leerEncabezados_(hoja);
  Object.keys(cambios).forEach(function (col) {
    const i = encabezados.indexOf(col);
    if (i === -1) throw new Error('La hoja "' + nombre + '" no tiene la columna ' + col);
    hoja.getRange(numeroFila, i + 1).setValue(cambios[col]);
  });
}
