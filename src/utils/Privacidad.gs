/**
 * PRIVACIDAD: lo que nunca sale hacia la IA (respuesta de Procesos sobre la IA, decisión 16).
 *
 * Antes de mandar un texto a la IA se cambian correos, CURP, RFC, cuentas o tarjetas, teléfonos y
 * montos (PATRONES_SENSIBLES, en config/Config.gs) por marcas numeradas: [CORREO 1], [MONTO 2]…
 * Lo que responde la IA se regresa con restaurarDatosSensibles_, así el colaborador ve sus datos y
 * Google nunca los recibió. Los nombres de personas no se pueden detectar con seguridad: la captura
 * pide escribir puestos, no nombres.
 */

/**
 * Oculta los datos sensibles de un texto. `mapa` ({ '[CORREO 1]': 'ana@…' }) se comparte entre todos
 * los textos de un mismo envío, para que el mismo dato tenga siempre la misma marca.
 */
function ocultarDatosSensibles_(texto, mapa) {
  let resultado = String(texto === null || texto === undefined ? '' : texto);
  PATRONES_SENSIBLES.forEach(function (p) {
    resultado = resultado.replace(p.patron, function (encontrado) {
      const existente = Object.keys(mapa).filter(function (k) { return mapa[k] === encontrado; })[0];
      if (existente) return existente;
      const n = Object.keys(mapa).filter(function (k) { return k.indexOf('[' + p.marca + ' ') === 0; }).length + 1;
      const marca = '[' + p.marca + ' ' + n + ']';
      mapa[marca] = encontrado;
      return marca;
    });
  });
  return resultado;
}

/** Regresa los datos originales en lugar de las marcas. Funciona con textos, arreglos y objetos. */
function restaurarDatosSensibles_(valor, mapa) {
  if (typeof valor === 'string') {
    return valor.replace(/\[(?:CORREO|CURP|RFC|CUENTA|TELÉFONO|MONTO) \d+\]/g, function (m) { return mapa[m] !== undefined ? mapa[m] : m; });
  }
  if (Array.isArray(valor)) return valor.map(function (v) { return restaurarDatosSensibles_(v, mapa); });
  if (valor && typeof valor === 'object') {
    const copia = {};
    Object.keys(valor).forEach(function (k) { copia[k] = restaurarDatosSensibles_(valor[k], mapa); });
    return copia;
  }
  return valor;
}
