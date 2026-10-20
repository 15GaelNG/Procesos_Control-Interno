/**
 * REVISIÓN DE PROCESOS (fase 5; requerimiento §4.3, respuestas de Procesos y decisión 23).
 *
 *   enviarARevision_()   → el colaborador manda su solicitud confirmada (foto del contenido en JSON).
 *   bandejaRevision_()   → sin asignar, mías, de otros revisores, devueltas y en CH.
 *   tomar_ / liberar_ / reasignar_ → bandeja común: un revisor la toma; un administrador reasigna.
 *   observaciones        → por apartado o actividad: ABIERTA → ATENDIDA (colaborador) → CERRADA (revisor).
 *   devolver_ / noProcedente_ / darVoBo_ → las tres salidas de la revisión.
 *
 * Reglas: nadie revisa lo que él mismo elaboró; solo el revisor asignado observa y decide; el Vo.Bo.
 * exige que no haya observaciones abiertas y que el contenido sea el confirmado; asigna el código
 * (el sistema propone el siguiente libre y Procesos puede corregirlo) y la versión. No procedente no
 * consume código (§2.1). Lo puro está probado en tests/revision.test.js.
 */

// ─────────────────────────────── Personas ───────────────────────────────

function puestoDeUsuario_(idUsuario, usuarios, puestos) {
  const u = usuarios.filter(function (x) { return x.ID_USUARIO === idUsuario; })[0];
  const p = u && puestos.filter(function (x) { return x.ID_PUESTO && x.ID_PUESTO === u.ID_PUESTO; })[0];
  return p ? String(p.NOMBRE) : '';
}

/** Usuarios activos con perfil REVISOR activo: [{ id, nombre }], por nombre. */
function revisoresActivos_(usuarios, perfiles) {
  return usuarios.filter(function (u) { return esActivo_(u.ACTIVO) && perfilesDe_(u.ID_USUARIO, perfiles).indexOf('REVISOR') !== -1; })
    .map(function (u) { return { id: u.ID_USUARIO, nombre: String(u.NOMBRE || u.CORREO) }; })
    .sort(function (a, b) { return a.nombre.localeCompare(b.nombre, 'es'); });
}

function esRevisorAsignado_(sesion, fila) {
  return !!sesion.registrado && sesion.perfiles.indexOf('REVISOR') !== -1 && fila.REVISOR_ASIGNADO_ID === sesion.idUsuario &&
    fila.ELABORO_ID !== sesion.idUsuario;
}

// ─────────────────────────────── Instantáneas ───────────────────────────────

/** Lo que se guarda como foto del contenido (lo mismo que confirma el colaborador). */
function instantanea_(det, revision, motivo) {
  return {
    folio: det.id, revision: revision, motivo: motivo, nombre: det.nombre, tipoDocumento: det.tipoDocumento,
    departamento: det.departamento, area: det.area, subarea: det.subarea, codigo: det.codigo, version: det.version,
    inicio: det.inicio, fin: det.fin, objetivo: det.objetivo, alcance: det.alcance,
    responsabilidades: det.responsabilidades, definiciones: det.definiciones,
    actividades: det.actividades.map(function (a, i) {
      return { numero: i + 1, id: a.id, responsable: a.responsable, texto: a.texto,
        imagenes: a.imagenes.map(function (im) { return { id: im.id, pie: im.pie }; }) };
    })
  };
}

function guardarInstantanea_(sesion, fila, det, revision, motivo, huella) {
  const carpeta = asegurarCarpeta_(DriveApp.getFolderById(fila.ID_CARPETA), CARPETA_INSTANTANEAS_SOLICITUD, null,
    'Foto del contenido en cada envío a revisión y en el Vo.Bo. No se edita.');
  const nombre = det.id + ' r' + revision + ' ' + motivo + ' ' + Utilities.formatDate(new Date(), ZONA_HORARIA, 'yyyy-MM-dd HH.mm') + '.json';
  const archivo = carpeta.createFile(nombre, JSON.stringify(instantanea_(det, revision, motivo), null, 2), 'application/json');
  agregarFila_('Instantaneas', { ID_INSTANTANEA: siguienteId_('INS', 6), ID_SOLICITUD: det.id, REVISION: String(revision), MOTIVO: motivo,
    HUELLA: huella, ID_ARCHIVO_JSON: archivo.getId(), USUARIO: correoReal_(sesion), FECHA: new Date() });
}

// ─────────────────────────────── Envío a revisión (colaborador) ───────────────────────────────

/** Qué cambia al enviar (sin tocar Google). */
function planEnvio_(fila, huellaActual, observaciones) {
  const plan = { errores: [], cambios: {} };
  if (fila.ESTADO !== ESTADOS.CONFIRMADO) {
    plan.errores.push(fila.ESTADO === ESTADOS.EN_REVISION ? 'Ya está en revisión de Procesos.' : 'Primero confirma el documento en la vista previa.');
    return plan;
  }
  if (huellaActual !== String(fila.HUELLA_CONFIRMADA)) plan.errores.push('El contenido cambió después de confirmar: vuelve a confirmar.');
  const abiertas = observaciones.filter(function (o) { return o.ID_SOLICITUD === fila.ID_SOLICITUD && o.ESTADO === 'ABIERTA'; }).length;
  if (abiertas) plan.errores.push(abiertas === 1 ? 'Falta atender 1 observación de Procesos.' : 'Faltan ' + abiertas + ' observaciones de Procesos por atender.');
  if (plan.errores.length) return plan;
  plan.cambios = { ESTADO: ESTADOS.EN_REVISION, REVISION: String((Number(fila.REVISION) || 0) + 1) };
  return plan;
}

function enviarARevision_(sesion, idSolicitud) {
  const fila = filaSolicitud_(idSolicitud);
  if (fila.ELABORO_ID !== sesion.idUsuario || sesion.perfiles.indexOf('COLABORADOR') === -1) throw new Error('Solo quien elaboró la solicitud la envía a revisión.');
  const det = detalleSolicitud_(fila, leerTabla_('Actividades'), leerTabla_('Imagenes'), tablasSolicitud_(), { editar: false }, formatoFecha_);
  const huella = huellaDeDetalle_(det);
  const plan = planEnvio_(fila, huella, leerTabla_('Observaciones'));
  if (plan.errores.length) throw new Error(plan.errores.join(' '));
  const ahora = marcaDeTiempo_(new Date());
  guardarInstantanea_(sesion, fila, det, plan.cambios.REVISION, 'ENVIO', huella);
  actualizarFila_('Solicitudes', fila._fila, Object.assign({ FECHA_ENVIO_REVISION: ahora, FECHA_ACTUALIZACION: ahora }, plan.cambios));
  registrarBitacora_(sesion, 'ENVIAR_REVISION', 'Revisión ' + plan.cambios.REVISION + '.', idSolicitud, fila.ESTADO, ESTADOS.EN_REVISION);
  return { estado: ESTADOS.EN_REVISION, revision: plan.cambios.REVISION };
}

// ─────────────────────────────── Bandeja ───────────────────────────────

/** La bandeja de Procesos agrupada (sin tocar Google). Lo que más tiempo lleva esperando, primero. */
function bandejaRevision_(filas, sesion, t, usuarios, formatear, ahora) {
  const nombreDe = function (lista, campo, id) { const x = lista.filter(function (r) { return r[campo] === id; })[0]; return x ? String(x.NOMBRE) : ''; };
  const dia = 24 * 60 * 60 * 1000;
  const grupos = { sinAsignar: [], mias: [], otros: [], devueltas: [], enCH: [] };
  filas.forEach(function (s) {
    if ([ESTADOS.EN_REVISION, ESTADOS.DEVUELTO, ESTADOS.EN_AUTORIZACION_CH].indexOf(s.ESTADO) === -1) return;
    const enviada = marcaDe_(s.FECHA_ENVIO_REVISION);
    const item = {
      id: s.ID_SOLICITUD, nombre: String(s.NOMBRE_DOCUMENTO), codigo: String(s.CODIGO || ''),
      tipoDocumento: nombreDe(t.tipos, 'ID_TIPO', s.ID_TIPO), departamento: nombreDe(t.departamentos, 'ID_DEPARTAMENTO', s.ID_DEPARTAMENTO),
      area: nombreDe(t.areas, 'ID_AREA', s.ID_AREA), elaboroId: String(s.ELABORO_ID || ''), elaborador: String(s.ELABORO_NOMBRE || ''),
      revision: String(s.REVISION || ''),
      estado: s.ESTADO, nombreEstado: NOMBRES_ESTADO[s.ESTADO], revisorId: String(s.REVISOR_ASIGNADO_ID || ''),
      revisor: s.REVISOR_ASIGNADO_ID ? nombreDe(usuarios, 'ID_USUARIO', s.REVISOR_ASIGNADO_ID) : '',
      enviada: enviada ? formatear(new Date(enviada)) : '', dias: enviada ? Math.floor((ahora.getTime() - enviada) / dia) : 0,
      esSuya: s.ELABORO_ID === sesion.idUsuario
    };
    if (s.ESTADO === ESTADOS.DEVUELTO) grupos.devueltas.push(item);
    else if (s.ESTADO === ESTADOS.EN_AUTORIZACION_CH) grupos.enCH.push(item);
    else if (!item.revisorId) grupos.sinAsignar.push(item);
    else if (item.revisorId === sesion.idUsuario) grupos.mias.push(item);
    else grupos.otros.push(item);
  });
  Object.keys(grupos).forEach(function (k) { grupos[k].sort(function (a, b) { return b.dias - a.dias || a.id.localeCompare(b.id); }); });
  return grupos;
}

// ─────────────────────────────── Tomar, liberar, reasignar ───────────────────────────────

function planTomar_(fila, sesion, usuarios) {
  const e = [];
  if (sesion.perfiles.indexOf('REVISOR') === -1) e.push('Solo un revisor de Procesos puede tomar solicitudes.');
  else if (fila.ELABORO_ID === sesion.idUsuario) e.push('No puedes revisar una solicitud que tú elaboraste.');
  else if (fila.ESTADO !== ESTADOS.EN_REVISION) e.push('Solo se toman solicitudes en revisión.');
  else if (fila.REVISOR_ASIGNADO_ID && fila.REVISOR_ASIGNADO_ID !== sesion.idUsuario) {
    const otro = usuarios.filter(function (u) { return u.ID_USUARIO === fila.REVISOR_ASIGNADO_ID; })[0];
    e.push('Ya la tiene ' + (otro ? otro.NOMBRE : 'otro revisor') + '.');
  }
  return e;
}

function planReasignar_(fila, idRevisor, revisores) {
  const e = [];
  if ([ESTADOS.EN_REVISION, ESTADOS.DEVUELTO, ESTADOS.EN_AUTORIZACION_CH].indexOf(fila.ESTADO) === -1) e.push('Esta solicitud ya no está con Procesos.');
  if (idRevisor && !revisores.some(function (r) { return r.id === idRevisor; })) e.push('Esa persona no es revisora de Procesos activa.');
  if (idRevisor && idRevisor === fila.ELABORO_ID) e.push('No se le puede asignar a quien la elaboró.');
  return e;
}

function tomarSolicitud_(sesion, idSolicitud) {
  const candado = LockService.getScriptLock();
  candado.waitLock(20000);
  let fila;
  try {
    fila = filaSolicitud_(idSolicitud);
    const e = planTomar_(fila, sesion, leerTabla_('Usuarios'));
    if (e.length) throw new Error(e.join(' '));
    actualizarFila_('Solicitudes', fila._fila, { REVISOR_ASIGNADO_ID: sesion.idUsuario });
  } finally {
    candado.releaseLock();
  }
  registrarBitacora_(sesion, 'TOMAR_SOLICITUD', 'La tomó ' + sesion.nombre + '.', idSolicitud);
  return { revisorId: sesion.idUsuario };
}

function liberarSolicitud_(sesion, idSolicitud) {
  const fila = filaSolicitud_(idSolicitud);
  if (!esRevisorAsignado_(sesion, fila) || fila.ESTADO !== ESTADOS.EN_REVISION) throw new Error('Solo el revisor asignado la puede liberar mientras está en revisión.');
  actualizarFila_('Solicitudes', fila._fila, { REVISOR_ASIGNADO_ID: '' });
  registrarBitacora_(sesion, 'LIBERAR_SOLICITUD', 'Regresó a la bandeja sin asignar.', idSolicitud);
  return { revisorId: '' };
}

function reasignarSolicitud_(sesion, idSolicitud, idRevisor) {
  const fila = filaSolicitud_(idSolicitud);
  const revisores = revisoresActivos_(leerTabla_('Usuarios'), leerTabla_('UsuarioPerfiles'));
  const e = planReasignar_(fila, idRevisor, revisores);
  if (e.length) throw new Error(e.join(' '));
  actualizarFila_('Solicitudes', fila._fila, { REVISOR_ASIGNADO_ID: idRevisor || '' });
  const nombre = (revisores.filter(function (r) { return r.id === idRevisor; })[0] || {}).nombre || 'nadie (sin asignar)';
  registrarBitacora_(sesion, 'REASIGNAR_SOLICITUD', 'Asignada a ' + nombre + '.', idSolicitud);
  return { revisorId: idRevisor || '' };
}

// ─────────────────────────────── Observaciones ───────────────────────────────

/** Valida y arma una observación nueva del revisor asignado (sin tocar Google). */
function planObservacion_(datos, fila, det, sesion, ahora) {
  const plan = { errores: [], fila: null };
  if (!esRevisorAsignado_(sesion, fila) || fila.ESTADO !== ESTADOS.EN_REVISION) {
    plan.errores.push('Para hacer observaciones primero toma la solicitud (y debe estar en revisión).');
    return plan;
  }
  const apartado = String(datos.apartado || '');
  if (!APARTADOS_OBSERVACION[apartado]) plan.errores.push('Elige a qué parte del documento se refiere.');
  const idActividad = apartado === 'ACTIVIDAD' ? String(datos.idActividad || '') : '';
  if (apartado === 'ACTIVIDAD' && !det.actividades.some(function (a) { return a.id === idActividad; })) plan.errores.push('Esa actividad ya no existe.');
  const texto = String(datos.texto || '').replace(/\r\n/g, '\n').trim();
  if (!texto) plan.errores.push('Escribe la observación.');
  if (texto.length > OBSERVACION_MAX) plan.errores.push('La observación pasa de ' + OBSERVACION_MAX + ' caracteres.');
  if (plan.errores.length) return plan;
  plan.fila = { ID_SOLICITUD: fila.ID_SOLICITUD, REVISION: String(fila.REVISION || ''), APARTADO: apartado, ID_ACTIVIDAD: idActividad,
    AUTOR_ID: sesion.idUsuario, AUTOR_NOMBRE: sesion.nombre, PERFIL: 'REVISOR', TEXTO: texto, ESTADO: 'ABIERTA', RESPUESTA: '',
    FECHA: ahora, FECHA_ATENCION: '' };
  return plan;
}

/**
 * Cambios de estado de una observación (sin tocar Google):
 *   colaborador (dueño, mientras la puede editar: devuelta, o ya corregida y en borrador o confirmada):
 *     ATENDER con su respuesta (también para corregir la respuesta);
 *   revisor asignado (EN_REVISION): CERRAR (verificada o retirada) o REABRIR.
 */
function planCambioObservacion_(obs, fila, sesion, accion, texto, ahora) {
  const plan = { errores: [], cambios: {} };
  const respuesta = String(texto || '').replace(/\r\n/g, '\n').trim();
  if (respuesta.length > OBSERVACION_MAX) { plan.errores.push('La respuesta pasa de ' + OBSERVACION_MAX + ' caracteres.'); return plan; }
  if (accion === 'ATENDER') {
    if (fila.ELABORO_ID !== sesion.idUsuario) plan.errores.push('Solo quien elaboró la solicitud atiende las observaciones.');
    else if (ESTADOS_EDITABLES.indexOf(fila.ESTADO) === -1) plan.errores.push('Las observaciones se atienden cuando Procesos te regresa la solicitud.');
    else if (obs.ESTADO === 'CERRADA') plan.errores.push('Esa observación ya la cerró Procesos.');
    else plan.cambios = { ESTADO: 'ATENDIDA', RESPUESTA: respuesta, FECHA_ATENCION: ahora };
  } else if (accion === 'CERRAR' || accion === 'REABRIR') {
    if (!esRevisorAsignado_(sesion, fila) || fila.ESTADO !== ESTADOS.EN_REVISION) plan.errores.push('Solo el revisor asignado, con la solicitud en revisión.');
    else if (accion === 'CERRAR' && obs.ESTADO === 'CERRADA') plan.errores.push('Ya está cerrada.');
    else if (accion === 'REABRIR' && obs.ESTADO === 'ABIERTA') plan.errores.push('Ya está abierta.');
    else plan.cambios = { ESTADO: accion === 'CERRAR' ? 'CERRADA' : 'ABIERTA' };
  } else {
    plan.errores.push('Acción no válida.');
  }
  return plan;
}

/** Las observaciones de una solicitud para la pantalla: la revisión más reciente primero. */
function observacionesDe_(filas, idSolicitud, det, formatear) {
  const numero = function (id) { return det.actividades.map(function (a) { return a.id; }).indexOf(id) + 1; };
  return filas.filter(function (o) { return o.ID_SOLICITUD === idSolicitud; })
    .sort(function (a, b) { return (Number(b.REVISION) - Number(a.REVISION)) || (marcaDe_(a.FECHA) - marcaDe_(b.FECHA)); })
    .map(function (o) {
      const n = o.ID_ACTIVIDAD ? numero(o.ID_ACTIVIDAD) : 0;
      return { id: o.ID_OBSERVACION, revision: String(o.REVISION || ''), apartado: o.APARTADO, idActividad: String(o.ID_ACTIVIDAD || ''),
        nombreApartado: o.APARTADO === 'ACTIVIDAD' ? (n ? 'Actividad ' + n : 'Actividad eliminada') : (APARTADOS_OBSERVACION[o.APARTADO] || o.APARTADO),
        texto: String(o.TEXTO), estado: o.ESTADO, nombreEstado: NOMBRES_ESTADO_OBSERVACION[o.ESTADO] || o.ESTADO, respuesta: String(o.RESPUESTA || ''), autor: String(o.AUTOR_NOMBRE || ''),
        fecha: marcaDe_(o.FECHA) ? formatear(new Date(marcaDe_(o.FECHA))) : '',
        fechaAtencion: marcaDe_(o.FECHA_ATENCION) ? formatear(new Date(marcaDe_(o.FECHA_ATENCION))) : '' };
    });
}

function agregarObservacion_(sesion, idSolicitud, datos) {
  const fila = filaSolicitud_(idSolicitud);
  const det = detalleSolicitud_(fila, leerTabla_('Actividades'), leerTabla_('Imagenes'), tablasSolicitud_(), { editar: false }, formatoFecha_);
  const plan = planObservacion_(datos || {}, fila, det, sesion, new Date());
  if (plan.errores.length) throw new Error(plan.errores.join(' '));
  agregarFila_('Observaciones', Object.assign({ ID_OBSERVACION: siguienteId_('OBS', 6) }, plan.fila));
  return { ok: true };
}

function cambiarObservacion_(sesion, idSolicitud, idObservacion, accion, texto) {
  const fila = filaSolicitud_(idSolicitud);
  const obs = leerTabla_('Observaciones').filter(function (o) { return o.ID_OBSERVACION === idObservacion && o.ID_SOLICITUD === idSolicitud; })[0];
  if (!obs) throw new Error('No existe esa observación.');
  const plan = planCambioObservacion_(obs, fila, sesion, accion, texto, new Date());
  if (plan.errores.length) throw new Error(plan.errores.join(' '));
  actualizarFila_('Observaciones', obs._fila, plan.cambios);
  return { estado: plan.cambios.ESTADO };
}

// ─────────────────────────────── Devolver y no procedente ───────────────────────────────

function planDevolver_(fila, sesion, observaciones) {
  const e = [];
  if (!esRevisorAsignado_(sesion, fila) || fila.ESTADO !== ESTADOS.EN_REVISION) e.push('Solo el revisor asignado puede devolverla, mientras está en revisión.');
  else if (!observaciones.some(function (o) { return o.ID_SOLICITUD === fila.ID_SOLICITUD && o.ESTADO === 'ABIERTA'; })) {
    e.push('Para devolverla escribe al menos una observación: el colaborador necesita saber qué corregir.');
  }
  return e;
}

function devolverSolicitud_(sesion, idSolicitud) {
  const fila = filaSolicitud_(idSolicitud);
  const observaciones = leerTabla_('Observaciones');
  const e = planDevolver_(fila, sesion, observaciones);
  if (e.length) throw new Error(e.join(' '));
  const abiertas = observaciones.filter(function (o) { return o.ID_SOLICITUD === idSolicitud && o.ESTADO === 'ABIERTA'; }).length;
  actualizarFila_('Solicitudes', fila._fila, { ESTADO: ESTADOS.DEVUELTO, FECHA_ACTUALIZACION: marcaDeTiempo_(new Date()) });
  registrarBitacora_(sesion, 'DEVOLVER_SOLICITUD', abiertas + (abiertas === 1 ? ' observación.' : ' observaciones.'), idSolicitud, fila.ESTADO, ESTADOS.DEVUELTO);
  return { estado: ESTADOS.DEVUELTO };
}

function noProcedente_(sesion, idSolicitud, motivo) {
  const fila = filaSolicitud_(idSolicitud);
  const texto = String(motivo || '').replace(/\s+/g, ' ').trim();
  if (!esRevisorAsignado_(sesion, fila) || fila.ESTADO !== ESTADOS.EN_REVISION) throw new Error('Solo el revisor asignado puede cerrarla, mientras está en revisión.');
  if (!texto) throw new Error('Escribe el motivo: el colaborador lo verá.');
  if (texto.length > OBSERVACION_MAX) throw new Error('El motivo pasa de ' + OBSERVACION_MAX + ' caracteres.');
  actualizarFila_('Solicitudes', fila._fila, { ESTADO: ESTADOS.NO_PROCEDENTE, MOTIVO_CIERRE: texto, FECHA_ACTUALIZACION: marcaDeTiempo_(new Date()) });
  registrarBitacora_(sesion, 'NO_PROCEDENTE', texto, idSolicitud, fila.ESTADO, ESTADOS.NO_PROCEDENTE);
  return { estado: ESTADOS.NO_PROCEDENTE };
}

// ─────────────────────────────── Código y Vo.Bo. ───────────────────────────────

/** Códigos que ya existen (inventario y solicitudes), para no repetir. */
function codigosUsados_(solicitudes, documentos, excluirSolicitud) {
  return solicitudes.filter(function (s) { return s.ID_SOLICITUD !== excluirSolicitud && String(s.CODIGO || '').trim(); })
    .map(function (s) { return String(s.CODIGO).trim().toUpperCase(); })
    .concat(documentos.map(function (d) { return String(d.CODIGO || '').trim().toUpperCase(); }).filter(Boolean));
}

/**
 * El siguiente código libre: PREFIJO-CUERPO-NNN, con NNN mayor que todo lo usado con ese inicio y
 * que el último que guardó Consecutivos. (Cómo cuenta el consecutivo está pendiente con Procesos,
 * pregunta F: por ahora, por tipo + departamento + área.)
 */
function siguienteCodigo_(prefijo, cuerpo, usados, ultimo) {
  const inicio = (prefijo + '-' + cuerpo + '-').toUpperCase();
  const maximo = usados.reduce(function (m, c) {
    if (c.indexOf(inicio) !== 0) return m;
    const n = Number(c.slice(inicio.length));
    return isFinite(n) && n > m ? n : m;
  }, Number(ultimo) || 0);
  return inicio + String(maximo + 1).padStart(CONSECUTIVO_DIGITOS, '0');
}

function validarCodigo_(codigo, prefijo, cuerpo, usados) {
  const c = String(codigo || '').trim().toUpperCase();
  const e = [];
  const inicio = (prefijo + '-' + cuerpo + '-').toUpperCase();
  if (c.indexOf(inicio) !== 0 || !/^\d+$/.test(c.slice(inicio.length)) || c.slice(inicio.length).length < CONSECUTIVO_DIGITOS) {
    e.push('El código debe ser ' + inicio + 'NNN (tipo de documento, departamento y área de la solicitud y un consecutivo de ' + CONSECUTIVO_DIGITOS + ' dígitos).');
  } else if (usados.indexOf(c) !== -1) {
    e.push('El código ' + c + ' ya está en uso.');
  }
  return e;
}

/** Qué cambia con el Vo.Bo. (sin tocar Google). */
function planVoBo_(fila, sesion, det, huellaActual, observaciones, codigo, usados, puestoRevisor, ahora) {
  const plan = { errores: [], cambios: {}, cerrarObservaciones: [], codigo: '' };
  const e = plan.errores;
  if (!esRevisorAsignado_(sesion, fila) || fila.ESTADO !== ESTADOS.EN_REVISION) { e.push('Solo el revisor asignado da el Vo.Bo., mientras está en revisión.'); return plan; }
  if (huellaActual !== String(fila.HUELLA_CONFIRMADA)) e.push('El contenido no es el que confirmó el colaborador. Devuélvela para que lo revise y confirme.');
  const propias = observaciones.filter(function (o) { return o.ID_SOLICITUD === fila.ID_SOLICITUD; });
  const abiertas = propias.filter(function (o) { return o.ESTADO === 'ABIERTA'; }).length;
  if (abiertas) e.push('Hay ' + abiertas + (abiertas === 1 ? ' observación abierta' : ' observaciones abiertas') + ': devuélvela o ciérralas antes del Vo.Bo.');
  // Las actualizaciones conservan su código (fase 7); un documento nuevo recibe uno.
  const nuevo = fila.TIPO_SOLICITUD === TIPOS_SOLICITUD.NUEVO;
  plan.codigo = nuevo ? String(codigo || '').trim().toUpperCase() : String(fila.CODIGO || '');
  if (nuevo) validarCodigo_(plan.codigo, det.prefijo, det.cuerpo, usados).forEach(function (x) { e.push(x); });
  if (e.length) return plan;
  plan.cambios = { ESTADO: ESTADOS.EN_AUTORIZACION_CH, CODIGO: plan.codigo, VERSION: nuevo ? '0.0' : String(fila.VERSION || ''),
    REVISO_ID: sesion.idUsuario, REVISO_NOMBRE: sesion.nombre, REVISO_PUESTO: puestoRevisor, FECHA_REVISION: ahora, FECHA_ACTUALIZACION: ahora };
  plan.cerrarObservaciones = propias.filter(function (o) { return o.ESTADO === 'ATENDIDA'; }).map(function (o) { return o._fila; });
  return plan;
}

/** Lo que el revisor necesita para dar el Vo.Bo.: el código propuesto. */
function propuestaCodigo_(fila, det) {
  if (fila.TIPO_SOLICITUD !== TIPOS_SOLICITUD.NUEVO) return String(fila.CODIGO || '');
  if (fila.CODIGO) return String(fila.CODIGO);
  const serie = leerTabla_('Consecutivos').filter(function (c) { return c.SERIE === 'COD-' + det.prefijo + '-' + det.cuerpo; })[0];
  return siguienteCodigo_(det.prefijo, det.cuerpo, codigosUsados_(leerTabla_('Solicitudes'), leerTabla_('Documentos'), fila.ID_SOLICITUD), serie ? serie.ULTIMO : 0);
}

function darVoBo_(sesion, idSolicitud, codigo) {
  const t = tablasSolicitud_();
  const puesto = puestoDeUsuario_(sesion.idUsuario, t.usuarios, t.puestos);
  const candado = LockService.getScriptLock();
  candado.waitLock(20000);
  let fila, det, huella, plan;
  try {
    fila = filaSolicitud_(idSolicitud);
    det = detalleSolicitud_(fila, leerTabla_('Actividades'), leerTabla_('Imagenes'), t, { editar: false }, formatoFecha_);
    huella = huellaDeDetalle_(det);
    const usados = codigosUsados_(leerTabla_('Solicitudes'), leerTabla_('Documentos'), idSolicitud);
    plan = planVoBo_(fila, sesion, det, huella, leerTabla_('Observaciones'), codigo, usados, puesto, marcaDeTiempo_(new Date()));
    if (plan.errores.length) throw new Error(plan.errores.join(' '));
    actualizarFila_('Solicitudes', fila._fila, plan.cambios);
    plan.cerrarObservaciones.forEach(function (f) { actualizarFila_('Observaciones', f, { ESTADO: 'CERRADA' }); });
    // El consecutivo de la serie avanza hasta el número usado (si Procesos eligió otro, se respeta).
    const serie = 'COD-' + det.prefijo + '-' + det.cuerpo;
    const numero = Number(plan.codigo.split('-').pop()) || 0;
    const actual = leerTabla_('Consecutivos').filter(function (c) { return c.SERIE === serie; })[0];
    if (!actual) agregarFila_('Consecutivos', { SERIE: serie, ULTIMO: String(numero), FECHA_ACTUALIZACION: new Date() });
    else if (numero > Number(actual.ULTIMO)) actualizarFila_('Consecutivos', actual._fila, { ULTIMO: String(numero), FECHA_ACTUALIZACION: new Date() });
    SpreadsheetApp.flush();
  } finally {
    candado.releaseLock();
  }
  det.codigo = plan.codigo;
  det.version = plan.cambios.VERSION;
  guardarInstantanea_(sesion, fila, det, fila.REVISION, 'VOBO', huella);
  registrarBitacora_(sesion, 'VOBO_PROCESOS', 'Código ' + plan.codigo + ', versión ' + plan.cambios.VERSION + '.', idSolicitud, fila.ESTADO, ESTADOS.EN_AUTORIZACION_CH);
  return { estado: ESTADOS.EN_AUTORIZACION_CH, codigo: plan.codigo };
}

// ─────────────────────────────── Pantalla de revisión ───────────────────────────────

/** Todo lo que ve Procesos al abrir una solicitud: el documento, las observaciones y qué puede hacer. */
function detalleRevision_(sesion, idSolicitud) {
  const fila = filaSolicitud_(idSolicitud);
  const permiso = permisoSolicitud_(sesion, fila);
  if (!permiso.ver) throw new Error('No puedes ver esta solicitud.');
  const t = tablasSolicitud_();
  const det = detalleSolicitud_(fila, leerTabla_('Actividades'), leerTabla_('Imagenes'), t, { editar: false }, formatoFecha_);
  det.puestos = puestosInvolucrados_(det);
  det.huella = huellaDeDetalle_(det);
  det.revision = String(fila.REVISION || '');
  det.motivoCierre = String(fila.MOTIVO_CIERRE || '');
  det.observaciones = observacionesDe_(leerTabla_('Observaciones'), idSolicitud, det, formatoFecha_);
  const asignado = t.usuarios.filter(function (u) { return u.ID_USUARIO === fila.REVISOR_ASIGNADO_ID; })[0];
  det.revisor = asignado ? String(asignado.NOMBRE) : '';
  det.esSuya = fila.ELABORO_ID === sesion.idUsuario;
  det.esNuevo = fila.TIPO_SOLICITUD === TIPOS_SOLICITUD.NUEVO;
  det.enviada = marcaDe_(fila.FECHA_ENVIO_REVISION) ? formatoFecha_(new Date(marcaDe_(fila.FECHA_ENVIO_REVISION))) : '';
  det.esRevisorAsignado = esRevisorAsignado_(sesion, fila);
  det.puedeTomar = !planTomar_(fila, sesion, t.usuarios).length && fila.REVISOR_ASIGNADO_ID !== sesion.idUsuario;
  det.puedeDecidir = det.esRevisorAsignado && fila.ESTADO === ESTADOS.EN_REVISION;
  det.contenidoConfirmado = det.huella === String(fila.HUELLA_CONFIRMADA);
  det.codigoPropuesto = det.puedeDecidir ? propuestaCodigo_(fila, det) : '';
  det.apartados = APARTADOS_OBSERVACION;
  det.archivos = archivosSolicitud_(leerTabla_('Archivos'), idSolicitud, det.huella, formatoFecha_);
  det.puedeGenerar = puedeGenerarPreliminar_(sesion, fila);
  return det;
}
