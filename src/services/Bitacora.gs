/**
 * BITÁCORA: quién hizo qué y cuándo (requerimiento §4.3).
 *
 * Toda acción relevante se registra con registrarBitacora_. El usuario que queda es siempre la
 * persona REAL: si un administrador usa «Ver como» en pruebas, se anota su correo y en el detalle
 * como quién estaba viendo.
 */

function registrarBitacora_(sesion, accion, detalle, idSolicitud, estadoAnterior, estadoNuevo) {
  agregarFila_('Bitacora', filaBitacora_(sesion, accion, detalle, idSolicitud, estadoAnterior, estadoNuevo, new Date()));
}

/** El renglón de la Bitacora, sin tocar Google (para probarlo en node). */
function filaBitacora_(sesion, accion, detalle, idSolicitud, estadoAnterior, estadoNuevo, fecha) {
  return {
    FECHA: fecha,
    USUARIO: correoReal_(sesion),
    ACCION: accion,
    ID_SOLICITUD: idSolicitud || '',
    ESTADO_ANTERIOR: estadoAnterior || '',
    ESTADO_NUEVO: estadoNuevo || '',
    DETALLE: (sesion.verComo ? '[viendo como ' + sesion.correo + '] ' : '') + (detalle || '')
  };
}

/**
 * Los renglones más recientes primero, listos para la pantalla (las fechas ya como texto: el
 * navegador no recibe objetos Date por google.script.run). `formatear(fecha)` → texto.
 */
function entradasBitacora_(filas, formatear, limite) {
  // toString en lugar de instanceof: funciona también con fechas de otro contexto (pruebas en node).
  const esFecha = function (v) { return Object.prototype.toString.call(v) === '[object Date]'; };
  const valor = function (f) { return esFecha(f.FECHA) ? f.FECHA.getTime() : (Date.parse(f.FECHA) || 0); };
  return filas.slice()
    .sort(function (a, b) { return valor(b) - valor(a) || b._fila - a._fila; })
    .slice(0, limite)
    .map(function (f) {
      return {
        fecha: esFecha(f.FECHA) ? formatear(f.FECHA) : String(f.FECHA || ''),
        usuario: String(f.USUARIO || ''),
        accion: String(f.ACCION || ''),
        nombreAccion: NOMBRES_ACCION[f.ACCION] || String(f.ACCION || ''),
        solicitud: String(f.ID_SOLICITUD || ''),
        estados: [f.ESTADO_ANTERIOR, f.ESTADO_NUEVO].filter(function (x) { return x; }).join(' → '),
        detalle: String(f.DETALLE || '')
      };
    });
}
