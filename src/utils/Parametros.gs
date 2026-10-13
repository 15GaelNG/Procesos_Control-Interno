/**
 * PARÁMETROS DE LA HOJA Config
 *
 * Valores que Procesos o el administrador ajustan sin tocar código (ver docs/base-de-datos.md#config).
 */

/** Todos los parámetros como { CLAVE: 'valor' } (siempre texto). */
function leerConfig_() {
  const config = {};
  leerTabla_('Config').forEach(function (fila) {
    if (fila.CLAVE) config[String(fila.CLAVE).trim()] = String(fila.VALOR).trim();
  });
  return config;
}

/** Un parámetro; si no existe o está vacío, `porDefecto`. */
function obtenerConfig_(clave, porDefecto) {
  const valor = leerConfig_()[clave];
  return valor === undefined || valor === '' ? porDefecto : valor;
}
