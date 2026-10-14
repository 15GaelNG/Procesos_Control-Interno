/**
 * SESIÓN: quién está usando la app.
 *
 * La web app solo la abren cuentas del dominio (appsscript.json → access DOMAIN), así que Google ya
 * dice quién es: no hay usuario ni contraseña. Aquí solo se busca ese correo en Usuarios y sus
 * perfiles activos. Los permisos por perfil llegan con el punto 2 de la fase 1.
 */

/** La persona que abrió la app: { registrado, correo, idUsuario, nombre, perfiles[] }. */
function sesionActual_() {
  const correo = String(Session.getActiveUser().getEmail() || '').trim().toLowerCase();
  if (!correo) return { registrado: false, correo: '', perfiles: [] };
  return buscarSesion_(correo, leerTabla_('Usuarios'), leerTabla_('UsuarioPerfiles'));
}

/** Arma la sesión de `correo` a partir de las filas de Usuarios y UsuarioPerfiles (sin tocar Google). */
function buscarSesion_(correo, usuarios, perfiles) {
  correo = String(correo || '').trim().toLowerCase();
  const usuario = usuarios.filter(function (u) {
    return String(u.CORREO).trim().toLowerCase() === correo && String(u.ACTIVO).trim().toUpperCase() === 'SI';
  })[0];
  if (!usuario) return { registrado: false, correo: correo, perfiles: [] };
  const suyos = [];
  perfiles.forEach(function (p) {
    const perfil = String(p.PERFIL).trim().toUpperCase();
    if (p.ID_USUARIO === usuario.ID_USUARIO && String(p.ACTIVO).trim().toUpperCase() === 'SI' &&
        PERFILES[perfil] && suyos.indexOf(perfil) === -1) {
      suyos.push(perfil);
    }
  });
  return { registrado: true, correo: correo, idUsuario: usuario.ID_USUARIO,
    nombre: String(usuario.NOMBRE || correo), perfiles: suyos };
}
