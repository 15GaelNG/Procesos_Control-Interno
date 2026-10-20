/**
 * PUERTA DEL NAVEGADOR AL SERVIDOR
 *
 * Las únicas funciones que la app llama con google.script.run (todas empiezan con "api"). Cada una
 * es delgada: pide la sesión, revisa permisos y llama al servicio que hace el trabajo. Todas reciben
 * `comoUsuario` (vacío = la persona real) y piden la sesión con sesionEfectiva_, que solo deja
 * «ver como» a un administrador en PRUEBAS.
 *
 * Consultar: ADMINISTRADOR y SOPORTE_CI. Cambiar: solo ADMINISTRADOR (Soporte CI nunca cambia nada).
 */

/** Cambia de usuario con «ver como» (o regresa al real con comoUsuario vacío). */
function apiSesion(comoUsuario) {
  const sesion = sesionEfectiva_(comoUsuario || '');
  if (sesion.verComo) {
    registrarBitacora_(sesion, 'VER_COMO', 'Perfiles: ' + (sesion.perfiles.join(', ') || 'ninguno'));
  }
  return { sesion: sesion, modulos: sesion.registrado ? modulosDe_(sesion.perfiles) : [] };
}

/** Pantalla «Catálogos»: departamentos → áreas → subáreas. */
function apiCatalogoAreas(comoUsuario) {
  requierePerfil_(sesionEfectiva_(comoUsuario), ['ADMINISTRADOR', 'SOPORTE_CI']);
  return arbolCatalogo_(leerTabla_('Departamentos'), leerTabla_('Areas'), leerTabla_('Subareas'));
}

/** Pantalla «Usuarios y perfiles»: la lista y los departamentos que se pueden asignar. */
function apiUsuarios(comoUsuario) {
  const sesion = requierePerfil_(sesionEfectiva_(comoUsuario), ['ADMINISTRADOR', 'SOPORTE_CI']);
  const departamentos = leerTabla_('Departamentos');
  return {
    usuarios: listaUsuarios_(leerTabla_('Usuarios'), leerTabla_('UsuarioPerfiles'), leerTabla_('UsuarioDepartamentos'), departamentos),
    departamentos: departamentos.filter(function (d) { return esActivo_(d.ACTIVO); })
      .map(function (d) { return { id: d.ID_DEPARTAMENTO, nombre: String(d.NOMBRE), clave: String(d.CLAVE_CODIGO) }; })
      .sort(function (a, b) { return a.nombre.localeCompare(b.nombre, 'es'); }),
    puedeEditar: sesion.perfiles.indexOf('ADMINISTRADOR') !== -1,
    yo: sesion.idUsuario,
    dominios: DOMINIOS_CORREO[ambienteActual_()] || DOMINIOS_CORREO.PRODUCCION
  };
}

/** Alta o cambio de un usuario (solo ADMINISTRADOR). Ver reglas en services/Usuarios.gs. */
function apiGuardarUsuario(comoUsuario, datos) {
  const sesion = requierePerfil_(sesionEfectiva_(comoUsuario), ['ADMINISTRADOR']);
  return guardarUsuario_(sesion, datos || {});
}

/** Pantalla «Bitácora»: los renglones más recientes. */
function apiBitacora(comoUsuario) {
  requierePerfil_(sesionEfectiva_(comoUsuario), ['ADMINISTRADOR', 'SOPORTE_CI']);
  return entradasBitacora_(leerTabla_('Bitacora'), function (fecha) {
    return Utilities.formatDate(fecha, ZONA_HORARIA, 'dd/MM/yyyy HH:mm');
  }, BITACORA_MAX_RENGLONES);
}
