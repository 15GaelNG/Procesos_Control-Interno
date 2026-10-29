/**
 * HISTORIAL DE CAMBIOS DE UNA SOLICITUD (decisión 26, confirmada por Gael el 29/10/2026).
 *
 * Lo que pasó con una solicitud, lo más reciente primero, para el colaborador, Procesos y Soporte CI:
 *   - cada corrección de Procesos (cómo estaba y cómo quedó: observaciones con estado CAMBIO);
 *   - cada propuesta de la IA que el colaborador aceptó o editó (antes y después);
 *   - los pasos del trámite que anota la bitácora (creada, confirmada, enviada, devuelta, Vo.Bo.…).
 * No se guarda nada nuevo: se arma con lo que ya existe. Lo puro está probado en tests/historial.test.js.
 */

function historial_(sesion, idSolicitud) {
  const fila = filaSolicitud_(idSolicitud);
  if (!permisoSolicitud_(sesion, fila).ver) throw new Error('No puedes ver esta solicitud.');
  const det = detalleSolicitud_(fila, leerTabla_('Actividades'), leerTabla_('Imagenes'), tablasSolicitud_(), { editar: false }, formatoFecha_);
  return historialSolicitud_(idSolicitud, fila, det, leerTabla_('Bitacora'), leerTabla_('Observaciones'), leerTabla_('PropuestasIA'),
    leerTabla_('Usuarios'), formatoFecha_);
}

/**
 * Las entradas del historial (sin tocar Google): [{ fecha, quien, tipo: 'PROCESOS' | 'IA' | 'TRAMITE',
 * titulo, detalle, antes, despues }], lo más reciente primero.
 */
function historialSolicitud_(idSolicitud, fila, det, bitacora, observaciones, propuestas, usuarios, formatear) {
  const nombrePorCorreo = {};
  usuarios.forEach(function (u) { nombrePorCorreo[String(u.CORREO || '').trim().toLowerCase()] = String(u.NOMBRE || u.CORREO); });
  const nombre = function (correo) { const c = String(correo || '').trim().toLowerCase(); return nombrePorCorreo[c] || c; };
  const numero = function (id) { return det.actividades.map(function (a) { return a.id; }).indexOf(id) + 1; };
  const parte = function (apartado, idActividad) {
    if (apartado === 'ACTIVIDAD' || idActividad) { const n = numero(idActividad); return n ? 'Actividad ' + n : 'Actividad eliminada'; }
    return APARTADOS_OBSERVACION[apartado] || apartado;
  };
  const texto = function (campo, v) {
    return campo === 'RESPONSABILIDADES' || campo === 'DEFINICIONES' ? listaJson_(v).join('\n') : String(v === null || v === undefined ? '' : v);
  };
  const entradas = [];

  observaciones.filter(function (o) { return o.ID_SOLICITUD === idSolicitud && o.ESTADO === 'CAMBIO'; }).forEach(function (o) {
    const m = /^Antes: ([\s\S]*)\nAhora: ([\s\S]*)$/.exec(String(o.TEXTO || ''));
    entradas.push({ marca: marcaDe_(o.FECHA), quien: String(o.AUTOR_NOMBRE || ''), tipo: 'PROCESOS',
      titulo: 'Procesos corrigió: ' + parte(o.APARTADO, o.ID_ACTIVIDAD), detalle: m ? '' : String(o.TEXTO || ''),
      antes: m ? m[1] : '', despues: m ? m[2] : '' });
  });

  propuestas.filter(function (p) {
    return p.ID_SOLICITUD === idSolicitud && ['ACEPTADA', 'EDITADA'].indexOf(p.DECISION) !== -1 && p.CAMPO !== 'ORDEN';
  }).forEach(function (p) {
    entradas.push({ marca: marcaDe_(p.FECHA_DECISION), quien: String(fila.ELABORO_NOMBRE || ''), tipo: 'IA',
      titulo: (p.DECISION === 'EDITADA' ? 'Aceptó con cambios la propuesta de la IA: ' : 'Aceptó la propuesta de la IA: ') +
        (p.ID_ACTIVIDAD ? parte('ACTIVIDAD', p.ID_ACTIVIDAD) + ' · ' : '') + (NOMBRES_CAMPO_HISTORIAL[p.CAMPO] || p.CAMPO),
      detalle: '', antes: texto(p.CAMPO, p.VALOR_ANTERIOR), despues: texto(p.CAMPO, p.VALOR_FINAL) });
  });

  bitacora.filter(function (b) { return b.ID_SOLICITUD === idSolicitud && ACCIONES_FUERA_DEL_HISTORIAL.indexOf(b.ACCION) === -1; })
    .forEach(function (b) {
      // Con «ver como» (pruebas), quien aparece es el usuario que se estaba usando.
      const m = /^\[viendo como ([^\]]+)\] ?([\s\S]*)$/.exec(String(b.DETALLE || ''));
      entradas.push({ marca: marcaDe_(b.FECHA), quien: m ? nombre(m[1]) + ' (con «Ver como»)' : nombre(b.USUARIO), tipo: 'TRAMITE',
        titulo: NOMBRES_ACCION[b.ACCION] || String(b.ACCION), detalle: m ? m[2] : String(b.DETALLE || ''), antes: '', despues: '' });
    });

  return entradas.sort(function (a, b) { return b.marca - a.marca; }).map(function (e) {
    return { fecha: e.marca ? formatear(new Date(e.marca)) : '', quien: e.quien, tipo: e.tipo, titulo: e.titulo,
      detalle: e.detalle, antes: e.antes, despues: e.despues };
  });
}
