/**
 * REGISTRO PROPIO (Gael, 03/11/2026; decisión 45). No es un inicio de sesión: no hay usuario ni contraseña,
 * Google ya dice quién es (la web app solo la abren cuentas de la empresa). Es la primera vez que alguien entra:
 *
 *   ALTA      → su correo no está en Usuarios: escribe su nombre, su puesto y su departamento y queda como
 *               COLABORADOR (otros perfiles los da el administrador). Config → REGISTRO_ABIERTO = NO lo apaga.
 *   COMPLETAR → ya está dado de alta pero le falta el puesto o, si es colaborador, el departamento.
 *
 * Quien está dado de baja no se puede volver a registrar: lo reactiva el administrador. Con «Ver como» no se
 * registra a nadie. Lo puro está probado en tests/registro.test.js.
 */

/**
 * Qué le falta a la persona de `correo` (sin tocar Google), o null si nada.
 * actuales: { usuarios, perfiles, usuarioDeptos, puestos } (filas de leerTabla_).
 * Devuelve { modo: 'ALTA' | 'COMPLETAR', idUsuario, nombre, puesto, faltaPuesto, faltaDepartamento }.
 */
function registroPendiente_(correo, actuales, ambiente, abierto) {
  correo = String(correo || '').trim().toLowerCase();
  if (!correo) return null;
  const mios = actuales.usuarios.filter(function (u) { return String(u.CORREO).trim().toLowerCase() === correo; });
  const usuario = mios.filter(function (u) { return esActivo_(u.ACTIVO); })[0];
  if (!usuario) {
    const dominios = DOMINIOS_CORREO[ambiente] || DOMINIOS_CORREO.PRODUCCION;
    if (mios.length || !abierto || dominios.indexOf(correo.split('@')[1]) === -1) return null;
    return { modo: 'ALTA', idUsuario: '', nombre: '', puesto: '', faltaPuesto: true, faltaDepartamento: true };
  }
  const puesto = actuales.puestos.filter(function (p) { return p.ID_PUESTO && p.ID_PUESTO === usuario.ID_PUESTO; })[0];
  const esColaborador = perfilesDe_(usuario.ID_USUARIO, actuales.perfiles).indexOf('COLABORADOR') !== -1;
  const faltaDepartamento = esColaborador && !departamentosDe_(usuario.ID_USUARIO, actuales.usuarioDeptos).length;
  if (puesto && !faltaDepartamento) return null;
  return { modo: 'COMPLETAR', idUsuario: usuario.ID_USUARIO, nombre: String(usuario.NOMBRE || ''), puesto: puesto ? String(puesto.NOMBRE) : '',
    faltaPuesto: !puesto, faltaDepartamento: faltaDepartamento };
}

/**
 * Valida lo que escribió (sin tocar Google). datos: { nombre, puesto, idDepartamento }.
 * Devuelve { errores, nombre, idDepartamento, puesto (el plan de planMiPuesto_) }.
 */
function planRegistro_(datos, pendiente, actuales) {
  const d = datos || {};
  const plan = { errores: [], nombre: '', idDepartamento: '', puesto: null };
  if (pendiente.modo === 'ALTA') {
    plan.nombre = String(d.nombre || '').replace(/\s+/g, ' ').trim();
    if (plan.nombre.length < 3) plan.errores.push('Escribe tu nombre completo.');
    if (plan.nombre.length > 120) plan.errores.push('El nombre es demasiado largo.');
  }
  if (pendiente.faltaPuesto) {
    const usuario = actuales.usuarios.filter(function (u) { return u.ID_USUARIO === pendiente.idUsuario; })[0] || {};
    plan.puesto = planMiPuesto_(d.puesto, usuario, actuales.puestos);
    plan.errores = plan.errores.concat(plan.puesto.errores);
  }
  if (pendiente.faltaDepartamento) {
    const depto = actuales.departamentos.filter(function (x) { return x.ID_DEPARTAMENTO === String(d.idDepartamento || ''); })[0];
    if (!depto || !esActivo_(depto.ACTIVO)) plan.errores.push('Elige tu departamento.');
    else plan.idDepartamento = depto.ID_DEPARTAMENTO;
  }
  return plan;
}

/** Lo que pinta la pantalla de registro (datosIniciales_): lo que le falta y las listas para elegir. */
function pantallaRegistro_(pendiente, correo, departamentos, puestos) {
  let nombre = pendiente.nombre;
  if (!nombre) { try { nombre = nombreDirectorio_(correo); } catch (e) { nombre = ''; } }
  return {
    modo: pendiente.modo, correo: correo, nombre: nombre, puesto: pendiente.puesto,
    faltaPuesto: pendiente.faltaPuesto, faltaDepartamento: pendiente.faltaDepartamento,
    departamentos: departamentos.filter(function (d) { return esActivo_(d.ACTIVO); })
      .map(function (d) { return { id: d.ID_DEPARTAMENTO, nombre: String(d.NOMBRE) }; })
      .sort(function (a, b) { return a.nombre.localeCompare(b.nombre, 'es'); }),
    puestos: puestos.filter(function (p) { return esActivo_(p.ACTIVO); }).map(function (p) { return String(p.NOMBRE); })
      .sort(function (a, b) { return a.localeCompare(b, 'es'); })
  };
}

function registroAbierto_() {
  return String(obtenerConfig_('REGISTRO_ABIERTO', 'SI')).trim().toUpperCase() === 'SI';
}

function registrarme_(sesion, datos) {
  if (sesion.verComo) throw new Error('Con «Ver como» no se registra a nadie: vuelve a tu usuario.');
  const correo = String(sesion.correo || '').trim().toLowerCase();
  let modo = '';
  conCandado_(20000, function () {
    const actuales = { usuarios: leerTablaFresca_('Usuarios'), perfiles: leerTablaFresca_('UsuarioPerfiles'),
      usuarioDeptos: leerTablaFresca_('UsuarioDepartamentos'), puestos: leerTablaFresca_('Puestos'), departamentos: leerTabla_('Departamentos') };
    const pendiente = registroPendiente_(correo, actuales, ambienteActual_(), registroAbierto_());
    if (!pendiente) throw new Error('Tu registro ya está completo: recarga la página.');
    const plan = planRegistro_(datos, pendiente, actuales);
    if (plan.errores.length) throw new Error(plan.errores.join(' '));
    modo = pendiente.modo;
    const ahora = new Date();
    let idUsuario = pendiente.idUsuario;
    if (modo === 'ALTA') {
      idUsuario = siguienteId_('USR', 4);
      agregarFila_('Usuarios', { ID_USUARIO: idUsuario, CORREO: correo, NOMBRE: plan.nombre, ID_PUESTO: '', ACTIVO: 'SI',
        FECHA_ALTA: ahora, ACTUALIZADO_POR: correo, FECHA_ACTUALIZACION: ahora });
      agregarFila_('UsuarioPerfiles', { ID_USUARIO_PERFIL: siguienteId_('UPE', 4), ID_USUARIO: idUsuario, PERFIL: 'COLABORADOR',
        ID_DEPARTAMENTO: '', ACTIVO: 'SI', FECHA_ALTA: ahora });
    }
    if (plan.idDepartamento) {
      agregarFila_('UsuarioDepartamentos', { ID_USUARIO_DEPARTAMENTO: siguienteId_('UDE', 4), ID_USUARIO: idUsuario,
        ID_DEPARTAMENTO: plan.idDepartamento, PRINCIPAL: 'SI', ACTIVO: 'SI' });
    }
    const yo = { registrado: true, correo: correo, idUsuario: idUsuario, nombre: plan.nombre || sesion.nombre, perfiles: ['COLABORADOR'] };
    const puesto = plan.puesto ? asegurarMiPuesto_(yo, datos.puesto) : pendiente.puesto;
    const depto = plan.idDepartamento ? (leerTabla_('Departamentos').filter(function (x) { return x.ID_DEPARTAMENTO === plan.idDepartamento; })[0] || {}).NOMBRE : '';
    registrarBitacora_(yo, modo === 'ALTA' ? 'REGISTRO_PROPIO' : 'DATOS_PROPIOS',
      [modo === 'ALTA' ? correo + ' como colaborador' : '', puesto ? 'puesto ' + puesto : '', depto ? 'departamento ' + depto : ''].filter(Boolean).join('; '));
  });
  // La sesión y las pantallas de regreso: la app entra sin volver a cargar la página (que tarda varios segundos).
  const usuarios = leerTablaFresca_('Usuarios');
  const perfiles = leerTablaFresca_('UsuarioPerfiles');
  const nueva = buscarSesion_(correo, usuarios, perfiles);
  return { modo: modo, sesion: nueva, modulos: nueva.registrado ? modulosDe_(nueva.perfiles) : [],
    verComo: puedeVerComo_(ambienteActual_(), nueva) ? usuariosParaVerComo_(usuarios, perfiles) : [] };
}
