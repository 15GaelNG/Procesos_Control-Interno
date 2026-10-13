/**
 * IDENTIFICADORES Y CONSECUTIVOS
 *
 * Cada serie (USR, SOL-2026, ACT…) guarda su último número en la hoja Consecutivos. Se lee y se
 * escribe dentro de un bloqueo para que dos personas al mismo tiempo nunca reciban el mismo
 * número. Los números nunca se reutilizan, aunque el registro se desactive.
 */

/** Siguiente ID de una serie: siguienteId_('USR', 4) → "USR-0001". */
function siguienteId_(serie, ancho) {
  const candado = LockService.getScriptLock();
  candado.waitLock(30000);
  try {
    const hoja = obtenerHoja_('Consecutivos');
    const fila = leerTabla_('Consecutivos').filter(function (r) { return r.SERIE === serie; })[0];
    const siguiente = fila ? Number(fila.ULTIMO) + 1 : 1;
    if (fila) {
      actualizarFila_('Consecutivos', fila._fila, { ULTIMO: String(siguiente), FECHA_ACTUALIZACION: new Date() });
    } else {
      agregarFila_('Consecutivos', { SERIE: serie, ULTIMO: String(siguiente), FECHA_ACTUALIZACION: new Date() });
    }
    SpreadsheetApp.flush();
    return serie + '-' + String(siguiente).padStart(ancho || 4, '0');
  } finally {
    candado.releaseLock();
  }
}
