/**
 * AVISOS POR CORREO (decisión 27).
 *
 *   NUEVA_REVISION → a Procesos (Config → CORREO_PROCESOS y los revisores activos): llegó una solicitud.
 *   DEVUELTA       → al colaborador, con las observaciones que tiene que atender.
 *   VOBO, AUTORIZADA, RECHAZADA_CH, NO_PROCEDENTE → al colaborador: cómo va su documento.
 *
 * Un aviso nunca detiene la acción: si el correo falla, se anota en el registro y la acción sigue.
 * Config → AVISOS_CORREO = NO los apaga. En PRUEBAS los usuarios de prueba (@procesos.test) no tienen
 * buzón: su aviso le llega a la persona real que hizo la acción, con la nota de para quién era.
 * Lo puro (a quién y qué dice) está probado en tests/avisos.test.js.
 */

/** Manda el aviso `tipo` de la solicitud `fila` a `correos`. Nunca lanza error. */
function avisar_(sesion, tipo, fila, correos) {
  try {
    if (obtenerConfig_('AVISOS_CORREO', 'SI') !== 'SI') return;
    const ambiente = ambienteActual_();
    const d = destinatariosAviso_(correos, ambiente, correoReal_(sesion));
    if (!d.para.length) return;
    const paso = tipo === 'NUEVA_REVISION' ? 'revision' : 'vista';
    const c = contenidoAviso_(tipo, fila, urlApp_() + '?vista=solicitud&id=' + encodeURIComponent(fila.ID_SOLICITUD + ':' + paso));
    const nota = d.redirigidos.length
      ? '<p style="color:#7A6A3A;font-size:12px">Ambiente de pruebas: este aviso era para ' + escaparHtml_(d.redirigidos.join(', ')) + ', que no tiene buzón; te llegó a ti porque hiciste la acción.</p>'
      : '';
    MailApp.sendEmail({ to: d.para.join(','), subject: (ambiente === 'PRODUCCION' ? '' : '[' + ambiente + '] ') + c.asunto,
      htmlBody: c.html + nota, name: APP_NOMBRE_LARGO });
    registrarBitacora_(sesion, 'AVISO_CORREO', c.asunto + ' → ' + d.para.join(', '), fila.ID_SOLICITUD);
  } catch (e) {
    console.error('No se pudo mandar el aviso ' + tipo + ' de ' + (fila && fila.ID_SOLICITUD) + ': ' + e.message);
  }
}

/** Correos de Procesos: Config → CORREO_PROCESOS (separados por coma) y los de los revisores activos. */
function correosProcesos_() {
  const revisores = revisoresActivos_(leerTabla_('Usuarios'), leerTabla_('UsuarioPerfiles')).map(function (r) { return correoDeUsuario_(r.id); });
  return String(obtenerConfig_('CORREO_PROCESOS', '')).split(/[,;\s]+/).concat(revisores);
}

function correoDeUsuario_(idUsuario) {
  const u = leerTabla_('Usuarios').filter(function (x) { return x.ID_USUARIO === idUsuario; })[0];
  return u ? String(u.CORREO || '') : '';
}

/** El link de la app (el de esta implementación). */
function urlApp_() {
  try { return ScriptApp.getService().getUrl() || ''; } catch (e) { return ''; }
}

/**
 * A quién se manda de verdad (sin tocar Google): sin repetidos ni vacíos ni direcciones mal escritas. Los
 * de prueba (.test) no tienen buzón: en PRUEBAS se cambian por el correo real de quien hizo la acción.
 */
function destinatariosAviso_(correos, ambiente, correoReal) {
  const para = [];
  const redirigidos = [];
  (correos || []).forEach(function (c) {
    let correo = String(c || '').trim().toLowerCase();
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(correo)) return;
    if (/\.test$/.test(correo)) {
      if (ambiente !== 'PRUEBAS' || !correoReal) return;
      if (redirigidos.indexOf(correo) === -1) redirigidos.push(correo);
      correo = String(correoReal).trim().toLowerCase();
    }
    if (para.indexOf(correo) === -1) para.push(correo);
  });
  return { para: para, redirigidos: redirigidos };
}

function escaparHtml_(texto) {
  return String(texto === null || texto === undefined ? '' : texto)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

/** Asunto y cuerpo HTML de cada aviso (sin tocar Google). fila trae los datos de la solicitud. */
function contenidoAviso_(tipo, fila, url) {
  const e = escaparHtml_;
  const folio = String(fila.ID_SOLICITUD || '');
  const nombre = String(fila.NOMBRE_DOCUMENTO || '');
  const codigo = String(fila.CODIGO || '');
  const textos = {
    NUEVA_REVISION: {
      asunto: 'Nueva solicitud para revisar: ' + nombre + ' (' + folio + ')',
      titulo: 'Llegó una solicitud a la bandeja de revisión',
      cuerpo: '<p>' + e(fila.ELABORO_NOMBRE) + ' envió <strong>' + e(nombre) + '</strong> (' + e(folio) + ', revisión ' + e(fila.REVISION) +
        ') a revisión de Procesos.</p><p>Tómala en la bandeja para revisarla.</p>',
      boton: 'Abrir la solicitud'
    },
    DEVUELTA: {
      asunto: 'Procesos te devolvió «' + nombre + '» con observaciones',
      titulo: 'Tu solicitud tiene observaciones',
      cuerpo: '<p>Procesos revisó <strong>' + e(nombre) + '</strong> (' + e(folio) + ') y te pide corregir lo siguiente:</p>' +
        '<ul>' + (fila.observaciones || []).map(function (o) {
          return '<li><strong>' + e(o.nombreApartado) + ':</strong> ' + e(o.texto) + '</li>';
        }).join('') + '</ul>' +
        '<p>Entra al sistema, corrige cada parte (las observaciones aparecen junto a lo que hay que cambiar), márcalas como atendidas, confirma y vuelve a enviarla.</p>',
      boton: 'Atender las observaciones'
    },
    VOBO: {
      asunto: '«' + nombre + '» tiene el Vo.Bo. de Procesos',
      titulo: 'Procesos le dio su Vo.Bo. a tu documento',
      cuerpo: '<p><strong>' + e(nombre) + '</strong> quedó con el código <strong>' + e(codigo) + '</strong>, versión ' + e(fila.VERSION) +
        '.</p><p>Lo siguiente es la autorización en el sistema CH; Procesos registrará el resultado.</p>',
      boton: 'Ver mi solicitud'
    },
    AUTORIZADA: {
      asunto: '«' + nombre + '» fue autorizado',
      titulo: 'Tu documento fue autorizado',
      cuerpo: '<p><strong>' + e(nombre) + '</strong> (' + e(codigo) + ', versión ' + e(fila.VERSION) + ') fue autorizado en el sistema CH' +
        (fila.AUTORIZO_NOMBRE ? ' por ' + e(fila.AUTORIZO_NOMBRE) : '') + '.</p><p>El documento final, sin marca de agua, ya está en el inventario documental.</p>',
      boton: 'Ver mi solicitud'
    },
    RECHAZADA_CH: {
      asunto: 'CH no autorizó «' + nombre + '»',
      titulo: 'Tu documento regresó del sistema CH',
      cuerpo: '<p><strong>' + e(nombre) + '</strong> (' + e(codigo) + ') no se autorizó en el sistema CH' +
        (fila.COMENTARIO_CH ? ': «' + e(fila.COMENTARIO_CH) + '»' : '') + '.</p><p>Corrige lo necesario, confirma y vuelve a enviarlo a Procesos.</p>',
      boton: 'Atender la observación'
    },
    NO_PROCEDENTE: {
      asunto: 'Procesos cerró «' + nombre + '» como no procedente',
      titulo: 'Tu solicitud se cerró',
      cuerpo: '<p>Procesos cerró <strong>' + e(nombre) + '</strong> (' + e(folio) + ') como no procedente.</p>' +
        (fila.MOTIVO_CIERRE ? '<p>Motivo: ' + e(fila.MOTIVO_CIERRE) + '</p>' : ''),
      boton: 'Ver mi solicitud'
    }
  };
  const t = textos[tipo];
  if (!t) throw new Error('Aviso desconocido: ' + tipo);
  const boton = url ? '<p style="margin:24px 0"><a href="' + e(url) + '" style="background:#06263A;color:#ffffff;padding:10px 18px;border-radius:8px;text-decoration:none;font-weight:600">' +
    e(t.boton) + '</a></p>' : '';
  const html = '<div style="font-family:Arial,Helvetica,sans-serif;color:#1E252B;max-width:560px">' +
    '<p style="color:#B4A169;font-weight:700;margin:0">' + e(APP_NOMBRE_LARGO) + '</p>' +
    '<h2 style="color:#06263A;margin:6px 0 16px">' + e(t.titulo) + '</h2>' + t.cuerpo + boton +
    '<p style="color:#667085;font-size:12px">Este correo lo manda el sistema; no hace falta responderlo.</p></div>';
  return { asunto: t.asunto, html: html };
}

/**
 * Desde el editor: manda un aviso de prueba a tu propio correo. La primera vez Google pide permiso para
 * enviar correos (hay que aceptarlo para que los avisos funcionen).
 */
function probarAvisos() {
  soloEditor_();
  const yo = Session.getActiveUser().getEmail();
  const c = contenidoAviso_('NUEVA_REVISION', { ID_SOLICITUD: 'SOL-PRUEBA', NOMBRE_DOCUMENTO: 'Documento de prueba', ELABORO_NOMBRE: 'Sistema', REVISION: '1' }, urlApp_());
  MailApp.sendEmail({ to: yo, subject: '[Prueba] ' + c.asunto, htmlBody: c.html, name: APP_NOMBRE_LARGO });
  Logger.log('Aviso de prueba enviado a ' + yo + '. Correos que quedan hoy: ' + MailApp.getRemainingDailyQuota());
}
