/**
 * TABLERO DE INDICADORES (decisión 30): cómo van los procesos, para el administrador y Soporte CI.
 *
 * Todo sale de la hoja Solicitudes: el estado y las fechas de cada etapa (elaboración, envío a revisión,
 * Vo.Bo. y autorización). Las canceladas solo se cuentan aparte. Lo puro está probado en
 * tests/tablero.test.js.
 */

/** Los indicadores (sin tocar Google). t: tablas de catálogos (tablasSolicitud_). */
function tablero_(solicitudes, t, ahora, formatear) {
  const DIA = 24 * 60 * 60 * 1000;
  const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
  const vivas = solicitudes.filter(function (s) { return s.ESTADO !== ESTADOS.CANCELADO; });
  const nombreDe = function (lista, campo, id) { const x = lista.filter(function (r) { return r[campo] === id; })[0]; return x ? String(x.NOMBRE) : ''; };
  const cuenta = function (lista, estados) { return lista.filter(function (s) { return estados.indexOf(s.ESTADO) !== -1; }).length; };
  const dias = function (de, a) {
    const x = marcaDe_(de), y = marcaDe_(a);
    return x && y && y >= x ? (y - x) / DIA : null;
  };
  const promedio = function (lista) {
    const v = lista.filter(function (x) { return x !== null; });
    return v.length ? Math.round(v.reduce(function (a, b) { return a + b; }, 0) / v.length * 10) / 10 : null;
  };
  const cerradas = [ESTADOS.AUTORIZADO, ESTADOS.NO_PROCEDENTE];
  // Una solicitud que se envió más de una vez, o que está devuelta, tuvo al menos una devolución.
  const devuelta = function (s) { return s.ESTADO === ESTADOS.DEVUELTO || Number(s.REVISION) > 1; };
  const enviadas = vivas.filter(function (s) { return Number(s.REVISION) >= 1; });

  const agrupar = function (clave, nombre) {
    const grupos = {};
    vivas.forEach(function (s) {
      const k = String(s[clave] || '');
      if (!grupos[k]) grupos[k] = { nombre: nombre(s) || 'Sin dato', total: 0, enCurso: 0, autorizadas: 0, devueltas: 0 };
      const g = grupos[k];
      g.total++;
      if (cerradas.indexOf(s.ESTADO) === -1) g.enCurso++;
      if (s.ESTADO === ESTADOS.AUTORIZADO) g.autorizadas++;
      if (devuelta(s)) g.devueltas++;
    });
    return Object.keys(grupos).map(function (k) { return grupos[k]; })
      .sort(function (a, b) { return b.total - a.total || a.nombre.localeCompare(b.nombre, 'es'); });
  };

  // Revisores: lo que tienen asignado ahora y los Vo.Bo. que han dado (con su tiempo promedio).
  const revisores = {};
  const revisor = function (id) {
    if (!revisores[id]) revisores[id] = { nombre: nombreDe(t.usuarios, 'ID_USUARIO', id) || id, asignadas: 0, vobos: 0, tiempos: [] };
    return revisores[id];
  };
  vivas.forEach(function (s) {
    if (s.ESTADO === ESTADOS.EN_REVISION && s.REVISOR_ASIGNADO_ID) revisor(s.REVISOR_ASIGNADO_ID).asignadas++;
    if (s.REVISO_ID && marcaDe_(s.FECHA_REVISION)) {
      const r = revisor(s.REVISO_ID);
      r.vobos++;
      r.tiempos.push(dias(s.FECHA_ENVIO_REVISION, s.FECHA_REVISION));
    }
  });

  // Los últimos 6 meses: cuántas se crearon y cuántas se autorizaron.
  const meses = [];
  for (let i = 5; i >= 0; i--) {
    const f = new Date(ahora.getFullYear(), ahora.getMonth() - i, 1);
    meses.push({ clave: f.getFullYear() * 100 + f.getMonth(), mes: MESES[f.getMonth()] + ' ' + f.getFullYear(), creadas: 0, autorizadas: 0 });
  }
  const mesDe = function (v) {
    const m = marcaDe_(v);
    if (!m) return null;
    const f = new Date(m);
    return meses.filter(function (x) { return x.clave === f.getFullYear() * 100 + f.getMonth(); })[0] || null;
  };
  vivas.forEach(function (s) {
    const c = mesDe(s.FECHA_ELABORACION);
    if (c) c.creadas++;
    const a = s.ESTADO === ESTADOS.AUTORIZADO ? mesDe(s.FECHA_AUTORIZACION) : null;
    if (a) a.autorizadas++;
  });

  return {
    actualizado: formatear(ahora),
    totales: {
      total: vivas.length,
      enCaptura: cuenta(vivas, [ESTADOS.BORRADOR, ESTADOS.CONFIRMADO]),
      conObservaciones: cuenta(vivas, [ESTADOS.DEVUELTO]),
      enRevision: cuenta(vivas, [ESTADOS.EN_REVISION]),
      sinAsignar: vivas.filter(function (s) { return s.ESTADO === ESTADOS.EN_REVISION && !s.REVISOR_ASIGNADO_ID; }).length,
      enCH: cuenta(vivas, [ESTADOS.EN_AUTORIZACION_CH]),
      autorizadas: cuenta(vivas, [ESTADOS.AUTORIZADO]),
      noProcedentes: cuenta(vivas, [ESTADOS.NO_PROCEDENTE]),
      canceladas: solicitudes.length - vivas.length
    },
    etapas: [ESTADOS.BORRADOR, ESTADOS.CONFIRMADO, ESTADOS.EN_REVISION, ESTADOS.DEVUELTO, ESTADOS.EN_AUTORIZACION_CH, ESTADOS.AUTORIZADO, ESTADOS.NO_PROCEDENTE]
      .map(function (e) { return { estado: e, nombre: NOMBRES_ESTADO[e], n: cuenta(vivas, [e]) }; }),
    tiempos: {
      revision: promedio(vivas.map(function (s) { return dias(s.FECHA_ENVIO_REVISION, s.FECHA_REVISION); })),
      autorizacion: promedio(vivas.map(function (s) { return dias(s.FECHA_REVISION, s.FECHA_AUTORIZACION); })),
      total: promedio(vivas.filter(function (s) { return s.ESTADO === ESTADOS.AUTORIZADO; })
        .map(function (s) { return dias(s.FECHA_ELABORACION, s.FECHA_AUTORIZACION); }))
    },
    devoluciones: { enviadas: enviadas.length, conDevolucion: enviadas.filter(devuelta).length,
      porcentaje: enviadas.length ? Math.round(enviadas.filter(devuelta).length / enviadas.length * 100) : null },
    esperando: vivas.filter(function (s) { return s.ESTADO === ESTADOS.EN_REVISION; })
      .sort(function (a, b) { return marcaDe_(a.FECHA_ENVIO_REVISION) - marcaDe_(b.FECHA_ENVIO_REVISION); })
      .slice(0, 8)
      .map(function (s) {
        return { id: s.ID_SOLICITUD, nombre: String(s.NOMBRE_DOCUMENTO), elaborador: String(s.ELABORO_NOMBRE || ''),
          departamento: nombreDe(t.departamentos, 'ID_DEPARTAMENTO', s.ID_DEPARTAMENTO),
          revisor: s.REVISOR_ASIGNADO_ID ? nombreDe(t.usuarios, 'ID_USUARIO', s.REVISOR_ASIGNADO_ID) : '',
          dias: marcaDe_(s.FECHA_ENVIO_REVISION) ? Math.floor((ahora.getTime() - marcaDe_(s.FECHA_ENVIO_REVISION)) / DIA) : 0 };
      }),
    departamentos: agrupar('ID_DEPARTAMENTO', function (s) { return nombreDe(t.departamentos, 'ID_DEPARTAMENTO', s.ID_DEPARTAMENTO); }),
    colaboradores: agrupar('ELABORO_ID', function (s) { return String(s.ELABORO_NOMBRE || ''); }),
    revisores: Object.keys(revisores).map(function (k) {
      const r = revisores[k];
      return { nombre: r.nombre, asignadas: r.asignadas, vobos: r.vobos, promedioDias: promedio(r.tiempos) };
    }).sort(function (a, b) { return (b.asignadas + b.vobos) - (a.asignadas + a.vobos) || a.nombre.localeCompare(b.nombre, 'es'); }),
    porMes: meses.map(function (m) { return { mes: m.mes, creadas: m.creadas, autorizadas: m.autorizadas }; })
  };
}
