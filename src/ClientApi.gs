/**
 * PUERTA DEL NAVEGADOR AL SERVIDOR
 *
 * Las únicas funciones que la app llama con google.script.run (todas empiezan con "api"). Cada una
 * es delgada: pide la sesión, revisa permisos y llama al servicio que hace el trabajo. Todas reciben
 * `comoUsuario` (vacío = la persona real) y piden la sesión con sesionEfectiva_, que solo deja
 * «ver como» a un administrador en PRUEBAS.
 */

/** Cambia de usuario con «ver como» (o regresa al real con comoUsuario vacío). */
function apiSesion(comoUsuario) {
  const sesion = sesionEfectiva_(comoUsuario || '');
  if (sesion.verComo) {
    agregarFila_('Bitacora', { FECHA: new Date(), USUARIO: sesion.verComo.correoReal, ACCION: 'VER_COMO',
      DETALLE: 'Usa la app como ' + sesion.correo + ' (' + sesion.perfiles.join(', ') + ')' });
  }
  return { sesion: sesion, modulos: sesion.registrado ? modulosDe_(sesion.perfiles) : [] };
}

/** Pantalla «Catálogos»: departamentos → áreas → subáreas. */
function apiCatalogoAreas(comoUsuario) {
  requierePerfil_(sesionEfectiva_(comoUsuario), ['ADMINISTRADOR']);
  return arbolCatalogo_(leerTabla_('Departamentos'), leerTabla_('Areas'), leerTabla_('Subareas'));
}
