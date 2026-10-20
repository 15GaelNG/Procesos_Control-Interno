/**
 * USUARIOS Y PERFILES (pantalla «Usuarios y perfiles»; reglas en la decisión 19 del análisis).
 *
 *   listaUsuarios_()       → cada persona con sus perfiles y departamentos.
 *   planGuardarUsuario_()  → valida un alta o un cambio y dice qué escribir (sin tocar Google).
 *   guardarUsuario_()      → aplica el plan y lo deja en la Bitacora.
 *
 * Reglas:
 *  - Solo un ADMINISTRADOR da de alta o cambia usuarios; SOPORTE_CI solo consulta.
 *  - Nadie cambia sus propios perfiles ni se da de baja a sí mismo: lo hace otro administrador.
 *  - Siempre queda al menos un administrador activo.
 *  - El correo es la identidad (con él entra a Google): no se cambia. Solo dominios de DOMINIOS_CORREO.
 *  - Nada se borra: un perfil o departamento que se quita queda con ACTIVO = NO; una baja es ACTIVO = NO.
 */

function esActivo_(v) { return String(v).trim().toUpperCase() === 'SI'; }

/** Departamentos activos asignados a un usuario: [{ id, principal, _fila }]. */
function departamentosDe_(idUsuario, usuarioDeptos) {
  return usuarioDeptos.filter(function (d) { return d.ID_USUARIO === idUsuario && esActivo_(d.ACTIVO); })
    .map(function (d) { return { id: d.ID_DEPARTAMENTO, principal: esActivo_(d.PRINCIPAL), _fila: d._fila }; });
}

/** Usuarios con perfiles y departamentos, ordenados por nombre, para la pantalla. */
function listaUsuarios_(usuarios, perfiles, usuarioDeptos, departamentos) {
  const nombreDepto = {};
  departamentos.forEach(function (d) { nombreDepto[d.ID_DEPARTAMENTO] = String(d.NOMBRE || d.ID_DEPARTAMENTO); });
  return usuarios.map(function (u) {
    return {
      id: u.ID_USUARIO,
      correo: String(u.CORREO || '').trim().toLowerCase(),
      nombre: String(u.NOMBRE || u.CORREO || ''),
      activo: esActivo_(u.ACTIVO),
      perfiles: perfilesDe_(u.ID_USUARIO, perfiles),
      departamentos: departamentosDe_(u.ID_USUARIO, usuarioDeptos).map(function (d) {
        return { id: d.id, nombre: nombreDepto[d.id] || d.id, principal: d.principal };
      }).sort(function (a, b) { return (b.principal - a.principal) || a.nombre.localeCompare(b.nombre, 'es'); })
    };
  }).sort(function (a, b) { return a.nombre.localeCompare(b.nombre, 'es'); });
}

/**
 * Valida un alta o un cambio y arma lo que hay que escribir.
 *   datos:    { idUsuario ('' = alta), correo, nombre, activo, perfiles[], departamentos[], principal }
 *   actuales: { usuarios, perfiles, usuarioDeptos, departamentos } (filas de leerTabla_)
 *   sesion:   quien hace el cambio (sesionEfectiva_)
 * Devuelve { errores[], sinCambios, nuevo, idUsuario, fila, usuario{columnas}, perfilesAgregar[],
 * perfilesQuitar[filas], deptosAgregar[{ID_DEPARTAMENTO, PRINCIPAL}], deptosQuitar[filas],
 * deptosPrincipal[{_fila, PRINCIPAL}], detalle }.
 */
function planGuardarUsuario_(datos, actuales, sesion, ambiente) {
  const plan = { errores: [], sinCambios: false, nuevo: !datos.idUsuario, idUsuario: datos.idUsuario || '', fila: 0,
    usuario: {}, perfilesAgregar: [], perfilesQuitar: [], deptosAgregar: [], deptosQuitar: [], deptosPrincipal: [], detalle: '' };
  const e = plan.errores;
  const correo = String(datos.correo || '').trim().toLowerCase();
  const nombre = String(datos.nombre || '').replace(/\s+/g, ' ').trim();
  const activo = datos.activo !== false;
  const perfiles = Object.keys(PERFILES).filter(function (p) { return (datos.perfiles || []).indexOf(p) !== -1; });
  const desconocidos = (datos.perfiles || []).filter(function (p) { return !PERFILES[p]; });
  const deptosPedidos = (datos.departamentos || []).filter(function (d, i, l) { return d && l.indexOf(d) === i; });

  // ¿Quién es?
  let actual = null;
  if (plan.nuevo) {
    const dominios = DOMINIOS_CORREO[ambiente] || DOMINIOS_CORREO.PRODUCCION;
    if (!/^[a-z0-9._%+-]+@([a-z0-9-]+\.)+[a-z]{2,}$/.test(correo)) e.push('Escribe un correo válido.');
    else if (dominios.indexOf(correo.split('@')[1]) === -1) e.push('El correo debe ser de ' + dominios.map(function (d) { return '@' + d; }).join(' o ') + '.');
    const repetido = actuales.usuarios.filter(function (u) { return String(u.CORREO).trim().toLowerCase() === correo; })[0];
    if (repetido) {
      e.push('Ya existe un usuario con ese correo' + (esActivo_(repetido.ACTIVO) ? '.' : ' (dado de baja): edítalo para reactivarlo.'));
    }
  } else {
    actual = actuales.usuarios.filter(function (u) { return u.ID_USUARIO === datos.idUsuario; })[0];
    if (!actual) { e.push('No existe el usuario ' + datos.idUsuario + '.'); return plan; }
    plan.fila = actual._fila;
    if (correo && correo !== String(actual.CORREO).trim().toLowerCase()) {
      e.push('El correo no se puede cambiar: es con el que la persona entra. Da de baja este usuario y crea otro.');
    }
  }
  if (!nombre) e.push('Escribe el nombre.');
  if (nombre.length > 120) e.push('El nombre es demasiado largo.');
  if (desconocidos.length) e.push('Perfil desconocido: ' + desconocidos.join(', ') + '.');
  if (activo && !perfiles.length) e.push('Elige al menos un perfil.');

  // Departamentos: deben existir y estar activos (salvo los que ya tenía asignados).
  const idUsuario = datos.idUsuario || '';
  const yaTenia = actual ? departamentosDe_(idUsuario, actuales.usuarioDeptos) : [];
  const nombreDepto = {};
  actuales.departamentos.forEach(function (d) { nombreDepto[d.ID_DEPARTAMENTO] = String(d.NOMBRE); });
  deptosPedidos.forEach(function (id) {
    const d = actuales.departamentos.filter(function (x) { return x.ID_DEPARTAMENTO === id; })[0];
    const loTenia = yaTenia.some(function (t) { return t.id === id; });
    if (!d) e.push('No existe el departamento ' + id + '.');
    else if (!esActivo_(d.ACTIVO) && !loTenia) e.push('El departamento ' + d.NOMBRE + ' está dado de baja.');
  });
  const principal = deptosPedidos.length ? (deptosPedidos.indexOf(datos.principal) !== -1 ? datos.principal : deptosPedidos[0]) : '';

  // Reglas sobre uno mismo.
  const perfilesAntes = actual ? perfilesDe_(idUsuario, actuales.perfiles) : [];
  const esUnoMismo = !!actual && idUsuario === sesion.idUsuario;
  if (esUnoMismo && perfilesAntes.join(',') !== perfiles.join(',')) {
    e.push('No puedes cambiar tus propios perfiles: pídeselo a otro administrador.');
  }
  if (esUnoMismo && !activo) e.push('No puedes darte de baja a ti mismo.');

  // Siempre debe quedar al menos un administrador activo.
  const adminsDespues = actuales.usuarios.filter(function (u) {
    if (u.ID_USUARIO === idUsuario) return activo && perfiles.indexOf('ADMINISTRADOR') !== -1;
    return esActivo_(u.ACTIVO) && perfilesDe_(u.ID_USUARIO, actuales.perfiles).indexOf('ADMINISTRADOR') !== -1;
  }).length + (plan.nuevo && activo && perfiles.indexOf('ADMINISTRADOR') !== -1 ? 1 : 0);
  if (!adminsDespues) e.push('Debe quedar al menos un administrador activo.');

  if (e.length) return plan;

  // Qué cambia.
  const partes = [];
  const nombreP = function (p) { return NOMBRES_PERFIL[p]; };
  if (plan.nuevo) {
    plan.usuario = { CORREO: correo, NOMBRE: nombre, ID_PUESTO: '', ACTIVO: activo ? 'SI' : 'NO' };
    partes.push('perfiles ' + perfiles.map(nombreP).join(', '));
  } else {
    if (nombre !== String(actual.NOMBRE).trim()) {
      plan.usuario.NOMBRE = nombre;
      partes.push('nombre «' + actual.NOMBRE + '» → «' + nombre + '»');
    }
    if (activo !== esActivo_(actual.ACTIVO)) {
      plan.usuario.ACTIVO = activo ? 'SI' : 'NO';
      partes.push(activo ? 'reactivado' : 'dado de baja');
    }
  }
  plan.perfilesAgregar = perfiles.filter(function (p) { return perfilesAntes.indexOf(p) === -1; });
  plan.perfilesQuitar = actual ? actuales.perfiles.filter(function (p) {
    return p.ID_USUARIO === idUsuario && esActivo_(p.ACTIVO) && perfiles.indexOf(String(p.PERFIL).trim().toUpperCase()) === -1;
  }).map(function (p) { return p._fila; }) : [];
  const quitados = perfilesAntes.filter(function (p) { return perfiles.indexOf(p) === -1; });
  if (!plan.nuevo && (plan.perfilesAgregar.length || quitados.length)) {
    partes.push('perfiles ' + plan.perfilesAgregar.map(function (p) { return '+' + nombreP(p); })
      .concat(quitados.map(function (p) { return '−' + nombreP(p); })).join(' '));
  }

  const deptosAntes = yaTenia.map(function (t) { return t.id; });
  plan.deptosAgregar = deptosPedidos.filter(function (id) { return deptosAntes.indexOf(id) === -1; })
    .map(function (id) { return { ID_DEPARTAMENTO: id, PRINCIPAL: id === principal ? 'SI' : 'NO' }; });
  plan.deptosQuitar = yaTenia.filter(function (t) { return deptosPedidos.indexOf(t.id) === -1; }).map(function (t) { return t._fila; });
  plan.deptosPrincipal = yaTenia.filter(function (t) { return deptosPedidos.indexOf(t.id) !== -1 && t.principal !== (t.id === principal); })
    .map(function (t) { return { _fila: t._fila, PRINCIPAL: t.id === principal ? 'SI' : 'NO' }; });
  const nombreD = function (id) { return nombreDepto[id] || id; };
  const cambiosDeptos = plan.deptosAgregar.map(function (d) { return '+' + nombreD(d.ID_DEPARTAMENTO); })
    .concat(yaTenia.filter(function (t) { return deptosPedidos.indexOf(t.id) === -1; }).map(function (t) { return '−' + nombreD(t.id); }));
  if (cambiosDeptos.length) partes.push('departamentos ' + cambiosDeptos.join(' '));
  const principalAntes = (yaTenia.filter(function (t) { return t.principal; })[0] || {}).id || '';
  if (principal && principal !== principalAntes && deptosPedidos.length > 1) partes.push('principal: ' + nombreD(principal));

  plan.sinCambios = !plan.nuevo && !partes.length;
  plan.detalle = (plan.nuevo ? 'Alta de ' : '') + (correo || String(actual.CORREO)) + (partes.length ? ': ' + partes.join('; ') : '');
  return plan;
}

/** Aplica un alta o un cambio. Lanza error con los motivos si no pasa las reglas. */
function guardarUsuario_(sesion, datos) {
  const actuales = { usuarios: leerTabla_('Usuarios'), perfiles: leerTabla_('UsuarioPerfiles'),
    usuarioDeptos: leerTabla_('UsuarioDepartamentos'), departamentos: leerTabla_('Departamentos') };
  const plan = planGuardarUsuario_(datos, actuales, sesion, ambienteActual_());
  if (plan.errores.length) throw new Error(plan.errores.join(' '));
  if (plan.sinCambios) return { idUsuario: plan.idUsuario, mensaje: 'No había cambios que guardar.' };

  const ahora = new Date();
  const quien = correoReal_(sesion);
  let id = plan.idUsuario;
  if (plan.nuevo) {
    id = siguienteId_('USR', 4);
    agregarFila_('Usuarios', Object.assign({ ID_USUARIO: id, FECHA_ALTA: ahora, ACTUALIZADO_POR: quien, FECHA_ACTUALIZACION: ahora }, plan.usuario));
  } else {
    actualizarFila_('Usuarios', plan.fila, Object.assign({ ACTUALIZADO_POR: quien, FECHA_ACTUALIZACION: ahora }, plan.usuario));
  }

  const idsPerfil = reservarIds_('UPE', plan.perfilesAgregar.length, 4);
  agregarFilas_('UsuarioPerfiles', plan.perfilesAgregar.map(function (p, i) {
    return { ID_USUARIO_PERFIL: idsPerfil[i], ID_USUARIO: id, PERFIL: p, ID_DEPARTAMENTO: '', ACTIVO: 'SI', FECHA_ALTA: ahora };
  }));
  plan.perfilesQuitar.forEach(function (fila) { actualizarFila_('UsuarioPerfiles', fila, { ACTIVO: 'NO' }); });

  const idsDepto = reservarIds_('UDE', plan.deptosAgregar.length, 4);
  agregarFilas_('UsuarioDepartamentos', plan.deptosAgregar.map(function (d, i) {
    return { ID_USUARIO_DEPARTAMENTO: idsDepto[i], ID_USUARIO: id, ID_DEPARTAMENTO: d.ID_DEPARTAMENTO, PRINCIPAL: d.PRINCIPAL, ACTIVO: 'SI' };
  }));
  plan.deptosQuitar.forEach(function (fila) { actualizarFila_('UsuarioDepartamentos', fila, { ACTIVO: 'NO', PRINCIPAL: 'NO' }); });
  plan.deptosPrincipal.forEach(function (c) { actualizarFila_('UsuarioDepartamentos', c._fila, { PRINCIPAL: c.PRINCIPAL }); });

  registrarBitacora_(sesion, plan.nuevo ? 'ALTA_USUARIO' : 'CAMBIO_USUARIO', plan.detalle);
  return { idUsuario: id, mensaje: plan.nuevo ? 'Usuario dado de alta.' : 'Cambios guardados.' };
}
