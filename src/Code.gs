/**
 * SISTEMA DE DOCUMENTACIÓN DE PROCESOS — entrada de la web app.
 *
 * El servidor está repartido en src/config, src/utils y (más adelante) src/services. Todos los
 * archivos .gs comparten el mismo ámbito global: una función de un archivo se llama desde cualquier
 * otro sin importar nada. Las funciones que el navegador NO debe poder llamar terminan en "_".
 */

function doGet() {
  // Fase 1 sustituye esto por la app (Index.html). Por ahora solo confirma el ambiente.
  const ambiente = PropertiesService.getScriptProperties().getProperty(PROP.AMBIENTE) || 'SIN INSTALAR';
  const titulo = APP_NOMBRE + (ambiente === AMBIENTES.PRODUCCION.clave ? '' : ' · ' + ambiente);
  return HtmlService.createHtmlOutput(
      '<div style="font-family:sans-serif;padding:32px;color:' + COLOR_AZUL + '">' +
      '<h2 style="margin:0 0 8px">' + APP_NOMBRE_LARGO + '</h2>' +
      '<p style="margin:0;color:' + COLOR_DORADO + '">Ambiente: ' + ambiente + ' · en construcción</p></div>')
    .setTitle(titulo)
    .addMetaTag('viewport', 'width=device-width, initial-scale=1');
}

/** Inserta el contenido de un archivo HTML (estilos, scripts, vistas) dentro de otro. */
function include(nombre) {
  return HtmlService.createHtmlOutputFromFile(PREFIJO_ARCHIVOS_HTML + nombre).getContent();
}
