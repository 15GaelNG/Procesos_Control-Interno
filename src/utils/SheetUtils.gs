/**
 * ACCESO A LA BASE DE DATOS (Google Sheets)
 *
 * Todo el código lee y escribe por NOMBRE DE COLUMNA, nunca por posición: así agregar columnas al
 * final (ver config/Esquema.gs) no rompe nada.
 *
 * Velocidad: abrir la base y cada consulta a una hoja son lo más lento de Apps Script. Dentro de UNA
 * ejecución (cada llamada del navegador es una ejecución nueva) se recuerdan la base, sus hojas y sus
 * encabezados. Las hojas de TABLAS_ESTABLES (usuarios, catálogos, Config) se recuerdan además ENTRE
 * llamadas, en la caché del script (TABLA_CACHE_SEGUNDOS): así casi ninguna pantalla abre la base para
 * saber quién es el usuario o leer catálogos. Las demás se leen siempre de nuevo (pueden cambiar a
 * media llamada, p. ej. Consecutivos bajo el candado). Toda escritura por aquí olvida lo recordado de
 * esa hoja; quien escriba la hoja por otro camino (SetupInicial) llama a olvidarTablas_(), y una
 * edición a mano en la hoja la olvida con el disparador onEdit (Disparadores.gs). Antes de ESCRIBIR una
 * hoja estable por número de renglón, se lee fresca (leerTablaFresca_).
 *
 * Cada apertura, lectura y escritura deja su tiempo en el registro de la ejecución (Apps Script →
 * Ejecuciones → la llamada): así se ve dónde se va el tiempo de una pantalla lenta.
 */

/** Deja en el registro cuánto tardó una operación con la base. */
function registrarTiempoBD_(que, inicio) {
  console.log('[BD] ' + que + ': ' + (Date.now() - inicio) + ' ms');
}

/** Lo recordado en esta ejecución. Se guarda como propiedad de la función: no sobrevive a la ejecución. */
function memoriaBD_() {
  if (!memoriaBD_.datos) memoriaBD_.datos = { bd: null, hojas: {}, encabezados: {}, tablas: {} };
  return memoriaBD_.datos;
}

/** Olvida todo lo recordado (después de cambiar hojas o encabezados por fuera de estas funciones). */
function olvidarTablas_() {
  memoriaBD_.datos = null;
  try { CacheService.getScriptCache().removeAll(TABLAS_ESTABLES.map(claveCacheTabla_)); } catch (e) { /* sin caché */ }
}

function claveCacheTabla_(nombre) {
  return 'tabla-' + nombre;
}

function esFechaBD_(v) {
  return Object.prototype.toString.call(v) === '[object Date]';
}

/** Guarda los valores de una hoja estable en la caché del script (las fechas como { $f: ms }). */
function guardarTablaEnCache_(nombre, valores) {
  try {
    const texto = JSON.stringify(valores.map(function (r) {
      return r.map(function (v) { return esFechaBD_(v) ? { $f: v.getTime() } : v; });
    }));
    if (texto.length <= TABLA_CACHE_MAX_CARACTERES) CacheService.getScriptCache().put(claveCacheTabla_(nombre), texto, TABLA_CACHE_SEGUNDOS);
  } catch (e) { /* sin caché: la próxima vez se lee la hoja */ }
}

/** Los valores de una hoja estable desde la caché, o null si no están. */
function leerTablaDeCache_(nombre) {
  try {
    const texto = CacheService.getScriptCache().get(claveCacheTabla_(nombre));
    if (!texto) return null;
    return JSON.parse(texto).map(function (r) {
      return r.map(function (v) { return v && typeof v === 'object' && v.$f !== undefined ? new Date(v.$f) : v; });
    });
  } catch (e) { return null; }
}

/** La hoja de la base de datos del ambiente: la guardada en ID_BD o, si no hay, la hoja ligada. */
function obtenerBD_() {
  const m = memoriaBD_();
  if (!m.bd) {
    const inicio = Date.now();
    const id = PropertiesService.getScriptProperties().getProperty(PROP.ID_BD);
    m.bd = id ? SpreadsheetApp.openById(id) : SpreadsheetApp.getActiveSpreadsheet();
    registrarTiempoBD_('abrir la base', inicio);
  }
  return m.bd;
}

function obtenerHoja_(nombre) {
  const m = memoriaBD_();
  if (!m.hojas[nombre]) {
    const hoja = obtenerBD_().getSheetByName(nombre);
    if (!hoja) throw new Error('No existe la hoja "' + nombre + '". Corre verificarBase() desde el editor.');
    m.hojas[nombre] = hoja;
  }
  return m.hojas[nombre];
}

function leerEncabezados_(hoja) {
  if (hoja.getLastColumn() === 0) return [];
  return hoja.getRange(1, 1, 1, hoja.getLastColumn()).getValues()[0].map(function (v) { return String(v).trim(); });
}

/** Encabezados de una hoja por nombre, recordados en la ejecución. */
function encabezadosDe_(nombre) {
  const m = memoriaBD_();
  if (!m.encabezados[nombre]) m.encabezados[nombre] = leerEncabezados_(obtenerHoja_(nombre));
  return m.encabezados[nombre];
}

/** Toda la hoja como arreglo de objetos { COLUMNA: valor }, con _fila (número de renglón en la hoja). */
function leerTabla_(nombre) {
  const m = memoriaBD_();
  const estable = TABLAS_ESTABLES.indexOf(nombre) !== -1;
  if (!estable || !m.tablas[nombre]) {
    let valores = estable ? leerTablaDeCache_(nombre) : null;
    if (!valores) {
      // Una sola consulta: encabezados y datos juntos.
      const inicio = Date.now();
      valores = obtenerHoja_(nombre).getDataRange().getValues();
      registrarTiempoBD_('leer ' + nombre + ' (' + Math.max(valores.length - 1, 0) + ' renglones)', inicio);
      if (estable) guardarTablaEnCache_(nombre, valores);
    }
    const encabezados = (valores[0] || []).map(function (v) { return String(v).trim(); });
    m.encabezados[nombre] = encabezados;
    const filas = valores.slice(1).map(function (fila, i) {
      const obj = { _fila: i + 2 };
      encabezados.forEach(function (col, j) { obj[col] = fila[j]; });
      return obj;
    });
    if (!estable) return filas;
    m.tablas[nombre] = filas;
  }
  // Copias: quien modifique un renglón no cambia lo recordado.
  return m.tablas[nombre].map(function (o) { return Object.assign({}, o); });
}

/** Después de escribir una hoja: lo recordado de ella ya no sirve. */
function olvidarTabla_(nombre) {
  delete memoriaBD_().tablas[nombre];
  if (TABLAS_ESTABLES.indexOf(nombre) !== -1) {
    try { CacheService.getScriptCache().remove(claveCacheTabla_(nombre)); } catch (e) { /* sin caché */ }
  }
}

/** La hoja leída de la base (no de lo recordado): para escribir después por número de renglón. */
function leerTablaFresca_(nombre) {
  olvidarTabla_(nombre);
  return leerTabla_(nombre);
}

/** Agrega un renglón a partir de un objeto { COLUMNA: valor }. Las columnas que no vengan quedan vacías. */
function agregarFila_(nombre, objeto) {
  const inicio = Date.now();
  const hoja = obtenerHoja_(nombre);
  const fila = encabezadosDe_(nombre).map(function (col) { return objeto[col] === undefined ? '' : objeto[col]; });
  hoja.appendRow(fila);
  olvidarTabla_(nombre);
  registrarTiempoBD_('agregar a ' + nombre, inicio);
  return hoja.getLastRow();
}

/** Agrega varios renglones en una sola escritura (mucho más rápido que agregarFila_ en un ciclo). */
function agregarFilas_(nombre, objetos) {
  if (!objetos.length) return;
  const hoja = obtenerHoja_(nombre);
  const encabezados = encabezadosDe_(nombre);
  const filas = objetos.map(function (o) {
    return encabezados.map(function (col) { return o[col] === undefined ? '' : o[col]; });
  });
  const inicio = Date.now();
  hoja.getRange(hoja.getLastRow() + 1, 1, filas.length, encabezados.length).setValues(filas);
  olvidarTabla_(nombre);
  registrarTiempoBD_('agregar ' + filas.length + ' a ' + nombre, inicio);
}

/**
 * Actualiza solo las columnas indicadas de un renglón existente. Las columnas vecinas se escriben
 * juntas (una consulta por grupo); las demás celdas del renglón no se tocan.
 */
function actualizarFila_(nombre, numeroFila, cambios) {
  const inicio = Date.now();
  const hoja = obtenerHoja_(nombre);
  gruposDeColumnas_(encabezadosDe_(nombre), cambios, nombre).forEach(function (g) {
    hoja.getRange(numeroFila, g.columna, 1, g.valores.length).setValues([g.valores]);
  });
  olvidarTabla_(nombre);
  registrarTiempoBD_('actualizar ' + nombre + ' renglón ' + numeroFila, inicio);
}

/**
 * Agrupa los cambios en columnas vecinas: { A: 1, B: 2, D: 4 } con encabezados A B C D →
 * [{ columna: 1, valores: [1, 2] }, { columna: 4, valores: [4] }] (sin tocar Google).
 */
function gruposDeColumnas_(encabezados, cambios, nombre) {
  const posiciones = Object.keys(cambios).map(function (col) {
    const i = encabezados.indexOf(col);
    if (i === -1) throw new Error('La hoja "' + nombre + '" no tiene la columna ' + col);
    return { i: i, valor: cambios[col] };
  }).sort(function (a, b) { return a.i - b.i; });
  const grupos = [];
  posiciones.forEach(function (p) {
    const ultimo = grupos[grupos.length - 1];
    if (ultimo && ultimo.columna + ultimo.valores.length - 1 === p.i) ultimo.valores.push(p.valor);
    else grupos.push({ columna: p.i + 1, valores: [p.valor] });
  });
  return grupos;
}
