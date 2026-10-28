/**
 * IDENTIFICADORES Y CONSECUTIVOS
 *
 * Cada serie (USR, SOL-2026, ACT…) guarda su último número en la hoja Consecutivos. Se lee y se
 * escribe dentro de un bloqueo para que dos personas al mismo tiempo nunca reciban el mismo
 * número. Los números nunca se reutilizan, aunque el registro se desactive.
 */

/** Siguiente ID de una serie: siguienteId_('USR', 4) → "USR-0001". */
function siguienteId_(serie, ancho) {
  return reservarIds_(serie, 1, ancho)[0];
}

/**
 * Reserva `cantidad` IDs seguidos de una serie en una sola escritura (para cargas grandes):
 * reservarIds_('ARE', 3, 4) → ["ARE-0001", "ARE-0002", "ARE-0003"].
 */
function reservarIds_(serie, cantidad, ancho) {
  if (!cantidad) return [];
  return conCandado_(30000, function () {
    const fila = leerTabla_('Consecutivos').filter(function (r) { return r.SERIE === serie; })[0];
    const primero = fila ? Number(fila.ULTIMO) + 1 : 1;
    const ultimo = primero + cantidad - 1;
    if (fila) {
      actualizarFila_('Consecutivos', fila._fila, { ULTIMO: String(ultimo), FECHA_ACTUALIZACION: new Date() });
    } else {
      agregarFila_('Consecutivos', { SERIE: serie, ULTIMO: String(ultimo), FECHA_ACTUALIZACION: new Date() });
    }
    const ids = [];
    for (let n = primero; n <= ultimo; n++) ids.push(serie + '-' + String(n).padStart(ancho || 4, '0'));
    return ids;
  });
}
