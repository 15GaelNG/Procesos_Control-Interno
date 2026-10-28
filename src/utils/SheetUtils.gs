/**
 * ACCESO A LA BASE DE DATOS (Google Sheets)
 *
 * Todo el código lee y escribe por NOMBRE DE COLUMNA, nunca por posición: así agregar columnas al
 * final (ver config/Esquema.gs) no rompe nada.
 *
 * Velocidad: abrir la base y cada consulta a una hoja son lo más lento de Apps Script. Dentro de UNA
 * ejecución (cada llamada del navegador es una ejecución nueva) cada hoja se lee una sola vez y lo que
 * se escribe por aquí se aplica también a lo recordado: después de una acción, la pantalla se arma sin
 * volver a leer. Las hojas de TABLAS_ESTABLES (usuarios, catálogos, Config) se recuerdan además ENTRE
 * llamadas, en la caché del script (TABLA_CACHE_SEGUNDOS), y se traen todas en una sola consulta.
 *
 * Candado (conCandado_): una persona a la vez. Bajo el candado, la primera lectura de cada hoja de
 * operación va a la hoja, para no decidir con algo que otra persona cambió mientras tanto (consecutivos,
 * quién tomó una solicitud, qué propuestas reemplazar). Agregar renglones va bajo el candado, para que
 * dos personas nunca escriban el mismo renglón. Al soltarlo se confirman las escrituras pendientes.
 *
 * Quien escriba la hoja por otro camino (SetupInicial) llama a olvidarTablas_(), y una edición a mano en
 * la hoja la olvida con el disparador onEdit (Disparadores.gs). Antes de ESCRIBIR una hoja estable por
 * número de renglón, se lee fresca (leerTablaFresca_).
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
  if (!memoriaBD_.datos) {
    memoriaBD_.datos = { bd: null, hojas: {}, encabezados: {}, tablas: {}, cacheLeida: false,
      candado: 0, frescas: {}, pendiente: false };
  }
  return memoriaBD_.datos;
}

/** Olvida todo lo recordado (después de cambiar hojas o encabezados por fuera de estas funciones). */
function olvidarTablas_() {
  const m = memoriaBD_();
  m.bd = null;
  m.hojas = {};
  m.encabezados = {};
  m.tablas = {};
  m.cacheLeida = false;
  m.frescas = {};
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

/** Los valores guardados en la caché (texto), o null si no sirven. */
function valoresDeCache_(texto) {
  try {
    if (!texto) return null;
    return JSON.parse(texto).map(function (r) {
      return r.map(function (v) { return v && typeof v === 'object' && v.$f !== undefined ? new Date(v.$f) : v; });
    });
  } catch (e) { return null; }
}

/** Trae de la caché, en UNA consulta, todas las hojas estables que aún no se han leído en la ejecución. */
function precargarEstables_(m) {
  m.cacheLeida = true;
  const faltan = TABLAS_ESTABLES.filter(function (n) { return !m.tablas[n]; });
  if (!faltan.length) return;
  let guardadas = {};
  try { guardadas = CacheService.getScriptCache().getAll(faltan.map(claveCacheTabla_)) || {}; } catch (e) { return; }
  faltan.forEach(function (n) {
    const valores = valoresDeCache_(guardadas[claveCacheTabla_(n)]);
    if (valores) recordarValores_(m, n, valores);
  });
}

/** Convierte los valores de una hoja (encabezados y datos) en renglones y los recuerda en la ejecución. */
function recordarValores_(m, nombre, valores) {
  const encabezados = (valores[0] || []).map(function (v) { return String(v).trim(); });
  m.encabezados[nombre] = encabezados;
  m.tablas[nombre] = valores.slice(1).map(function (fila, i) {
    const obj = { _fila: i + 2 };
    encabezados.forEach(function (col, j) { obj[col] = fila[j]; });
    return obj;
  });
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
  // Bajo el candado, la primera lectura de una hoja de operación va a la hoja.
  if (!estable && m.candado && !m.frescas[nombre]) {
    m.frescas[nombre] = true;
    delete m.tablas[nombre];
  }
  if (!m.tablas[nombre] && estable && !m.cacheLeida) precargarEstables_(m);
  if (!m.tablas[nombre]) {
    // Una sola consulta: encabezados y datos juntos.
    const inicio = Date.now();
    const valores = obtenerHoja_(nombre).getDataRange().getValues();
    registrarTiempoBD_('leer ' + nombre + ' (' + Math.max(valores.length - 1, 0) + ' renglones)', inicio);
    if (estable) guardarTablaEnCache_(nombre, valores);
    recordarValores_(m, nombre, valores);
  }
  // Copias: quien modifique un renglón no cambia lo recordado.
  return m.tablas[nombre].map(function (o) { return Object.assign({}, o); });
}

/** Olvida lo recordado de una hoja (y, si es estable, su caché entre llamadas). */
function olvidarTabla_(nombre) {
  delete memoriaBD_().tablas[nombre];
  olvidarCacheTabla_(nombre);
}

/** Después de escribir una hoja estable: la caché entre llamadas ya no sirve. */
function olvidarCacheTabla_(nombre) {
  if (TABLAS_ESTABLES.indexOf(nombre) === -1) return;
  try { CacheService.getScriptCache().remove(claveCacheTabla_(nombre)); } catch (e) { /* sin caché */ }
}

/** La hoja leída de la base (no de lo recordado): para escribir después por número de renglón. */
function leerTablaFresca_(nombre) {
  const m = memoriaBD_();
  // Las demás hojas estables siguen viniendo de la caché (en una sola consulta); esta, de la hoja.
  if (!m.cacheLeida && TABLAS_ESTABLES.indexOf(nombre) !== -1) precargarEstables_(m);
  olvidarTabla_(nombre);
  return leerTabla_(nombre);
}

/**
 * Corre `fn` con el candado del script (una persona a la vez). Si ya se tiene (una función con candado
 * llama a otra que también lo pide, como reservarIds_), solo corre `fn`: lo suelta quien lo tomó. Al
 * soltarlo se confirman las escrituras, para que quien siga las vea.
 */
function conCandado_(esperaMs, fn) {
  const m = memoriaBD_();
  if (m.candado) {
    m.candado++;
    try { return fn(); } finally { m.candado--; }
  }
  const candado = LockService.getScriptLock();
  const inicio = Date.now();
  candado.waitLock(esperaMs);
  registrarTiempoBD_('esperar el candado', inicio);
  m.candado = 1;
  m.frescas = {};
  try {
    return fn();
  } finally {
    m.candado = 0;
    try { confirmarEscrituras_(); } finally { candado.releaseLock(); }
  }
}

/** Manda a la hoja lo que Apps Script tiene pendiente de escribir (si hay algo). */
function confirmarEscrituras_() {
  const m = memoriaBD_();
  if (!m.pendiente) return;
  const inicio = Date.now();
  SpreadsheetApp.flush();
  m.pendiente = false;
  registrarTiempoBD_('confirmar escrituras', inicio);
}

/**
 * Agrega un renglón a partir de un objeto { COLUMNA: valor }. Las columnas que no vengan quedan vacías.
 * appendRow ya es seguro con varias personas a la vez; lo recordado de la hoja se olvida.
 */
function agregarFila_(nombre, objeto) {
  const inicio = Date.now();
  const hoja = obtenerHoja_(nombre);
  const fila = encabezadosDe_(nombre).map(function (col) { return objeto[col] === undefined ? '' : objeto[col]; });
  hoja.appendRow(fila);
  memoriaBD_().pendiente = true;
  olvidarTabla_(nombre);
  registrarTiempoBD_('agregar a ' + nombre, inicio);
  return hoja.getLastRow();
}

/**
 * Agrega varios renglones en una sola escritura (mucho más rápido que agregarFila_ en un ciclo), bajo el
 * candado, y quedan recordados con su número de renglón. Si la hoja ya no tiene renglones libres, le
 * agrega los que falten. Devuelve el número del primer renglón.
 */
function agregarFilas_(nombre, objetos) {
  if (!objetos.length) return 0;
  const hoja = obtenerHoja_(nombre);
  const encabezados = encabezadosDe_(nombre);
  const completos = objetos.map(function (o) {
    const c = {};
    encabezados.forEach(function (col) { c[col] = o[col] === undefined ? '' : o[col]; });
    return c;
  });
  const filas = completos.map(function (c) { return encabezados.map(function (col) { return c[col]; }); });
  return conCandado_(30000, function () {
    const inicio = Date.now();
    const primera = hoja.getLastRow() + 1;
    const faltan = primera + filas.length - 1 - hoja.getMaxRows();
    if (faltan > 0) hoja.insertRowsAfter(hoja.getMaxRows(), faltan);
    hoja.getRange(primera, 1, filas.length, encabezados.length).setValues(filas);
    memoriaBD_().pendiente = true;
    const recordadas = memoriaBD_().tablas[nombre];
    if (recordadas) {
      completos.forEach(function (c, i) { recordadas.push(Object.assign({ _fila: primera + i }, c)); });
    }
    olvidarCacheTabla_(nombre);
    registrarTiempoBD_('agregar ' + filas.length + ' a ' + nombre, inicio);
    return primera;
  });
}

/**
 * Actualiza solo las columnas indicadas de un renglón existente. Las columnas vecinas se escriben
 * juntas (una consulta por grupo); las demás celdas del renglón no se tocan. El cambio se aplica también
 * a lo recordado de la hoja.
 */
function actualizarFila_(nombre, numeroFila, cambios) {
  const inicio = Date.now();
  const hoja = obtenerHoja_(nombre);
  gruposDeColumnas_(encabezadosDe_(nombre), cambios, nombre).forEach(function (g) {
    hoja.getRange(numeroFila, g.columna, 1, g.valores.length).setValues([g.valores]);
  });
  const m = memoriaBD_();
  m.pendiente = true;
  const recordadas = m.tablas[nombre];
  const fila = recordadas && recordadas.filter(function (f) { return f._fila === numeroFila; })[0];
  if (fila) Object.assign(fila, cambios);
  else delete m.tablas[nombre];
  olvidarCacheTabla_(nombre);
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
