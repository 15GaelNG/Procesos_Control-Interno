/**
 * FECHAS para mostrar en pantalla. El navegador no recibe objetos Date por google.script.run, así
 * que el servidor las manda ya como texto, en la zona horaria del sistema.
 */
function formatoFecha_(fecha) {
  return Utilities.formatDate(fecha, ZONA_HORARIA, 'dd/MM/yyyy HH:mm');
}

/** Solo el día: «20/10/2026». */
function formatoDia_(fecha) {
  return Utilities.formatDate(fecha, ZONA_HORARIA, 'dd/MM/yyyy');
}

/** Como lo usa un <input type="date">: «2026-10-20». */
function formatoIso_(fecha) {
  return Utilities.formatDate(fecha, ZONA_HORARIA, 'yyyy-MM-dd');
}

/** Los tres formatos juntos, para las funciones puras que arman pantallas. */
function formatosFecha_() {
  return { fechaHora: formatoFecha_, dia: formatoDia_, iso: formatoIso_ };
}

/**
 * «2026-10-20» (lo que manda un <input type="date">) → la fecha a las 00:00 de ese día; null si no es
 * una fecha válida (también «2026-02-30»).
 */
function fechaDeTexto_(texto) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(texto || '').trim());
  if (!m) return null;
  const f = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  return f.getMonth() === Number(m[2]) - 1 && f.getDate() === Number(m[3]) ? f : null;
}

/** El día de una fecha como número comparable (20261020), sin la hora. */
function numeroDeDia_(fecha) {
  return fecha.getFullYear() * 10000 + (fecha.getMonth() + 1) * 100 + fecha.getDate();
}
