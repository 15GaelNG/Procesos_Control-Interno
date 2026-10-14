/**
 * SISTEMA DE DOCUMENTACIÓN DE PROCESOS — entrada de la web app.
 *
 * El servidor está repartido en src/config, src/utils, src/services, src/ia y src/documentos. Todos
 * los archivos .gs comparten el mismo ámbito global: una función de un archivo se llama desde
 * cualquier otro sin importar nada. Las funciones que el navegador NO debe poder llamar terminan en "_".
 *
 * La app es de una sola página: doGet entrega el armazón (html/Index) con la sesión ya incluida, y
 * el navegador cambia de pantalla sin volver a pedir la página.
 */

function doGet() {
  const plantilla = HtmlService.createTemplateFromFile(PREFIJO_ARCHIVOS_HTML + 'Index');
  const datos = datosIniciales_();
  // "<" escapado para que ningún texto de la base pueda cerrar el <script> donde se inserta.
  plantilla.datosIniciales = JSON.stringify(datos).replace(/</g, '\\u003c');
  return plantilla.evaluate()
    .setTitle(APP_NOMBRE + (datos.ambiente === AMBIENTES.PRODUCCION.clave ? '' : ' · ' + datos.ambiente))
    .addMetaTag('viewport', 'width=device-width, initial-scale=1');
}

/** Lo que la app necesita al abrir: ambiente, sesión y catálogos fijos para pintar estados y perfiles. */
function datosIniciales_() {
  const ambiente = PropertiesService.getScriptProperties().getProperty(PROP.AMBIENTE) || 'SIN INSTALAR';
  let sesion;
  let error = '';
  try {
    sesion = sesionActual_();
  } catch (e) {
    sesion = { registrado: false, correo: '', perfiles: [] };
    error = 'No se pudo leer la base de datos: ' + e.message;
  }
  return {
    app: APP_NOMBRE_LARGO,
    ambiente: ambiente,
    urlApp: ScriptApp.getService().getUrl(),
    sesion: sesion,
    error: error,
    nombresPerfil: NOMBRES_PERFIL,
    nombresEstado: NOMBRES_ESTADO
  };
}

/** Inserta el contenido de un archivo HTML (estilos, scripts, vistas) dentro de otro. */
function include(nombre) {
  return HtmlService.createHtmlOutputFromFile(PREFIJO_ARCHIVOS_HTML + nombre).getContent();
}
