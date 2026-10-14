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

/**
 * Lo que la app necesita al abrir: ambiente, sesión, las pantallas que le tocan y catálogos fijos
 * para pintar estados y perfiles. En PRUEBAS, a un administrador también le llega la lista de
 * usuarios para «ver como».
 */
function datosIniciales_() {
  const ambiente = ambienteActual_();
  const datos = {
    app: APP_NOMBRE_LARGO,
    ambiente: ambiente,
    urlApp: ScriptApp.getService().getUrl(),
    sesion: sesionVacia_(''),
    modulos: [],
    verComo: [],
    error: '',
    nombresPerfil: NOMBRES_PERFIL,
    nombresEstado: NOMBRES_ESTADO
  };
  try {
    const correo = String(Session.getActiveUser().getEmail() || '').trim().toLowerCase();
    const usuarios = leerTabla_('Usuarios');
    const perfiles = leerTabla_('UsuarioPerfiles');
    datos.sesion = correo ? buscarSesion_(correo, usuarios, perfiles) : sesionVacia_('');
    datos.modulos = datos.sesion.registrado ? modulosDe_(datos.sesion.perfiles) : [];
    if (puedeVerComo_(ambiente, datos.sesion)) datos.verComo = usuariosParaVerComo_(usuarios, perfiles);
  } catch (e) {
    datos.error = 'No se pudo leer la base de datos: ' + e.message;
  }
  return datos;
}

/** Inserta el contenido de un archivo HTML (estilos, scripts, vistas) dentro de otro. */
function include(nombre) {
  return HtmlService.createHtmlOutputFromFile(PREFIJO_ARCHIVOS_HTML + nombre).getContent();
}
