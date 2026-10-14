/**
 * SESIÓN Y PERMISOS: quién está usando la app y qué puede ver.
 *
 * La web app solo la abren cuentas del dominio (appsscript.json → access DOMAIN), así que Google ya
 * dice quién es: no hay usuario ni contraseña. Aquí se busca ese correo en Usuarios con sus perfiles
 * activos, y de los perfiles salen las pantallas (MODULOS_APP).
 *
 * «Ver como» (solo en PRUEBAS): un ADMINISTRADOR puede usar la app como otro usuario para probar
 * cada perfil sin tener una cuenta de Google por persona. Cada función del servidor que reciba
 * `comoUsuario` debe pedir la sesión con sesionEfectiva_(comoUsuario), que vuelve a comprobar el
 * ambiente y que quien está detrás de verdad sea administrador. En PRODUCCIÓN no existe.
 */

/** La persona que abrió la app (su cuenta real de Google). */
function sesionActual_() {
  const correo = String(Session.getActiveUser().getEmail() || '').trim().toLowerCase();
  if (!correo) return sesionVacia_('');
  return buscarSesion_(correo, leerTabla_('Usuarios'), leerTabla_('UsuarioPerfiles'));
}

/**
 * La sesión con la que se trabaja: la real o, en PRUEBAS y para un administrador, la del usuario
 * `comoUsuario` (ID_USUARIO). Lanza error si alguien intenta «ver como» sin permiso.
 */
function sesionEfectiva_(comoUsuario) {
  const real = sesionActual_();
  if (!comoUsuario || comoUsuario === real.idUsuario) return real;
  return elegirSesion_(ambienteActual_(), real, comoUsuario, leerTabla_('Usuarios'), leerTabla_('UsuarioPerfiles'));
}

function ambienteActual_() {
  return PropertiesService.getScriptProperties().getProperty(PROP.AMBIENTE) || 'SIN INSTALAR';
}

/** ¿Puede esta sesión real usar «ver como» en este ambiente? */
function puedeVerComo_(ambiente, real) {
  return ambiente === 'PRUEBAS' && real.registrado && real.perfiles.indexOf('ADMINISTRADOR') !== -1;
}

/** Parte de sesionEfectiva_ que no usa Google (para probarla en node). */
function elegirSesion_(ambiente, real, comoUsuario, usuarios, perfiles) {
  if (!puedeVerComo_(ambiente, real)) {
    throw new Error('Solo un administrador, en el ambiente de pruebas, puede usar el sistema como otro usuario.');
  }
  const usuario = usuarios.filter(function (u) { return u.ID_USUARIO === comoUsuario; })[0];
  const sesion = usuario ? buscarSesion_(usuario.CORREO, usuarios, perfiles) : sesionVacia_('');
  if (!sesion.registrado) throw new Error('El usuario ' + comoUsuario + ' no existe o está dado de baja.');
  sesion.verComo = { correoReal: real.correo, nombreReal: real.nombre };
  return sesion;
}

/** Arma la sesión de `correo` a partir de las filas de Usuarios y UsuarioPerfiles (sin tocar Google). */
function buscarSesion_(correo, usuarios, perfiles) {
  correo = String(correo || '').trim().toLowerCase();
  const usuario = usuarios.filter(function (u) {
    return String(u.CORREO).trim().toLowerCase() === correo && String(u.ACTIVO).trim().toUpperCase() === 'SI';
  })[0];
  if (!usuario) return sesionVacia_(correo);
  return { registrado: true, correo: correo, idUsuario: usuario.ID_USUARIO,
    nombre: String(usuario.NOMBRE || correo), perfiles: perfilesDe_(usuario.ID_USUARIO, perfiles) };
}

function sesionVacia_(correo) {
  return { registrado: false, correo: correo, perfiles: [] };
}

/** Perfiles activos y vigentes de un usuario, sin repetir y en el orden de PERFILES. */
function perfilesDe_(idUsuario, perfiles) {
  const activos = perfiles.filter(function (p) {
    return p.ID_USUARIO === idUsuario && String(p.ACTIVO).trim().toUpperCase() === 'SI';
  }).map(function (p) { return String(p.PERFIL).trim().toUpperCase(); });
  return Object.keys(PERFILES).filter(function (p) { return activos.indexOf(p) !== -1; });
}

/** Las pantallas que ve quien tiene estos perfiles (las de `perfiles` vacío, todos). */
function modulosDe_(perfiles) {
  return MODULOS_APP.filter(function (m) {
    return !m.perfiles.length || m.perfiles.some(function (p) { return perfiles.indexOf(p) !== -1; });
  });
}

/** Detiene la operación si la sesión no tiene ninguno de los perfiles indicados. */
function requierePerfil_(sesion, perfilesPermitidos) {
  if (!sesion || !sesion.registrado) throw new Error('Tu cuenta no está dada de alta en el sistema.');
  const tiene = perfilesPermitidos.some(function (p) { return sesion.perfiles.indexOf(p) !== -1; });
  if (!tiene) throw new Error('Tu perfil no permite hacer esto.');
  return sesion;
}

/** Usuarios activos con sus perfiles, para el selector «ver como». */
function usuariosParaVerComo_(usuarios, perfiles) {
  return usuarios.filter(function (u) { return String(u.ACTIVO).trim().toUpperCase() === 'SI'; })
    .map(function (u) {
      return { idUsuario: u.ID_USUARIO, nombre: String(u.NOMBRE || u.CORREO), correo: String(u.CORREO).trim().toLowerCase(),
        perfiles: perfilesDe_(u.ID_USUARIO, perfiles) };
    })
    .sort(function (a, b) { return a.nombre.localeCompare(b.nombre, 'es'); });
}
