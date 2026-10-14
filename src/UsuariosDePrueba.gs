/**
 * USUARIOS DE PRUEBA — se corre a mano desde el editor, SOLO en BD Procesos - PRUEBAS.
 *
 *   crearUsuariosDePrueba()  → da de alta los usuarios de USUARIOS_DE_PRUEBA (config/Config.gs) con
 *                              sus perfiles. Con «Ver como» (arriba en la app) un administrador usa
 *                              el sistema como cada uno de ellos.
 *
 * Es seguro correrla varias veces: solo agrega el usuario o el perfil que falte. Nadie puede entrar
 * con esos correos (el dominio .test no existe); solo sirven para «Ver como».
 */
function crearUsuariosDePrueba() {
  soloEditor_();
  if (ambienteActual_() !== AMBIENTES.PRUEBAS.clave) {
    throw new Error('Los usuarios de prueba solo se crean en el ambiente de PRUEBAS.');
  }
  const quien = Session.getEffectiveUser().getEmail();
  const ahora = new Date();
  const lineas = [];
  USUARIOS_DE_PRUEBA.forEach(function (u) {
    const usuarios = leerTabla_('Usuarios');
    let usuario = usuarios.filter(function (f) { return String(f.CORREO).trim().toLowerCase() === u.correo; })[0];
    let accion = 'ya existía';
    if (!usuario) {
      usuario = { ID_USUARIO: siguienteId_('USR', 4), CORREO: u.correo, NOMBRE: u.nombre, ID_PUESTO: '',
        ACTIVO: 'SI', FECHA_ALTA: ahora, ACTUALIZADO_POR: quien, FECHA_ACTUALIZACION: ahora };
      agregarFila_('Usuarios', usuario);
      accion = 'creado';
    }
    const actuales = perfilesDe_(usuario.ID_USUARIO, leerTabla_('UsuarioPerfiles'));
    u.perfiles.filter(function (p) { return actuales.indexOf(p) === -1; }).forEach(function (p) {
      agregarFila_('UsuarioPerfiles', { ID_USUARIO_PERFIL: siguienteId_('UPE', 4), ID_USUARIO: usuario.ID_USUARIO,
        PERFIL: p, ID_DEPARTAMENTO: '', ACTIVO: 'SI', FECHA_ALTA: ahora });
    });
    lineas.push(usuario.ID_USUARIO + ' · ' + u.nombre + ' · ' + u.perfiles.map(function (p) { return NOMBRES_PERFIL[p]; }).join(' + ') +
      ' (' + accion + ')');
  });
  Logger.log('Usuarios de prueba:\n' + lineas.join('\n') +
    '\n\nAbre la app y usa «Ver como» (arriba a la derecha) para entrar como cada uno.');
  return lineas;
}
