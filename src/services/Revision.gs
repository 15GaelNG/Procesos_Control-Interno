/**
 * REVISIÓN DE PROCESOS (fase 5; requerimiento §4.3, respuestas de Procesos y decisión 23).
 *
 *   enviarARevision_()   → el colaborador manda su solicitud confirmada (foto del contenido en JSON).
 *   bandejaRevision_()   → sin asignar, mías, de otros revisores, devueltas y en CH.
 *   tomar_ / liberar_ / reasignar_ → bandeja común: un revisor la toma; un administrador reasigna.
 *   observaciones        → por apartado o actividad: ABIERTA → ATENDIDA (colaborador) → CERRADA (revisor).
 *   devolver_ / noProcedente_ / darVoBo_ → las tres salidas de la revisión.
 *
 *   editarComoRevisor_()  → Procesos corrige el contenido (decisión 26); queda registrado como CAMBIO.
 *   cambiarCodigo_()      → Procesos corrige el código después del Vo.Bo. (decisión 28).
 *
 * Reglas: nadie revisa lo que él mismo elaboró; solo el revisor asignado observa, corrige y decide; el
 * Vo.Bo. exige que no haya observaciones abiertas y que el contenido sea el confirmado por el colaborador
 * o el que dejó Procesos al corregirlo; asigna el código (el sistema propone el siguiente libre y Procesos
 * puede corregirlo) y la versión. No procedente no consume código (§2.1). Cada salida avisa por correo
 * (services/Avisos.gs). Lo puro está probado en tests/revision.test.js.
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

/**
 * ¿El contenido (su huella) es uno que se puede autorizar? El que confirmó el colaborador o el que dejó
 * Procesos al corregirlo durante la revisión (HUELLA_REVISOR, decisión 26).
 */
function contenidoAprobado_(fila, huella) {
  const h = String(huella || '');
  return !!h && (h === String(fila.HUELLA_CONFIRMADA || '') || h === String(fila.HUELLA_REVISOR || ''));
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
      return { numero: i + 1, id: a.id, responsable: a.responsable, texto: a.texto, enlaces: a.enlaces || [],
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
  avisar_(sesion, 'NUEVA_REVISION', Object.assign({}, fila, plan.cambios), correosProcesos_());
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
  conCandado_(20000, function () {
    const fila = filaSolicitud_(idSolicitud);
    const e = planTomar_(fila, sesion, leerTabla_('Usuarios'));
    if (e.length) throw new Error(e.join(' '));
    actualizarFila_('Solicitudes', fila._fila, { REVISOR_ASIGNADO_ID: sesion.idUsuario });
  });
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
  if (obs.ESTADO === 'CAMBIO') { plan.errores.push('Es una corrección que hizo Procesos: no hay que atenderla.'); return plan; }
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
  const det = detalleSolicitud_(fila, leerTabla_('Actividades'), leerTabla_('Imagenes'), tablasSolicitud_(), { editar: false }, formatoFecha_);
  avisar_(sesion, 'DEVUELTA', Object.assign({}, fila, {
    observaciones: observacionesDe_(observaciones, idSolicitud, det, formatoFecha_).filter(function (o) { return o.estado === 'ABIERTA'; })
  }), [correoDeUsuario_(fila.ELABORO_ID)]);
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
  avisar_(sesion, 'NO_PROCEDENTE', Object.assign({}, fila, { MOTIVO_CIERRE: texto }), [correoDeUsuario_(fila.ELABORO_ID)]);
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

/**
 * Qué cambia con el Vo.Bo. (sin tocar Google). actualizacion (solo actualizaciones): { tipoCambio
 * (MAYOR / MENOR, lo decide Procesos), versionVigente }.
 */
function planVoBo_(fila, sesion, det, huellaActual, observaciones, codigo, usados, puestoRevisor, ahora, actualizacion) {
  const plan = { errores: [], cambios: {}, cerrarObservaciones: [], codigo: '' };
  const e = plan.errores;
  if (!esRevisorAsignado_(sesion, fila) || fila.ESTADO !== ESTADOS.EN_REVISION) { e.push('Solo el revisor asignado da el Vo.Bo., mientras está en revisión.'); return plan; }
  if (!contenidoAprobado_(fila, huellaActual)) e.push('El contenido no es el que confirmó el colaborador. Devuélvela para que lo revise y confirme.');
  const propias = observaciones.filter(function (o) { return o.ID_SOLICITUD === fila.ID_SOLICITUD; });
  const abiertas = propias.filter(function (o) { return o.ESTADO === 'ABIERTA'; }).length;
  if (abiertas) e.push('Hay ' + abiertas + (abiertas === 1 ? ' observación abierta' : ' observaciones abiertas') + ': devuélvela o ciérralas antes del Vo.Bo.');
  // Un documento nuevo recibe código en su primer Vo.Bo.; si ya lo tiene (CH lo rechazó y volvió), lo
  // conserva, igual que las actualizaciones (fase 7).
  const nuevo = fila.TIPO_SOLICITUD === TIPOS_SOLICITUD.NUEVO;
  const asigna = codigoEditable_(fila);
  plan.codigo = asigna ? String(codigo || '').trim().toUpperCase() : String(fila.CODIGO || '');
  if (asigna) validarCodigo_(plan.codigo, det.prefijo, det.cuerpo, usados).forEach(function (x) { e.push(x); });
  // Una actualización: Procesos decide si es mayor o menor (respuesta 5) y el control de cambios va completo.
  const a = actualizacion || {};
  if (!nuevo) {
    if (!TIPOS_CAMBIO[a.tipoCambio]) e.push('Elige si es una actualización mayor o menor.');
    if (!listaJson_(fila.MOTIVOS_CAMBIO).length || !String(fila.DESCRIPCION_CAMBIO || '').trim()) {
      e.push('Falta el control de cambios (motivo y descripción): complétalo o devuélvela al colaborador.');
    }
  }
  if (e.length) return plan;
  plan.cambios = { ESTADO: ESTADOS.EN_AUTORIZACION_CH, CODIGO: plan.codigo, VERSION: nuevo ? '0.0' : siguienteVersion_(a.versionVigente, a.tipoCambio),
    REVISO_ID: sesion.idUsuario, REVISO_NOMBRE: sesion.nombre, REVISO_PUESTO: puestoRevisor, FECHA_REVISION: ahora, FECHA_ACTUALIZACION: ahora };
  if (!nuevo) plan.cambios.TIPO_CAMBIO = a.tipoCambio;
  plan.cerrarObservaciones = propias.filter(function (o) { return o.ESTADO === 'ATENDIDA'; }).map(function (o) { return o._fila; });
  return plan;
}

/** ¿El revisor asigna el código en este Vo.Bo.? Solo un documento nuevo que todavía no tiene. */
function codigoEditable_(fila) {
  return fila.TIPO_SOLICITUD === TIPOS_SOLICITUD.NUEVO && !String(fila.CODIGO || '').trim();
}

/** Lo que el revisor necesita para dar el Vo.Bo.: el código propuesto. */
function propuestaCodigo_(fila, det) {
  if (!codigoEditable_(fila)) return String(fila.CODIGO || '');
  const serie = leerTabla_('Consecutivos').filter(function (c) { return c.SERIE === 'COD-' + det.prefijo + '-' + det.cuerpo; })[0];
  return siguienteCodigo_(det.prefijo, det.cuerpo, codigosUsados_(leerTabla_('Solicitudes'), leerTabla_('Documentos'), fila.ID_SOLICITUD), serie ? serie.ULTIMO : 0);
}

function darVoBo_(sesion, idSolicitud, codigo, tipoCambio) {
  const t = tablasSolicitud_();
  const puesto = puestoDeUsuario_(sesion.idUsuario, t.usuarios, t.puestos);
  let fila, det, huella, plan;
  conCandado_(20000, function () {
    fila = filaSolicitud_(idSolicitud);
    det = detalleSolicitud_(fila, leerTabla_('Actividades'), leerTabla_('Imagenes'), t, { editar: false }, formatoFecha_);
    huella = huellaDeDetalle_(det);
    const usados = codigosUsados_(leerTabla_('Solicitudes'), leerTabla_('Documentos'), idSolicitud);
    const doc = leerTabla_('Documentos').filter(function (x) { return x.ID_DOCUMENTO === fila.ID_DOCUMENTO; })[0];
    plan = planVoBo_(fila, sesion, det, huella, leerTabla_('Observaciones'), codigo, usados, puesto, marcaDeTiempo_(new Date()),
      { tipoCambio: String(tipoCambio || ''), versionVigente: doc ? String(doc.VERSION_VIGENTE || '') : '' });
    if (plan.errores.length) throw new Error(plan.errores.join(' '));
    actualizarFila_('Solicitudes', fila._fila, plan.cambios);
    plan.cerrarObservaciones.forEach(function (f) { actualizarFila_('Observaciones', f, { ESTADO: 'CERRADA' }); });
    // El consecutivo de la serie avanza hasta el número usado (si Procesos eligió otro, se respeta).
    const serie = 'COD-' + det.prefijo + '-' + det.cuerpo;
    const numero = Number(plan.codigo.split('-').pop()) || 0;
    const actual = leerTabla_('Consecutivos').filter(function (c) { return c.SERIE === serie; })[0];
    if (!actual) agregarFila_('Consecutivos', { SERIE: serie, ULTIMO: String(numero), FECHA_ACTUALIZACION: new Date() });
    else if (numero > Number(actual.ULTIMO)) actualizarFila_('Consecutivos', actual._fila, { ULTIMO: String(numero), FECHA_ACTUALIZACION: new Date() });
  });
  det.codigo = plan.codigo;
  det.version = plan.cambios.VERSION;
  guardarInstantanea_(sesion, fila, det, fila.REVISION, 'VOBO', huella);
  registrarBitacora_(sesion, 'VOBO_PROCESOS', 'Código ' + plan.codigo + ', versión ' + plan.cambios.VERSION + '.', idSolicitud, fila.ESTADO, ESTADOS.EN_AUTORIZACION_CH);
  avisar_(sesion, 'VOBO', Object.assign({}, fila, plan.cambios), [correoDeUsuario_(fila.ELABORO_ID)]);
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
  det.puestosYResponsabilidades = puestosYResponsabilidades_(det);
  det.huella = huellaDeDetalle_(det);
  det.revision = String(fila.REVISION || '');
  det.motivoCierre = String(fila.MOTIVO_CIERRE || '');
  det.observaciones = observacionesDe_(leerTabla_('Observaciones'), idSolicitud, det, formatoFecha_);
  const asignado = t.usuarios.filter(function (u) { return u.ID_USUARIO === fila.REVISOR_ASIGNADO_ID; })[0];
  det.revisor = asignado ? String(asignado.NOMBRE) : '';
  det.esSuya = fila.ELABORO_ID === sesion.idUsuario;
  det.codigoEditable = codigoEditable_(fila);
  det.enviada = marcaDe_(fila.FECHA_ENVIO_REVISION) ? formatoFecha_(new Date(marcaDe_(fila.FECHA_ENVIO_REVISION))) : '';
  det.esRevisorAsignado = esRevisorAsignado_(sesion, fila);
  det.puedeTomar = !planTomar_(fila, sesion, t.usuarios).length && fila.REVISOR_ASIGNADO_ID !== sesion.idUsuario;
  det.puedeDecidir = det.esRevisorAsignado && fila.ESTADO === ESTADOS.EN_REVISION;
  det.contenidoConfirmado = contenidoAprobado_(fila, det.huella);
  det.corregidoPorProcesos = !!String(fila.HUELLA_REVISOR || '') && det.huella === String(fila.HUELLA_REVISOR);
  det.codigoPropuesto = det.puedeDecidir ? propuestaCodigo_(fila, det) : '';
  det.apartados = {};
  Object.keys(APARTADOS_OBSERVACION).forEach(function (k) { if (APARTADOS_RETIRADOS.indexOf(k) === -1) det.apartados[k] = APARTADOS_OBSERVACION[k]; });
  det.archivos = archivosSolicitud_(leerTabla_('Archivos'), idSolicitud, det.huella, formatoFecha_);
  det.puedeGenerar = puedeGenerarPreliminar_(sesion, fila);
  // Actualización (fase 7): versión vigente, control de cambios y las versiones que siguen.
  det.actualizacion = datosActualizacion_(fila, det, leerTabla_('Documentos'), leerTabla_('Actividades'));
  if (det.actualizacion) {
    det.actualizacion.versiones = { MAYOR: siguienteVersion_(det.actualizacion.versionVigente, TIPOS_CAMBIO.MAYOR),
      MENOR: siguienteVersion_(det.actualizacion.versionVigente, TIPOS_CAMBIO.MENOR) };
  }
  // Después del Vo.Bo. Procesos todavía puede corregir el código (decisión 28).
  det.puedeCambiarCodigo = puedeOperarCH_(sesion, fila) && [ESTADOS.EN_AUTORIZACION_CH, ESTADOS.AUTORIZADO].indexOf(fila.ESTADO) !== -1;
  return det;
}

// ─────────────────────────────── Correcciones de Procesos ───────────────────────────────

/**
 * Qué cambia cuando Procesos corrige el contenido (sin tocar Google). datos: { apartado, idActividad,
 * valor, responsable }. Se puede corregir el objetivo, el alcance, el inicio, el fin, las responsabilidades
 * (apartado PUESTOS), las definiciones y el texto y el responsable de una actividad.
 * Devuelve { errores, solicitud: {COLUMNA: valor}, actividad: { _fila, cambios } | null, antes, despues, sinCambios }.
 */
function planEdicionRevisor_(datos, fila, det, actividades, sesion, puestos) {
  const plan = { errores: [], solicitud: {}, actividad: null, antes: '', despues: '', sinCambios: false };
  const e = plan.errores;
  if (!esRevisorAsignado_(sesion, fila) || fila.ESTADO !== ESTADOS.EN_REVISION) {
    e.push('Para corregir el contenido primero toma la solicitud (y debe estar en revisión).');
    return plan;
  }
  const L = LIMITES_CAPTURA;
  const limpio = function (v) { return String(v === null || v === undefined ? '' : v).replace(/\r\n/g, '\n').trim(); };
  const apartado = String(datos.apartado || '');
  const textos = { OBJETIVO: ['OBJETIVO', 'objetivo', L.DERIVADO_MAX], ALCANCE: ['ALCANCE', 'alcance', L.DERIVADO_MAX],
    INICIO: ['INICIO_PROCESO', 'inicio', L.PREGUNTA_MAX], FIN: ['FIN_PROCESO', 'fin', L.PREGUNTA_MAX] };
  if (textos[apartado]) {
    const valor = limpio(datos.valor);
    if (!valor) e.push('No puede quedar vacío.');
    if (valor.length > textos[apartado][2]) e.push('Pasa de ' + textos[apartado][2] + ' caracteres.');
    plan.antes = det[textos[apartado][1]];
    plan.despues = valor;
    if (!e.length && valor !== plan.antes) plan.solicitud[textos[apartado][0]] = valor;
  } else if (apartado === 'PUESTOS' || apartado === 'DEFINICIONES') {
    let lineas = renglones_(datos.valor);
    // En «Puestos y responsabilidades» un renglón que solo es el puesto de una actividad no es una responsabilidad.
    if (apartado === 'PUESTOS') {
      const deActividades = puestosInvolucrados_(det).map(normalizar_);
      lineas = lineas.filter(function (l) {
        return l.indexOf(':') !== -1 ? !/:\s*$/.test(l) : deActividades.indexOf(normalizar_(l)) === -1;
      });
    }
    if (lineas.length > L.LINEAS_MAX || lineas.some(function (x) { return x.length > L.LINEA_MAX; })) {
      e.push('Máximo ' + L.LINEAS_MAX + ' renglones de hasta ' + L.LINEA_MAX + ' caracteres.');
    }
    const columna = apartado === 'PUESTOS' ? 'RESPONSABILIDADES' : 'DEFINICIONES';
    const actual = apartado === 'PUESTOS' ? det.responsabilidades : det.definiciones;
    plan.antes = actual.join('\n');
    plan.despues = lineas.join('\n');
    if (!e.length && JSON.stringify(lineas) !== JSON.stringify(actual)) plan.solicitud[columna] = JSON.stringify(lineas);
  } else if (apartado === 'ACTIVIDAD') {
    const i = det.actividades.map(function (a) { return a.id; }).indexOf(String(datos.idActividad || ''));
    const renglon = actividades.filter(function (a) { return a.ID_ACTIVIDAD === datos.idActividad && a.ID_SOLICITUD === fila.ID_SOLICITUD && !esActivo_(a.ELIMINADA); })[0];
    if (i === -1 || !renglon) { e.push('Esa actividad ya no existe.'); return plan; }
    const actual = det.actividades[i];
    const texto = limpio(datos.valor);
    const responsable = limpio(datos.responsable).replace(/\s+/g, ' ');
    if (!texto) e.push('La actividad no puede quedar vacía.');
    if (texto.length > L.ACTIVIDAD_MAX) e.push('La actividad pasa de ' + L.ACTIVIDAD_MAX + ' caracteres.');
    if (responsable.length > L.RESPONSABLE_MAX) e.push('El puesto es demasiado largo.');
    if (e.length) return plan;
    const cambios = {};
    // El texto del colaborador (TEXTO_ORIGINAL) se conserva; el del documento es TEXTO_FINAL.
    if (texto !== actual.texto) cambios.TEXTO_FINAL = texto;
    if (responsable !== actual.responsable) Object.assign(cambios, cambiosResponsable_(responsable, puestos));
    if (Object.keys(cambios).length) plan.actividad = { _fila: renglon._fila, cambios: cambios };
    const linea = function (t, r) { return 'Actividad ' + (i + 1) + (r ? ' · ' + r : '') + ': ' + t; };
    plan.antes = linea(actual.texto, actual.responsable);
    plan.despues = linea(texto, responsable);
  } else {
    e.push('Esa parte del documento no se puede corregir aquí.');
  }
  plan.sinCambios = !e.length && !Object.keys(plan.solicitud).length && !plan.actividad;
  return plan;
}

/** Texto del registro de una corrección de Procesos (lo ve el colaborador junto a esa parte). */
function textoCorreccion_(antes, despues) {
  const corto = function (t) { const x = String(t || '').trim(); return x.length > 900 ? x.slice(0, 900) + '…' : (x || '(vacío)'); };
  return 'Antes: ' + corto(antes) + '\nAhora: ' + corto(despues);
}

/** Procesos corrige una parte del contenido mientras revisa (decisión 26). */
function editarComoRevisor_(sesion, idSolicitud, datos) {
  const d = datos || {};
  const fila = filaSolicitud_(idSolicitud);
  const actividades = leerTabla_('Actividades');
  const det = detalleSolicitud_(fila, actividades, leerTabla_('Imagenes'), tablasSolicitud_(), { editar: false }, formatoFecha_);
  const plan = planEdicionRevisor_(d, fila, det, actividades, sesion, leerTabla_('Puestos'));
  if (plan.errores.length) throw new Error(plan.errores.join(' '));
  if (plan.sinCambios) return { sinCambios: true };
  if (plan.actividad) actualizarFila_('Actividades', plan.actividad._fila, Object.assign({ FECHA_ACTUALIZACION: new Date() }, plan.actividad.cambios));
  const r = aplicarCambioContenido_(sesion, fila, plan.solicitud, 'Procesos corrigió el contenido', null, { revisor: true });
  const apartado = String(d.apartado);
  agregarFila_('Observaciones', { ID_OBSERVACION: siguienteId_('OBS', 6), ID_SOLICITUD: idSolicitud, REVISION: String(fila.REVISION || ''),
    APARTADO: apartado, ID_ACTIVIDAD: apartado === 'ACTIVIDAD' ? String(d.idActividad) : '', AUTOR_ID: sesion.idUsuario,
    AUTOR_NOMBRE: sesion.nombre, PERFIL: 'REVISOR', TEXTO: textoCorreccion_(plan.antes, plan.despues), ESTADO: 'CAMBIO',
    RESPUESTA: '', FECHA: new Date(), FECHA_ATENCION: '' });
  registrarBitacora_(sesion, 'EDITAR_REVISOR', (APARTADOS_OBSERVACION[apartado] || apartado) + ': ' + textoCorreccion_(plan.antes, plan.despues).slice(0, 400), idSolicitud);
  return { marca: r.marca };
}

// ─────────────────────────────── Corregir el código ───────────────────────────────

/** Qué cambia al corregir el código después del Vo.Bo. (sin tocar Google). */
function planCambioCodigo_(fila, sesion, det, codigo, usados) {
  const plan = { errores: [], codigo: String(codigo || '').trim().toUpperCase() };
  if (!puedeOperarCH_(sesion, fila)) plan.errores.push('El código lo corrige Procesos (y nunca de una solicitud que elaboró).');
  else if ([ESTADOS.EN_AUTORIZACION_CH, ESTADOS.AUTORIZADO].indexOf(fila.ESTADO) === -1) plan.errores.push('El código se corrige después del Vo.Bo.; antes, en el Vo.Bo. mismo.');
  else if (plan.codigo === String(fila.CODIGO || '').toUpperCase()) plan.errores.push('Es el mismo código.');
  else validarCodigo_(plan.codigo, det.prefijo, det.cuerpo, usados).forEach(function (x) { plan.errores.push(x); });
  return plan;
}

function cambiarCodigo_(sesion, idSolicitud, codigo) {
  let fila, plan, hayFinal;
  conCandado_(20000, function () {
    fila = filaSolicitud_(idSolicitud);
    const det = detalleSolicitud_(fila, leerTabla_('Actividades'), leerTabla_('Imagenes'), tablasSolicitud_(), { editar: false }, formatoFecha_);
    plan = planCambioCodigo_(fila, sesion, det, codigo, codigosUsados_(leerTabla_('Solicitudes'), leerTabla_('Documentos'), idSolicitud));
    if (plan.errores.length) throw new Error(plan.errores.join(' '));
    actualizarFila_('Solicitudes', fila._fila, { CODIGO: plan.codigo, FECHA_ACTUALIZACION: marcaDeTiempo_(new Date()) });
    const doc = leerTabla_('Documentos').filter(function (x) { return x.ID_SOLICITUD_VIGENTE === idSolicitud; })[0];
    if (doc) actualizarFila_('Documentos', doc._fila, { CODIGO: plan.codigo });
    // El consecutivo de la serie avanza hasta el número usado (como en el Vo.Bo.).
    const serie = 'COD-' + det.prefijo + '-' + det.cuerpo;
    const numero = Number(plan.codigo.split('-').pop()) || 0;
    const actual = leerTabla_('Consecutivos').filter(function (c) { return c.SERIE === serie; })[0];
    if (!actual) agregarFila_('Consecutivos', { SERIE: serie, ULTIMO: String(numero), FECHA_ACTUALIZACION: new Date() });
    else if (numero > Number(actual.ULTIMO)) actualizarFila_('Consecutivos', actual._fila, { ULTIMO: String(numero), FECHA_ACTUALIZACION: new Date() });
    hayFinal = leerTabla_('Archivos').some(function (a) { return a.ID_SOLICITUD === idSolicitud && a.TIPO === 'FINAL'; });
  });
  registrarBitacora_(sesion, 'CAMBIAR_CODIGO', 'De ' + (fila.CODIGO || '(sin código)') + ' a ' + plan.codigo + '.', idSolicitud);
  return { codigo: plan.codigo, regenerar: hayFinal || fila.ESTADO === ESTADOS.EN_AUTORIZACION_CH };
}
