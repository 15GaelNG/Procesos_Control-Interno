/**
 * AUTORIZACIÓN EN CH (fase 6; requerimiento §4.4 y decisiones 10, 14, 15 y 24).
 *
 * No hay conexión con el sistema CH: Procesos sube ahí los archivos con «COPIA NO AUTORIZADA» y
 * registra aquí lo que pasó.
 *   enviosCH_()             → la pantalla «Envíos a CH»: por subir, en CH y resueltas.
 *   registrarEnvioCH_()     → «Ya lo subí a CH» (fecha y, si CH da uno, su folio).
 *   registrarResultadoCH_() → AUTORIZADO: quién autorizó, su puesto y la fecha, como vienen en CH. La
 *                             solicitud queda autorizada, entra al inventario documental y a su historial,
 *                             y se genera el final sin marca (Documentos.gs → generarFinal_).
 *                             RECHAZADO: con el motivo de CH, regresa al colaborador como observación y
 *                             vuelve a pasar por Procesos, con el mismo código (pregunta D, provisional).
 *
 * Lo registra cualquier revisor de Procesos, nunca de una solicitud que elaboró (decisión 19).
 * Lo puro está probado en tests/autorizacion-ch.test.js.
 */

// ─────────────────────────────── Reglas ───────────────────────────────

function puedeOperarCH_(sesion, fila) {
  return !!sesion && !!sesion.registrado && sesion.perfiles.indexOf('REVISOR') !== -1 && fila.ELABORO_ID !== sesion.idUsuario;
}

/** El envío a CH que espera resultado (a lo más uno por solicitud). */
function envioPendiente_(envios, idSolicitud) {
  return envios.filter(function (e) { return e.ID_SOLICITUD === idSolicitud && e.RESULTADO === 'PENDIENTE'; })[0] || null;
}

/** Los preliminares que van a CH: generados después del Vo.Bo. (ya llevan código y «Revisó») y del contenido confirmado. */
function archivosParaCH_(archivos, fila) {
  const vobo = marcaDe_(fila.FECHA_REVISION);
  return ultimosPorFormato_(archivos.filter(function (a) {
    return a.ID_SOLICITUD === fila.ID_SOLICITUD && a.TIPO === 'PRELIMINAR' && vobo && marcaDe_(a.FECHA) >= vobo &&
      contenidoAprobado_(fila, a.HUELLA_CONTENIDO);
  }));
}

/** El documento final más reciente (PDF y Word) de una solicitud. */
function archivosFinales_(archivos, idSolicitud) {
  return ultimosPorFormato_(archivos.filter(function (a) { return a.ID_SOLICITUD === idSolicitud && a.TIPO === 'FINAL'; }));
}

/** De cada formato, el más reciente; PDF primero. */
function ultimosPorFormato_(archivos) {
  const vistos = {};
  return archivos.slice().sort(function (a, b) { return marcaDe_(b.FECHA) - marcaDe_(a.FECHA); })
    .filter(function (a) { if (vistos[a.FORMATO]) return false; vistos[a.FORMATO] = true; return true; })
    .sort(function (a, b) { return String(b.FORMATO).localeCompare(String(a.FORMATO)); });
}

/** Una fecha escrita en pantalla: obligatoria, válida, no futura y no antes de `desde` (si viene). */
function validarFecha_(texto, etiqueta, hoy, desde, etiquetaDesde) {
  const f = fechaDeTexto_(texto);
  if (!f) return { error: 'Escribe la fecha de ' + etiqueta + '.' };
  if (numeroDeDia_(f) > numeroDeDia_(hoy)) return { error: 'La fecha de ' + etiqueta + ' no puede ser futura.' };
  if (desde && numeroDeDia_(f) < numeroDeDia_(desde)) return { error: 'La fecha de ' + etiqueta + ' no puede ser anterior ' + etiquetaDesde + '.' };
  return { fecha: f };
}

// ─────────────────────────────── Subido a CH ───────────────────────────────

/** «Ya lo subí a CH» (sin tocar Google). datos: { fecha: 'yyyy-mm-dd', folio }. */
function planEnvioCH_(fila, sesion, envios, datos, ahora, quien) {
  const plan = { errores: [], fila: null };
  const e = plan.errores;
  if (!puedeOperarCH_(sesion, fila)) { e.push('Solo Procesos registra los envíos a CH (y nunca de una solicitud que elaboró).'); return plan; }
  if (fila.ESTADO !== ESTADOS.EN_AUTORIZACION_CH) { e.push('Solo se suben a CH las solicitudes con Vo.Bo. de Procesos.'); return plan; }
  if (envioPendiente_(envios, fila.ID_SOLICITUD)) { e.push('Ya está registrada como subida a CH: falta registrar su resultado.'); return plan; }
  const vobo = marcaDe_(fila.FECHA_REVISION) ? new Date(marcaDe_(fila.FECHA_REVISION)) : null;
  const f = validarFecha_(datos && datos.fecha, 'envío', ahora, vobo, 'al Vo.Bo. de Procesos');
  if (f.error) e.push(f.error);
  const folio = String((datos && datos.folio) || '').replace(/\s+/g, ' ').trim();
  if (folio.length > 60) e.push('El folio de CH pasa de 60 caracteres.');
  if (e.length) return plan;
  plan.fila = { ID_SOLICITUD: fila.ID_SOLICITUD, REVISION: String(fila.REVISION || ''), FECHA_ENVIO: f.fecha, ENVIADO_POR: quien,
    FOLIO_CH: folio, RESULTADO: 'PENDIENTE', AUTORIZO_NOMBRE: '', AUTORIZO_PUESTO: '', FECHA_AUTORIZACION: '', COMENTARIO: '',
    REGISTRADO_POR: '', FECHA_REGISTRO: '' };
  return plan;
}

function registrarEnvioCH_(sesion, idSolicitud, datos) {
  let plan;
  conCandado_(20000, function () {
    const fila = filaSolicitud_(idSolicitud);
    plan = planEnvioCH_(fila, sesion, leerTabla_('EnviosCH'), datos, new Date(), correoReal_(sesion));
    if (plan.errores.length) throw new Error(plan.errores.join(' '));
    agregarFila_('EnviosCH', Object.assign({ ID_ENVIO: siguienteId_('ENV', 6) }, plan.fila));
  });
  registrarBitacora_(sesion, 'ENVIO_CH', 'Subida a CH' + (plan.fila.FOLIO_CH ? ' con folio ' + plan.fila.FOLIO_CH : '') + '.', idSolicitud);
  return { ok: true };
}

// ─────────────────────────────── Resultado de CH ───────────────────────────────

/**
 * Lo que cambia con el resultado de CH (sin tocar Google).
 * datos: { resultado: 'AUTORIZADO' | 'RECHAZADO', nombre, puesto, fecha: 'yyyy-mm-dd', comentario }.
 * Devuelve los cambios de la solicitud y del envío; con AUTORIZADO, el renglón del inventario y el de
 * su historial; con RECHAZADO, la observación para el colaborador.
 */
function planResultadoCH_(fila, sesion, envio, datos, ahora, quien) {
  const plan = { errores: [], solicitud: {}, envio: {}, documento: null, documentoCambios: null, historial: null, observacion: null };
  const e = plan.errores;
  const d = datos || {};
  if (!puedeOperarCH_(sesion, fila)) { e.push('Solo Procesos registra el resultado de CH (y nunca de una solicitud que elaboró).'); return plan; }
  if (fila.ESTADO !== ESTADOS.EN_AUTORIZACION_CH) { e.push('Esta solicitud no está en autorización en CH.'); return plan; }
  if (!envio) { e.push('Primero registra que la subiste a CH.'); return plan; }
  const texto = function (v) { return String(v || '').replace(/\s+/g, ' ').trim(); };
  const comentario = String(d.comentario || '').replace(/\r\n/g, '\n').trim();
  const registro = { REGISTRADO_POR: quien, FECHA_REGISTRO: ahora };

  if (d.resultado === 'AUTORIZADO') {
    const nombre = texto(d.nombre);
    const puesto = texto(d.puesto);
    if (!nombre) e.push('Escribe quién autorizó en CH (el autorizador final).');
    if (!puesto) e.push('Escribe el puesto de quien autorizó.');
    if (nombre.length > 120 || puesto.length > 120) e.push('El nombre y el puesto no pueden pasar de 120 caracteres.');
    const f = validarFecha_(d.fecha, 'autorización', ahora, new Date(marcaDe_(envio.FECHA_ENVIO)), 'al envío a CH');
    if (f.error) e.push(f.error);
    if (comentario.length > OBSERVACION_MAX) e.push('El comentario pasa de ' + OBSERVACION_MAX + ' caracteres.');
    if (e.length) return plan;
    const version = String(fila.VERSION || '').trim() || '0.0';
    plan.solicitud = { ESTADO: ESTADOS.AUTORIZADO, AUTORIZO_NOMBRE: nombre, AUTORIZO_PUESTO: puesto, FECHA_AUTORIZACION: f.fecha,
      VERSION: version, FECHA_ACTUALIZACION: ahora };
    plan.envio = Object.assign({ RESULTADO: 'AUTORIZADO', AUTORIZO_NOMBRE: nombre, AUTORIZO_PUESTO: puesto, FECHA_AUTORIZACION: f.fecha,
      COMENTARIO: comentario }, registro);
    if (fila.TIPO_SOLICITUD === TIPOS_SOLICITUD.ACTUALIZACION) {
      // Una actualización: el mismo renglón del inventario pasa a la versión nueva (hasta aquí no cambió).
      plan.documentoCambios = { NOMBRE: String(fila.NOMBRE_DOCUMENTO), VERSION_VIGENTE: version, FECHA_VIGENCIA: f.fecha,
        ID_SOLICITUD_VIGENTE: fila.ID_SOLICITUD, ID_ARCHIVO_WORD: '', ID_ARCHIVO_PDF: '', CONTENIDO_ESTRUCTURADO: 'SI' };
    } else {
      plan.documento = { CODIGO: String(fila.CODIGO), NOMBRE: String(fila.NOMBRE_DOCUMENTO), ID_TIPO: fila.ID_TIPO,
        ID_DEPARTAMENTO: fila.ID_DEPARTAMENTO, ID_AREA: fila.ID_AREA, ID_SUBAREA: String(fila.ID_SUBAREA || ''),
        VERSION_VIGENTE: version, FECHA_VIGENCIA: f.fecha, ESTATUS: ESTATUS_DOCUMENTO.VIGENTE, ID_SOLICITUD_VIGENTE: fila.ID_SOLICITUD,
        ID_ARCHIVO_WORD: '', ID_ARCHIVO_PDF: '', CONTENIDO_ESTRUCTURADO: 'SI', ORIGEN: ORIGENES_DOCUMENTO.SISTEMA, FECHA_REGISTRO: ahora };
    }
    // El historial oficial de versiones (§4.2): la emisión inicial o la actualización, con quien autorizó.
    const motivos = listaJson_(fila.MOTIVOS_CAMBIO).map(function (m) { return MOTIVOS_CAMBIO[m] || m; }).join('; ');
    plan.historial = { VERSION: version, FECHA: f.fecha, MOTIVOS: motivos,
      DESCRIPCION: plan.documentoCambios ? String(fila.DESCRIPCION_CAMBIO || '') : 'Emisión inicial del documento.',
      RESPONSABLE: String(fila.ELABORO_NOMBRE || ''), AUTORIZO_NOMBRE: nombre, AUTORIZO_PUESTO: puesto, ID_SOLICITUD: fila.ID_SOLICITUD };
    return plan;
  }

  if (d.resultado === 'RECHAZADO') {
    const prefijo = 'Rechazado en el sistema CH: ';
    if (!comentario) e.push('Escribe el motivo del rechazo: el colaborador lo verá como observación.');
    if ((prefijo + comentario).length > OBSERVACION_MAX) e.push('El motivo es demasiado largo.');
    if (e.length) return plan;
    // Regresa al colaborador; el Vo.Bo. de Procesos ya no vale (se vuelve a dar), pero el código se conserva.
    plan.solicitud = { ESTADO: ESTADOS.DEVUELTO, REVISO_ID: '', REVISO_NOMBRE: '', REVISO_PUESTO: '', FECHA_REVISION: '', FECHA_ACTUALIZACION: ahora };
    plan.envio = Object.assign({ RESULTADO: 'RECHAZADO', COMENTARIO: comentario }, registro);
    plan.observacion = { ID_SOLICITUD: fila.ID_SOLICITUD, REVISION: String(fila.REVISION || ''), APARTADO: 'GENERAL', ID_ACTIVIDAD: '',
      AUTOR_ID: sesion.idUsuario, AUTOR_NOMBRE: sesion.nombre, PERFIL: 'REVISOR', TEXTO: prefijo + comentario, ESTADO: 'ABIERTA',
      RESPUESTA: '', FECHA: ahora, FECHA_ATENCION: '' };
    return plan;
  }

  e.push('Elige si CH lo autorizó o lo rechazó.');
  return plan;
}

function registrarResultadoCH_(sesion, idSolicitud, datos) {
  let fila, plan;
  conCandado_(20000, function () {
    fila = filaSolicitud_(idSolicitud);
    const envios = leerTabla_('EnviosCH');
    const envio = envioPendiente_(envios, idSolicitud);
    plan = planResultadoCH_(fila, sesion, envio, datos, marcaDeTiempo_(new Date()), correoReal_(sesion));
    if (plan.errores.length) throw new Error(plan.errores.join(' '));
    if (plan.solicitud.ESTADO === ESTADOS.AUTORIZADO) {
      const det = detalleSolicitud_(fila, leerTabla_('Actividades'), leerTabla_('Imagenes'), tablasSolicitud_(), { editar: false }, formatoFecha_);
      if (!contenidoAprobado_(fila, huellaDeDetalle_(det))) throw new Error('El contenido no es el que se confirmó: revisa la solicitud antes de registrar la autorización.');
      let idDocumento = fila.ID_DOCUMENTO;
      if (plan.documentoCambios) {
        const doc = leerTabla_('Documentos').filter(function (x) { return x.ID_DOCUMENTO === fila.ID_DOCUMENTO; })[0];
        if (!doc) throw new Error('No está en el inventario el documento que se actualiza (' + fila.ID_DOCUMENTO + ').');
        actualizarFila_('Documentos', doc._fila, plan.documentoCambios);
      } else {
        idDocumento = siguienteId_('DOC', 4);
        agregarFila_('Documentos', Object.assign({ ID_DOCUMENTO: idDocumento }, plan.documento));
      }
      agregarFila_('HistorialCambios', Object.assign({ ID_CAMBIO: siguienteId_('CAM', 6), ID_DOCUMENTO: idDocumento }, plan.historial));
      plan.solicitud.ID_DOCUMENTO = idDocumento;
    } else {
      agregarFila_('Observaciones', Object.assign({ ID_OBSERVACION: siguienteId_('OBS', 6) }, plan.observacion));
    }
    actualizarFila_('EnviosCH', envio._fila, plan.envio);
    actualizarFila_('Solicitudes', fila._fila, plan.solicitud);
  });
  const autorizado = plan.solicitud.ESTADO === ESTADOS.AUTORIZADO;
  registrarBitacora_(sesion, autorizado ? 'AUTORIZADO_CH' : 'RECHAZADO_CH',
    autorizado ? 'Autorizó ' + plan.envio.AUTORIZO_NOMBRE + ' (' + plan.envio.AUTORIZO_PUESTO + '). Versión ' + plan.solicitud.VERSION + '.'
      : plan.envio.COMENTARIO, idSolicitud, fila.ESTADO, plan.solicitud.ESTADO);
  avisar_(sesion, autorizado ? 'AUTORIZADA' : 'RECHAZADA_CH', Object.assign({}, fila, plan.solicitud,
    { AUTORIZO_NOMBRE: plan.envio.AUTORIZO_NOMBRE, COMENTARIO_CH: plan.envio.COMENTARIO }), [correoDeUsuario_(fila.ELABORO_ID)]);
  return { estado: plan.solicitud.ESTADO };
}

// ─────────────────────────────── Pantalla «Envíos a CH» ───────────────────────────────

/**
 * Las solicitudes con Vo.Bo. agrupadas (sin tocar Google): porSubir (sin envío pendiente), enCH (subidas,
 * esperando resultado) y resueltas (los últimos resultados registrados, el más reciente primero).
 */
function enviosCH_(filas, envios, archivos, t, sesion, formatos, ahora, maxResueltas) {
  const nombreDe = function (lista, campo, id) { const x = lista.filter(function (r) { return r[campo] === id; })[0]; return x ? String(x.NOMBRE) : ''; };
  const dia = function (v) { return marcaDe_(v) ? formatos.dia(new Date(marcaDe_(v))) : ''; };
  const iso = function (v) { return marcaDe_(v) ? formatos.iso(new Date(marcaDe_(v))) : ''; };
  const resumen = function (a) {
    return { id: a.ID_ARCHIVO, formato: a.FORMATO, nombre: String(a.NOMBRE || a.ID_ARCHIVO), pesoKb: Number(a.PESO_KB) || 0,
      fecha: marcaDe_(a.FECHA) ? formatos.fechaHora(new Date(marcaDe_(a.FECHA))) : '' };
  };
  const envioVista = function (e) {
    return { id: e.ID_ENVIO, fecha: dia(e.FECHA_ENVIO), fechaIso: iso(e.FECHA_ENVIO), folio: String(e.FOLIO_CH || ''),
      enviadoPor: String(e.ENVIADO_POR || ''), resultado: e.RESULTADO, autorizo: String(e.AUTORIZO_NOMBRE || ''),
      puesto: String(e.AUTORIZO_PUESTO || ''), fechaAutorizacion: dia(e.FECHA_AUTORIZACION), comentario: String(e.COMENTARIO || ''),
      registradoPor: String(e.REGISTRADO_POR || ''), fechaRegistro: marcaDe_(e.FECHA_REGISTRO) ? formatos.fechaHora(new Date(marcaDe_(e.FECHA_REGISTRO))) : '' };
  };
  const item = function (s) {
    return { id: s.ID_SOLICITUD, nombre: String(s.NOMBRE_DOCUMENTO), codigo: String(s.CODIGO || ''), version: String(s.VERSION || ''),
      estado: s.ESTADO, nombreEstado: NOMBRES_ESTADO[s.ESTADO], tipoDocumento: nombreDe(t.tipos, 'ID_TIPO', s.ID_TIPO),
      departamento: nombreDe(t.departamentos, 'ID_DEPARTAMENTO', s.ID_DEPARTAMENTO), area: nombreDe(t.areas, 'ID_AREA', s.ID_AREA),
      elaborador: String(s.ELABORO_NOMBRE || ''), reviso: String(s.REVISO_NOMBRE || ''), vobo: dia(s.FECHA_REVISION), voboIso: iso(s.FECHA_REVISION),
      revision: String(s.REVISION || ''), esSuya: s.ELABORO_ID === sesion.idUsuario, puedeOperar: puedeOperarCH_(sesion, s),
      archivos: archivosParaCH_(archivos, s).map(resumen), finales: archivosFinales_(archivos, s.ID_SOLICITUD).map(resumen) };
  };
  const grupos = { porSubir: [], enCH: [], resueltas: [], hoyIso: formatos.iso(ahora) };
  filas.filter(function (s) { return s.ESTADO === ESTADOS.EN_AUTORIZACION_CH; })
    .sort(function (a, b) { return marcaDe_(a.FECHA_REVISION) - marcaDe_(b.FECHA_REVISION); })
    .forEach(function (s) {
      const pendiente = envioPendiente_(envios, s.ID_SOLICITUD);
      const x = item(s);
      if (pendiente) { x.envio = envioVista(pendiente); grupos.enCH.push(x); } else grupos.porSubir.push(x);
    });
  const porId = {};
  filas.forEach(function (s) { porId[s.ID_SOLICITUD] = s; });
  envios.filter(function (e) { return e.RESULTADO !== 'PENDIENTE' && porId[e.ID_SOLICITUD]; })
    .sort(function (a, b) { return marcaDe_(b.FECHA_REGISTRO) - marcaDe_(a.FECHA_REGISTRO); })
    .slice(0, maxResueltas)
    .forEach(function (e) {
      const x = item(porId[e.ID_SOLICITUD]);
      x.envio = envioVista(e);
      // Con AUTORIZADO y sin final (falló o no se ha generado), se ofrece generarlo.
      x.faltaFinal = e.RESULTADO === 'AUTORIZADO' && porId[e.ID_SOLICITUD].ESTADO === ESTADOS.AUTORIZADO && !x.finales.length;
      grupos.resueltas.push(x);
    });
  return grupos;
}

function pantallaEnviosCH_(sesion) {
  const t = tablasSolicitud_();
  return {
    grupos: enviosCH_(leerTabla_('Solicitudes'), leerTabla_('EnviosCH'), leerTabla_('Archivos'), t, sesion, formatosFecha_(), new Date(), ENVIOS_CH_RESUELTOS_MAX),
    puestos: t.puestos.filter(function (p) { return esActivo_(p.ACTIVO); }).map(function (p) { return String(p.NOMBRE); })
      .sort(function (a, b) { return a.localeCompare(b, 'es'); })
  };
}
