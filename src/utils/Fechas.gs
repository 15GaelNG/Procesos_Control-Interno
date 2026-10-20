/**
 * FECHAS para mostrar en pantalla. El navegador no recibe objetos Date por google.script.run, así
 * que el servidor las manda ya como texto, en la zona horaria del sistema.
 */
function formatoFecha_(fecha) {
  return Utilities.formatDate(fecha, ZONA_HORARIA, 'dd/MM/yyyy HH:mm');
}
