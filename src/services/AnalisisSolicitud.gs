/**
 * ANÁLISIS CON IA, PREGUNTAS Y CONFIRMACIÓN (fase 3; requerimiento §3.3–§3.5).
 *
 *   analizarSolicitud_()      → manda el proceso a la IA (sin datos sensibles), valida la respuesta
 *                               (ia/Analisis.gs) y la guarda como propuestas y preguntas.
 *   decidirPropuesta_()       → la persona acepta, edita o descarta cada propuesta.
 *   responderAclaracion_()    → responde una pregunta (o «No aplica» / «No lo sé»).
 *   guardarDerivados_()       → objetivo, alcance, responsabilidades y definiciones escritos a mano
 *                               (con o sin IA: si la IA está apagada, el sistema funciona igual).
 *   vistaPrevia_ / confirmarSolicitud_() → el borrador integral y la confirmación ligada a su huella.
 *
 * La IA propone y la persona decide: nada de lo que dice la IA entra al documento sin una decisión
 * (PropuestasIA). Nunca reordena actividades: sus sugerencias de orden solo se informan (§3.4).
 * Lo puro está probado en tests/analisis-solicitud.test.js.
 */

// ─────────────────────────────── Entrada para la IA ───────────────────────────────

/** Lo que se le manda a la IA, todavía con los datos tal cual (se ocultan después). */
function entradaAnalisis_(det, aclaraciones, puestos) {
  return {
    tipoDocumento: det.tipoDocumento, nombre: det.nombre,
    departamento: det.departamento + (det.area ? ' / ' + det.area : ''),
    inicio: det.inicio, fin: det.fin,
    actividades: det.actividades.filter(function (a) { return a.texto.trim(); })
      .map(function (a) { return { id: a.id, texto: a.texto, responsableIndicado: a.responsable }; }),
    puestos: puestos.filter(function (p) { return String(p.ACTIVO).trim().toUpperCase() !== 'NO'; })
      .map(function (p) { return { id: p.ID_PUESTO, nombre: String(p.NOMBRE), sinonimos: String(p.SINONIMOS || '') }; }),
    respuestas: aclaraciones.filter(function (q) { return ['RESPONDIDA', 'NO_APLICA', 'NO_LO_SE'].indexOf(q.ESTADO) !== -1; })
      .map(function (q) {
        return { idActividad: q.ID_ACTIVIDAD || null, tipo: q.TIPO, pregunta: String(q.PREGUNTA),
          respuesta: q.ESTADO === 'RESPONDIDA' ? String(q.RESPUESTA) : RESPUESTA_POR_ESTADO[q.ESTADO] };
      })
  };
}

/** La misma entrada con los datos sensibles cambiados por marcas (utils/Privacidad.gs). */
function ocultarEntrada_(e, mapa) {
  const o = function (t) { return ocultarDatosSensibles_(t, mapa); };
  return {
    tipoDocumento: e.tipoDocumento, nombre: o(e.nombre), departamento: e.departamento, inicio: o(e.inicio), fin: o(e.fin),
    actividades: e.actividades.map(function (a) { return { id: a.id, texto: o(a.texto), responsableIndicado: o(a.responsableIndicado) }; }),
    puestos: e.puestos,
    respuestas: e.respuestas.map(function (q) { return { idActividad: q.idActividad, tipo: q.tipo, pregunta: o(q.pregunta), respuesta: o(q.respuesta) }; })
  };
}

// ─────────────────────────────── De la respuesta a propuestas ───────────────────────────────

/** "Actividades 2 y 3" a partir de IDs. */
function nombrarActividades_(ids, det) {
  const numeros = ids.map(function (id) {
    const i = det.actividades.map(function (a) { return a.id; }).indexOf(id);
    return i === -1 ? null : i + 1;
  }).filter(Boolean);
  if (!numeros.length) return '';
  if (numeros.length === 1) return 'Actividad ' + numeros[0];
  return 'Actividades ' + numeros.slice(0, -1).join(', ') + ' y ' + numeros[numeros.length - 1];
}

/**
 * Qué escribir después de un análisis (sin tocar Google):
 *  - las propuestas y preguntas que seguían pendientes pasan a REEMPLAZADA (lo ya decidido o
 *    respondido se queda como está);
 *  - propuestas nuevas solo donde la IA propone algo distinto a lo que ya hay.
 * alcance: 'REDACCION' solo toca la redacción (propuestas TEXTO); 'ANALISIS', todo lo demás (y las
 * preguntas); sin alcance, todo.
 */
function planPropuestas_(analisis, det, propuestasActuales, aclaracionesActuales, ahora, alcance) {
  const tocaTexto = alcance !== 'ANALISIS';
  const tocaLoDemas = alcance !== 'REDACCION';
  const suya = function (campo) { return campo === 'TEXTO' ? tocaTexto : tocaLoDemas; };
  // La redacción se compara exacta (corregir ortografía o puntuación ES la mejora); lo demás, sin
  // importar mayúsculas ni puntuación.
  const exacto = function (v) { return String(v || '').replace(/\s+/g, ' ').trim(); };
  const n = function (v) { return normalizar_(v); };
  const plan = { reemplazarPropuestas: [], reemplazarAclaraciones: [], propuestas: [], aclaraciones: [] };
  propuestasActuales.forEach(function (p) {
    if (p.ID_SOLICITUD === det.id && p.DECISION === 'PENDIENTE' && suya(p.CAMPO)) plan.reemplazarPropuestas.push(p._fila);
  });
  aclaracionesActuales.forEach(function (q) {
    if (tocaLoDemas && q.ID_SOLICITUD === det.id && q.ESTADO === 'PENDIENTE') plan.reemplazarAclaraciones.push(q._fila);
  });
  const propuesta = function (campo, idActividad, anterior, valor, justificacion, evidencia) {
    if (!suya(campo)) return;
    plan.propuestas.push({ ID_SOLICITUD: det.id, ID_ACTIVIDAD: idActividad || '', CAMPO: campo, VALOR_ANTERIOR: anterior || '',
      PROPUESTA: valor, JUSTIFICACION: justificacion || '', EVIDENCIA: evidencia || '', DECISION: 'PENDIENTE', VALOR_FINAL: '',
      FECHA_PROPUESTA: ahora, FECHA_DECISION: '' });
  };

  analisis.actividades.forEach(function (a) {
    const actual = det.actividades.filter(function (x) { return x.id === a.id; })[0];
    if (!actual) return;
    if (a.textoPropuesto && exacto(a.textoPropuesto) !== exacto(actual.texto)) {
      const ojo = a.cifrasNuevas && a.cifrasNuevas.length
        ? ' · Ojo: menciona datos que no estaban en tu texto (' + a.cifrasNuevas.join(', ') + '); revísalos.' : '';
      propuesta('TEXTO', a.id, actual.texto, a.textoPropuesto, (a.cambios || 'Redacción más clara') + ojo, '');
    }
    const r = a.responsable;
    if (r && !r.indicado) {
      propuesta('RESPONSABLE', a.id, actual.responsable, r.puesto,
        r.requiereConfirmacion ? 'No está en el catálogo de puestos: confírmalo o corrígelo.' : 'Coincide con el catálogo de puestos.', r.evidencia);
    } else if (r && r.indicado && !r.requiereConfirmacion && n(r.puesto) !== n(actual.responsable)) {
      propuesta('RESPONSABLE', a.id, actual.responsable, r.puesto, 'Así se llama en el catálogo de puestos.', r.evidencia);
    }
  });
  [['OBJETIVO', analisis.objetivo, det.objetivo], ['ALCANCE', analisis.alcance, det.alcance]].forEach(function (x) {
    if (x[1] && x[1].texto && n(x[1].texto) !== n(x[2])) {
      const base = nombrarActividades_(x[1].basadoEn || [], det);
      propuesta(x[0], '', x[2], x[1].texto, base ? 'Basado en: ' + base + '.' : '', '');
    }
  });
  const responsabilidades = (analisis.responsabilidades || []).map(function (r) { return r.puesto + ': ' + r.responsabilidades.join('; '); });
  if (responsabilidades.length && JSON.stringify(responsabilidades.map(n)) !== JSON.stringify(det.responsabilidades.map(n))) {
    propuesta('RESPONSABILIDADES', '', JSON.stringify(det.responsabilidades), JSON.stringify(responsabilidades), 'Agrupadas por puesto según las actividades.', '');
  }
  const definiciones = (analisis.definiciones || []).map(function (d) { return d.termino + ': ' + d.definicion; });
  if (definiciones.length && JSON.stringify(definiciones.map(n)) !== JSON.stringify(det.definiciones.map(n))) {
    propuesta('DEFINICIONES', '', JSON.stringify(det.definiciones), JSON.stringify(definiciones), 'Términos que aparecen en el proceso.', '');
  }
  (analisis.sugerenciasOrden || []).forEach(function (s) {
    propuesta('ORDEN', '', '', s.descripcion, s.motivo, nombrarActividades_(s.actividades || [], det));
  });
  (tocaLoDemas ? analisis.preguntas || [] : []).forEach(function (q) {
    plan.aclaraciones.push({ ID_SOLICITUD: det.id, ID_ACTIVIDAD: q.idActividad || '', TIPO: q.tipo, PREGUNTA: q.pregunta,
      RESPUESTA: '', ESTADO: 'PENDIENTE', ORIGEN: 'IA', FECHA_PREGUNTA: ahora, FECHA_RESPUESTA: '' });
  });
  return plan;
}

/**
 * Manda el proceso a la IA y guarda lo que propone. opciones:
 *   operacion  'REDACCION' (corregir cómo están escritas las actividades; rápida) o 'ANALISIS'
 *              (responsables, objetivo, alcance, responsabilidades, definiciones, preguntas y orden).
 *   intento    0, 1, 2…: la pantalla lanza el mismo trabajo con otro modelo si el anterior tarda.
 *   corrida    Identifica esos intentos: el primero que termina escribe; los demás ya no.
 */
function analizarSolicitud_(sesion, idSolicitud, opciones) {
  const o = opciones || {};
  const redaccion = o.operacion === 'REDACCION';
  const inicio = Date.now();
  const fila = filaSolicitud_(idSolicitud);
  if (!permisoSolicitud_(sesion, fila).editar) throw new Error('No puedes editar esta solicitud.');
  if (obtenerConfig_('IA_ACTIVA', 'NO') !== 'SI') {
    throw new Error('La IA está apagada en este momento. Puedes escribir el objetivo, el alcance y los responsables a mano y continuar.');
  }
  const det = detalleSolicitud_(fila, leerTabla_('Actividades'), leerTabla_('Imagenes'), tablasSolicitud_(), { editar: true }, formatoFecha_);
  const entrada = entradaAnalisis_(det, leerTabla_('Aclaraciones').filter(function (q) { return q.ID_SOLICITUD === idSolicitud; }), leerTabla_('Puestos'));
  if (!entrada.actividades.length) throw new Error('Escribe al menos una actividad antes de usar la IA.');

  const mapa = {};
  const enviada = ocultarEntrada_(entrada, mapa);
  const prompt = redaccion ? construirPromptRedaccion_(enviada) : construirPromptAnalisis_(enviada);
  const r = llamarIAJson_({ operacion: redaccion ? 'REDACCION' : 'ANALISIS', sistema: prompt.sistema, usuario: prompt.usuario,
    idSolicitud: idSolicitud, rapido: redaccion, desplazamiento: Number(o.intento) || 0 });
  const v = redaccion ? validarRedaccion_(enviada, r.datos) : validarAnalisis_(enviada, r.datos);
  const analisis = restaurarDatosSensibles_(v.analisis, mapa);
  const avisos = restaurarDatosSensibles_(v.avisos, mapa);

  // Escribe solo el primer intento de la corrida que termine (los demás pudieron seguir colgados). Bajo
  // el candado, propuestas y preguntas se leen de nuevo: pudo guardarse una respuesta mientras la IA pensaba.
  const cache = CacheService.getScriptCache();
  const claveCorrida = o.corrida ? 'ia-corrida-' + idSolicitud + '-' + String(o.corrida).slice(0, 40) : '';
  const plan = conCandado_(20000, function () {
    if (claveCorrida && cache.get(claveCorrida)) return null;
    if (claveCorrida) cache.put(claveCorrida, r.modelo, 1800);
    try {
      const p = planPropuestas_(analisis, det, leerTabla_('PropuestasIA'),
        leerTabla_('Aclaraciones').filter(function (q) { return q.ID_SOLICITUD === idSolicitud; }), new Date(), redaccion ? 'REDACCION' : 'ANALISIS');
      p.reemplazarPropuestas.forEach(function (f) { actualizarFila_('PropuestasIA', f, { DECISION: 'REEMPLAZADA' }); });
      p.reemplazarAclaraciones.forEach(function (f) { actualizarFila_('Aclaraciones', f, { ESTADO: 'REEMPLAZADA' }); });
      const idsP = reservarIds_('PIA', p.propuestas.length, 6);
      agregarFilas_('PropuestasIA', p.propuestas.map(function (x, i) { return Object.assign({ ID_PROPUESTA: idsP[i] }, x); }));
      const idsA = reservarIds_('ACL', p.aclaraciones.length, 6);
      agregarFilas_('Aclaraciones', p.aclaraciones.map(function (q, i) { return Object.assign({ ID_ACLARACION: idsA[i] }, q); }));
      return p;
    } catch (e) {
      if (claveCorrida) cache.remove(claveCorrida);   // que otro intento de la corrida pueda escribir
      throw e;
    }
  });
  if (!plan) return { descartado: true, modelo: r.modelo };
  registrarBitacora_(sesion, 'ANALIZAR_IA', (redaccion ? 'Redacción: ' : 'Análisis: ') + plan.propuestas.length + ' propuestas y ' +
    plan.aclaraciones.length + ' preguntas (' + r.modelo + ', ' + Math.round((Date.now() - inicio) / 1000) + ' s).', idSolicitud);
  return { operacion: redaccion ? 'REDACCION' : 'ANALISIS', propuestas: plan.propuestas.length, preguntas: plan.aclaraciones.length,
    avisos: avisos, modelo: r.modelo, redaccion: plan.propuestas.filter(function (p) { return p.CAMPO === 'TEXTO'; }).length,
    segundos: Math.round((Date.now() - inicio) / 1000) };
}

// ─────────────────────────────── Estado para la pantalla ───────────────────────────────

/** Todo lo del paso 4: actividades actuales, propuestas y preguntas vigentes y textos derivados. */
function estadoAnalisis_(det, propuestas, aclaraciones, iaActiva, formatear) {
  const numero = function (id) { return det.actividades.map(function (a) { return a.id; }).indexOf(id) + 1; };
  const vigentes = propuestas.filter(function (p) { return p.ID_SOLICITUD === det.id && p.DECISION !== 'REEMPLAZADA'; });
  const preguntas = aclaraciones.filter(function (q) { return q.ID_SOLICITUD === det.id && q.ESTADO !== 'REEMPLAZADA'; });
  const fechas = vigentes.map(function (p) { return marcaDe_(p.FECHA_PROPUESTA); })
    .concat(preguntas.filter(function (q) { return q.ORIGEN === 'IA'; }).map(function (q) { return marcaDe_(q.FECHA_PREGUNTA); }));
  const ultima = fechas.length ? Math.max.apply(null, fechas) : 0;
  const lista = function (campo, v) { return campo === 'RESPONSABILIDADES' || campo === 'DEFINICIONES' ? listaJson_(v) : String(v || ''); };
  const vivaActividad = function (id) { return !id || numero(id) > 0; };
  // ¿Ya hubo un análisis completo? (cualquier propuesta que no sea de redacción, o una pregunta de la IA)
  const analizado = propuestas.some(function (p) { return p.ID_SOLICITUD === det.id && p.CAMPO !== 'TEXTO'; }) ||
    aclaraciones.some(function (q) { return q.ID_SOLICITUD === det.id && q.ORIGEN === 'IA'; });
  return {
    iaActiva: iaActiva, ultimoAnalisis: ultima ? formatear(new Date(ultima)) : '', analizado: analizado,
    puedeEditar: det.puedeEditar,
    actividades: det.actividades.map(function (a, i) {
      return { id: a.id, numero: i + 1, texto: a.texto, responsable: a.responsable, responsableConfirmado: a.responsableConfirmado };
    }),
    derivados: { objetivo: det.objetivo, alcance: det.alcance, responsabilidades: det.responsabilidades, definiciones: det.definiciones },
    propuestas: vigentes.filter(function (p) { return vivaActividad(p.ID_ACTIVIDAD); })
      .sort(function (a, b) { return CAMPOS_PROPUESTA.indexOf(a.CAMPO) - CAMPOS_PROPUESTA.indexOf(b.CAMPO) || numero(a.ID_ACTIVIDAD) - numero(b.ID_ACTIVIDAD); })
      .map(function (p) {
        return { id: p.ID_PROPUESTA, campo: p.CAMPO, idActividad: p.ID_ACTIVIDAD || '', numero: p.ID_ACTIVIDAD ? numero(p.ID_ACTIVIDAD) : 0,
          anterior: lista(p.CAMPO, p.VALOR_ANTERIOR), propuesta: lista(p.CAMPO, p.PROPUESTA), justificacion: String(p.JUSTIFICACION || ''),
          evidencia: String(p.EVIDENCIA || ''), decision: p.DECISION, valorFinal: lista(p.CAMPO, p.VALOR_FINAL) };
      }),
    preguntas: preguntas.filter(function (q) { return vivaActividad(q.ID_ACTIVIDAD); })
      .sort(function (a, b) { return numero(a.ID_ACTIVIDAD) - numero(b.ID_ACTIVIDAD); })
      .map(function (q) {
        return { id: q.ID_ACLARACION, idActividad: q.ID_ACTIVIDAD || '', numero: q.ID_ACTIVIDAD ? numero(q.ID_ACTIVIDAD) : 0,
          tipo: q.TIPO, nombreTipo: NOMBRES_TIPO_PREGUNTA[q.TIPO] || q.TIPO, pregunta: String(q.PREGUNTA),
          respuesta: String(q.RESPUESTA || ''), estado: q.ESTADO };
      })
  };
}

// ─────────────────────────────── Decisiones ───────────────────────────────

/** Un puesto del catálogo cuyo nombre o sinónimo es exactamente `nombre`, o null. */
function puestoDelCatalogo_(nombre, puestos) {
  const t = normalizar_(nombre);
  return puestos.filter(function (p) {
    return String(p.ACTIVO).trim().toUpperCase() !== 'NO' &&
      [p.NOMBRE].concat(String(p.SINONIMOS || '').split(',')).some(function (x) { return x && normalizar_(x) === t; });
  })[0] || null;
}

/** Cambios de la actividad para dejar `nombre` como su responsable confirmado. */
function cambiosResponsable_(nombre, puestos) {
  const p = puestoDelCatalogo_(nombre, puestos);
  return { PUESTO_TEXTO: p ? String(p.NOMBRE) : String(nombre).replace(/\s+/g, ' ').trim(), ID_PUESTO: p ? p.ID_PUESTO : '', RESPONSABLE_CONFIRMADO: 'SI' };
}

/** Normaliza una lista de renglones escrita por la persona (responsabilidades o definiciones). */
function renglones_(valor) {
  const lista = Array.isArray(valor) ? valor : String(valor || '').split('\n');
  return lista.map(function (x) { return String(x).replace(/\s+/g, ' ').trim(); }).filter(Boolean);
}

/**
 * Qué cambia al decidir una propuesta (sin tocar Google).
 *   decision: ACEPTADA | EDITADA | RECHAZADA; valor: lo que escribió la persona si EDITADA.
 * Devuelve { errores[], propuesta{}, actividad{} (cambios), solicitud{} (cambios), obsoleta }.
 */
function planDecision_(p, decision, valor, actividad, det, puestos) {
  const plan = { errores: [], propuesta: {}, actividad: {}, solicitud: {}, obsoleta: false };
  const L = LIMITES_CAPTURA;
  if (p.DECISION !== 'PENDIENTE') { plan.errores.push('Esa propuesta ya se decidió.'); return plan; }
  if (['ACEPTADA', 'EDITADA', 'RECHAZADA'].indexOf(decision) === -1) { plan.errores.push('Decisión no válida.'); return plan; }
  const lista = p.CAMPO === 'RESPONSABILIDADES' || p.CAMPO === 'DEFINICIONES';
  let final = decision === 'EDITADA' ? (lista ? renglones_(valor) : String(valor || '').replace(/\r\n/g, '\n').trim()) :
    (lista ? listaJson_(p.PROPUESTA) : String(p.PROPUESTA));
  if (decision === 'EDITADA' && (lista ? !final.length : !final)) { plan.errores.push('Escribe cómo debe quedar.'); return plan; }

  if (p.CAMPO === 'TEXTO' || p.CAMPO === 'RESPONSABLE') {
    const actual = det.actividades.filter(function (a) { return a.id === p.ID_ACTIVIDAD; })[0];
    if (!actividad || !actual) { plan.errores.push('La actividad ya no existe.'); plan.obsoleta = true; return plan; }
    // Si la actividad cambió después del análisis, la propuesta ya no aplica.
    if (p.CAMPO === 'TEXTO' && normalizar_(actual.texto) !== normalizar_(p.VALOR_ANTERIOR)) {
      plan.errores.push('Cambiaste esa actividad después del análisis: vuelve a analizar para tener una propuesta al día.');
      plan.obsoleta = true;
      return plan;
    }
    if (decision !== 'RECHAZADA') {
      if (p.CAMPO === 'TEXTO') {
        if (final.length > L.ACTIVIDAD_MAX) { plan.errores.push('El texto pasa de ' + L.ACTIVIDAD_MAX + ' caracteres.'); return plan; }
        plan.actividad = { TEXTO_FINAL: final };
      } else {
        if (final.length > L.RESPONSABLE_MAX) { plan.errores.push('El puesto es demasiado largo.'); return plan; }
        plan.actividad = cambiosResponsable_(final, puestos);
      }
    }
  } else if (p.CAMPO === 'OBJETIVO' || p.CAMPO === 'ALCANCE') {
    if (decision !== 'RECHAZADA') {
      if (final.length > L.DERIVADO_MAX) { plan.errores.push('Pasa de ' + L.DERIVADO_MAX + ' caracteres.'); return plan; }
      plan.solicitud[p.CAMPO] = final;
    }
  } else if (lista) {
    if (decision !== 'RECHAZADA') {
      if (final.length > L.LINEAS_MAX || final.some(function (x) { return x.length > L.LINEA_MAX; })) {
        plan.errores.push('Máximo ' + L.LINEAS_MAX + ' renglones de hasta ' + L.LINEA_MAX + ' caracteres.');
        return plan;
      }
      plan.solicitud[p.CAMPO] = JSON.stringify(final);
    }
  }
  plan.propuesta = { DECISION: decision, VALOR_FINAL: decision === 'RECHAZADA' ? '' : (lista ? JSON.stringify(final) : final) };
  return plan;
}

function decidirPropuesta_(sesion, idSolicitud, idPropuesta, decision, valor) {
  const fila = filaSolicitud_(idSolicitud);
  if (!permisoSolicitud_(sesion, fila).editar) throw new Error('No puedes editar esta solicitud.');
  const p = leerTabla_('PropuestasIA').filter(function (x) { return x.ID_PROPUESTA === idPropuesta && x.ID_SOLICITUD === idSolicitud; })[0];
  if (!p) throw new Error('No existe esa propuesta.');
  const actividades = leerTabla_('Actividades');
  const det = detalleSolicitud_(fila, actividades, leerTabla_('Imagenes'), tablasSolicitud_(), { editar: true }, formatoFecha_);
  const actividad = actividades.filter(function (a) { return a.ID_ACTIVIDAD === p.ID_ACTIVIDAD && !esActivo_(a.ELIMINADA); })[0];
  const plan = planDecision_(p, decision, valor, actividad, det, leerTabla_('Puestos'));
  if (plan.obsoleta) actualizarFila_('PropuestasIA', p._fila, { DECISION: 'REEMPLAZADA' });
  if (plan.errores.length) throw new Error(plan.errores.join(' '));
  const ahora = new Date();
  actualizarFila_('PropuestasIA', p._fila, Object.assign({ FECHA_DECISION: ahora }, plan.propuesta));
  if (Object.keys(plan.actividad).length) actualizarFila_('Actividades', actividad._fila, Object.assign({ FECHA_ACTUALIZACION: ahora }, plan.actividad));
  if (Object.keys(plan.actividad).length || Object.keys(plan.solicitud).length) {
    return aplicarCambioContenido_(sesion, fila, plan.solicitud, 'Se aceptó una propuesta de la IA');
  }
  return { marca: String(marcaDe_(fila.FECHA_ACTUALIZACION)), estado: fila.ESTADO };
}

/**
 * Las propuestas pendientes de esos campos que se pueden aceptar de una vez (sin tocar Google): las de
 * actividades que no cambiaron después del análisis. Las demás quedan como vencidas.
 */
function planAceptarPropuestas_(propuestas, actividades, det, idSolicitud, campos, puestos) {
  const plan = { aplicar: [], vencidas: [] };
  propuestas.filter(function (p) { return p.ID_SOLICITUD === idSolicitud && campos.indexOf(p.CAMPO) !== -1 && p.DECISION === 'PENDIENTE'; })
    .forEach(function (p) {
      const actividad = p.ID_ACTIVIDAD ? actividades.filter(function (a) { return a.ID_ACTIVIDAD === p.ID_ACTIVIDAD && !esActivo_(a.ELIMINADA); })[0] : null;
      const d = planDecision_(p, 'ACEPTADA', '', actividad, det, puestos || []);
      if (d.errores.length) plan.vencidas.push({ propuesta: p, obsoleta: d.obsoleta });
      else plan.aplicar.push({ propuesta: p, actividad: actividad, plan: d });
    });
  return plan;
}

/** Las correcciones de redacción que se pueden aceptar de una vez. */
function planAceptarRedacciones_(propuestas, actividades, det, idSolicitud) {
  return planAceptarPropuestas_(propuestas, actividades, det, idSolicitud, GRUPOS_PROPUESTA.REDACCION, []);
}

/**
 * «Aceptar todas»: las correcciones de redacción (grupo REDACCION) o lo demás que propuso el análisis
 * (DEMAS: responsables, objetivo, alcance, responsabilidades, definiciones). Una sola llamada y un solo
 * cambio de contenido.
 */
function aceptarPropuestas_(sesion, idSolicitud, grupo) {
  const campos = GRUPOS_PROPUESTA[grupo];
  if (!campos) throw new Error('Grupo de propuestas no válido.');
  const fila = filaSolicitud_(idSolicitud);
  if (!permisoSolicitud_(sesion, fila).editar) throw new Error('No puedes editar esta solicitud.');
  const actividades = leerTabla_('Actividades');
  const det = detalleSolicitud_(fila, actividades, leerTabla_('Imagenes'), tablasSolicitud_(), { editar: true }, formatoFecha_);
  const plan = planAceptarPropuestas_(leerTabla_('PropuestasIA'), actividades, det, idSolicitud, campos, leerTabla_('Puestos'));
  if (!plan.aplicar.length && !plan.vencidas.length) throw new Error('No hay propuestas pendientes de ese tipo.');
  const ahora = new Date();
  const cambiosSolicitud = {};
  plan.vencidas.forEach(function (v) { if (v.obsoleta) actualizarFila_('PropuestasIA', v.propuesta._fila, { DECISION: 'REEMPLAZADA' }); });
  plan.aplicar.forEach(function (x) {
    actualizarFila_('PropuestasIA', x.propuesta._fila, Object.assign({ FECHA_DECISION: ahora }, x.plan.propuesta));
    if (Object.keys(x.plan.actividad).length) actualizarFila_('Actividades', x.actividad._fila, Object.assign({ FECHA_ACTUALIZACION: ahora }, x.plan.actividad));
    Object.assign(cambiosSolicitud, x.plan.solicitud);
  });
  const r = plan.aplicar.length
    ? aplicarCambioContenido_(sesion, fila, cambiosSolicitud, 'Se aceptaron ' + plan.aplicar.length + ' propuestas de la IA')
    : { marca: String(marcaDe_(fila.FECHA_ACTUALIZACION)), estado: fila.ESTADO };
  return Object.assign({ aceptadas: plan.aplicar.length, sinAplicar: plan.vencidas.length }, r);
}

function aceptarRedacciones_(sesion, idSolicitud) {
  return aceptarPropuestas_(sesion, idSolicitud, 'REDACCION');
}

// ─────────────────────────────── Sugerencia mientras se escribe (paso 3) ───────────────────────────────

/** ¿Están prendidas las sugerencias al escribir? (Config → IA_ACTIVA e IA_SUGERIR_AL_ESCRIBIR) */
function sugerenciasActivas_() {
  return obtenerConfig_('IA_ACTIVA', 'NO') === 'SI' && obtenerConfig_('IA_SUGERIR_AL_ESCRIBIR', 'SI') === 'SI';
}

/**
 * La redacción sugerida para UNA actividad mientras se escribe. No escribe nada en la base: la persona
 * decide si la usa (en el editor). Sin datos sensibles hacia la IA; mismas reglas que «Corregir redacción».
 */
function sugerirRedaccion_(sesion, idSolicitud, texto) {
  const fila = filaSolicitud_(idSolicitud);
  if (!permisoSolicitud_(sesion, fila).editar) throw new Error('No puedes editar esta solicitud.');
  if (!sugerenciasActivas_()) return { apagada: true };
  const original = String(texto || '').replace(/\r\n/g, '\n').trim();
  if (original.length < IA_SUGERENCIA_MIN_CARACTERES || original.length > LIMITES_CAPTURA.ACTIVIDAD_MAX) return { texto: original, igual: true };
  const mapa = {};
  const entrada = { nombre: ocultarDatosSensibles_(String(fila.NOMBRE_DOCUMENTO || ''), mapa),
    actividades: [{ id: 'A1', texto: ocultarDatosSensibles_(original, mapa) }], respuestas: [] };
  const prompt = construirPromptRedaccion_(entrada);
  const r = llamarIAJson_({ operacion: 'SUGERENCIA', sistema: prompt.sistema, usuario: prompt.usuario, idSolicitud: idSolicitud, rapido: true });
  const a = validarRedaccion_(entrada, r.datos).analisis.actividades[0];
  return respuestaSugerencia_(original, restaurarDatosSensibles_(a.textoPropuesto, mapa), a.cambios, a.cifrasNuevas);
}

/** Qué ve el editor (sin tocar Google): la sugerencia, si es distinta, y el aviso de cifras nuevas. */
function respuestaSugerencia_(original, propuesta, cambios, cifrasNuevas) {
  const exacto = function (s) { return String(s || '').replace(/\s+/g, ' ').trim(); };
  return { texto: propuesta, igual: exacto(propuesta) === exacto(original), cambios: cambios || '',
    aviso: cifrasNuevas && cifrasNuevas.length ? 'Menciona datos que no estaban en tu texto (' + cifrasNuevas.join(', ') + '): revísala.' : '' };
}

/** Todo lo del paso 4 para la pantalla (lo mismo que devuelve apiAnalisis). */
function pantallaAnalisis_(sesion, idSolicitud) {
  const fila = filaSolicitud_(idSolicitud);
  const permiso = permisoSolicitud_(sesion, fila);
  if (!permiso.ver) throw new Error('No puedes ver esta solicitud.');
  const det = detalleSolicitud_(fila, leerTabla_('Actividades'), leerTabla_('Imagenes'), tablasSolicitud_(), permiso, formatoFecha_);
  const estado = estadoAnalisis_(det, leerTabla_('PropuestasIA'), leerTabla_('Aclaraciones'), obtenerConfig_('IA_ACTIVA', 'NO') === 'SI', formatoFecha_);
  estado.solicitud = { id: det.id, nombre: det.nombre, estado: det.estado, esSuya: fila.ELABORO_ID === sesion.idUsuario };
  // Lo que Procesos observó del objetivo, alcance, etc. (se muestra junto a cada campo).
  estado.observaciones = observacionesDe_(leerTabla_('Observaciones'), idSolicitud, det, formatoFecha_)
    .filter(function (o) { return o.estado !== 'CERRADA'; });
  // Cuándo lanzar el mismo trabajo con otro modelo si la IA no contesta (Config.gs).
  estado.reintentoIa = { esperaSegundos: IA_ESPERA_OTRO_MODELO_S, intentos: IA_INTENTOS_PARALELOS };
  return estado;
}

/** El resultado de una acción con la pantalla ya al día: el navegador no tiene que volver a pedirla. */
function conPantallaAnalisis_(sesion, idSolicitud, resultado) {
  return Object.assign({}, resultado, { paso4: pantallaAnalisis_(sesion, idSolicitud) });
}

/**
 * Lo que la persona dejó escrito en el paso 4 sin guardar (respuestas a preguntas; objetivo, alcance,
 * responsabilidades y definiciones), de una vez antes de otra acción. Se valida todo antes de
 * escribir; al final, un solo cambio de contenido. pendientes: { respuestas: [{ id, texto }], derivados }.
 */
function guardarPendientesAnalisis_(sesion, idSolicitud, pendientes) {
  const p = pendientes || {};
  const fila = filaSolicitud_(idSolicitud);
  if (!permisoSolicitud_(sesion, fila).editar) throw new Error('No puedes editar esta solicitud.');
  const errores = [];
  const respuestas = [];
  const aclaraciones = leerTabla_('Aclaraciones');
  (Array.isArray(p.respuestas) ? p.respuestas : []).forEach(function (r) {
    const q = aclaraciones.filter(function (x) { return x.ID_ACLARACION === r.id && x.ID_SOLICITUD === idSolicitud; })[0];
    if (!q || q.ESTADO === 'REEMPLAZADA' || !String(r.texto || '').trim()) return;
    const plan = planRespuesta_(q, 'RESPONDIDA', r.texto);
    if (plan.errores.length) errores.push(plan.errores.join(' '));
    else respuestas.push({ q: q, plan: plan });
  });
  let cambiosSolicitud = {};
  if (p.derivados) {
    const det = detalleSolicitud_(fila, leerTabla_('Actividades'), leerTabla_('Imagenes'), tablasSolicitud_(), { editar: true }, formatoFecha_);
    const plan = planDerivados_(p.derivados, det);
    if (plan.errores.length) errores.push(plan.errores.join(' '));
    else cambiosSolicitud = plan.solicitud;
  }
  if (errores.length) throw new Error(errores.join(' '));

  const ahora = new Date();
  let cambiaResponsable = false;
  const actividades = respuestas.some(function (r) { return r.plan.responsable; }) ? leerTabla_('Actividades') : [];
  respuestas.forEach(function (r) {
    actualizarFila_('Aclaraciones', r.q._fila, Object.assign({ FECHA_RESPUESTA: ahora }, r.plan.aclaracion));
    if (!r.plan.responsable) return;
    const act = actividades.filter(function (a) { return a.ID_ACTIVIDAD === r.q.ID_ACTIVIDAD && !esActivo_(a.ELIMINADA); })[0];
    if (!act) return;
    actualizarFila_('Actividades', act._fila, Object.assign({ FECHA_ACTUALIZACION: ahora }, cambiosResponsable_(r.plan.responsable, leerTabla_('Puestos'))));
    cambiaResponsable = true;
  });
  if (cambiaResponsable || Object.keys(cambiosSolicitud).length) {
    return aplicarCambioContenido_(sesion, fila, cambiosSolicitud, 'Se guardaron respuestas o textos del análisis');
  }
  return { marca: String(marcaDe_(fila.FECHA_ACTUALIZACION)), estado: fila.ESTADO };
}

/** Responde una pregunta. Si es la del responsable, la respuesta queda como responsable de la actividad. */
function responderAclaracion_(sesion, idSolicitud, idAclaracion, estado, respuesta) {
  const fila = filaSolicitud_(idSolicitud);
  if (!permisoSolicitud_(sesion, fila).editar) throw new Error('No puedes editar esta solicitud.');
  const q = leerTabla_('Aclaraciones').filter(function (x) { return x.ID_ACLARACION === idAclaracion && x.ID_SOLICITUD === idSolicitud; })[0];
  if (!q || q.ESTADO === 'REEMPLAZADA') throw new Error('Esa pregunta ya no está vigente; recarga la página.');
  const plan = planRespuesta_(q, estado, respuesta);
  if (plan.errores.length) throw new Error(plan.errores.join(' '));
  actualizarFila_('Aclaraciones', q._fila, Object.assign({ FECHA_RESPUESTA: new Date() }, plan.aclaracion));
  if (plan.responsable) {
    const actividad = leerTabla_('Actividades').filter(function (a) { return a.ID_ACTIVIDAD === q.ID_ACTIVIDAD && !esActivo_(a.ELIMINADA); })[0];
    if (actividad) {
      actualizarFila_('Actividades', actividad._fila, Object.assign({ FECHA_ACTUALIZACION: new Date() }, cambiosResponsable_(plan.responsable, leerTabla_('Puestos'))));
      return aplicarCambioContenido_(sesion, fila, {}, 'Se indicó un responsable');
    }
  }
  return { marca: String(marcaDe_(fila.FECHA_ACTUALIZACION)), estado: fila.ESTADO };
}

/** Qué escribir al responder (sin tocar Google). */
function planRespuesta_(q, estado, respuesta) {
  const plan = { errores: [], aclaracion: {}, responsable: '' };
  if (['RESPONDIDA', 'NO_APLICA', 'NO_LO_SE'].indexOf(estado) === -1) { plan.errores.push('Respuesta no válida.'); return plan; }
  const texto = String(respuesta || '').replace(/\r\n/g, '\n').trim();
  if (estado === 'RESPONDIDA' && !texto) { plan.errores.push('Escribe la respuesta o elige «No aplica» o «No lo sé».'); return plan; }
  if (texto.length > LIMITES_CAPTURA.RESPUESTA_MAX) { plan.errores.push('La respuesta pasa de ' + LIMITES_CAPTURA.RESPUESTA_MAX + ' caracteres.'); return plan; }
  plan.aclaracion = { ESTADO: estado, RESPUESTA: estado === 'RESPONDIDA' ? texto : '' };
  if (estado === 'RESPONDIDA' && q.TIPO === 'responsable' && q.ID_ACTIVIDAD) {
    if (texto.length > LIMITES_CAPTURA.RESPONSABLE_MAX) { plan.errores.push('El puesto es demasiado largo.'); return plan; }
    plan.responsable = texto;
  }
  return plan;
}

/** Objetivo, alcance, responsabilidades y definiciones escritos por la persona (con o sin IA). */
function planDerivados_(datos, det) {
  const L = LIMITES_CAPTURA;
  const plan = { errores: [], solicitud: {} };
  ['objetivo', 'alcance'].forEach(function (k) {
    if (datos[k] === undefined) return;
    const v = String(datos[k] || '').replace(/\r\n/g, '\n').trim();
    if (v.length > L.DERIVADO_MAX) plan.errores.push('El ' + k + ' pasa de ' + L.DERIVADO_MAX + ' caracteres.');
    else if (v !== det[k]) plan.solicitud[k.toUpperCase()] = v;
  });
  ['responsabilidades', 'definiciones'].forEach(function (k) {
    if (datos[k] === undefined) return;
    const v = renglones_(datos[k]);
    if (v.length > L.LINEAS_MAX || v.some(function (x) { return x.length > L.LINEA_MAX; })) {
      plan.errores.push('Las ' + k + ' admiten hasta ' + L.LINEAS_MAX + ' renglones de ' + L.LINEA_MAX + ' caracteres.');
    } else if (JSON.stringify(v) !== JSON.stringify(det[k])) {
      plan.solicitud[k.toUpperCase()] = JSON.stringify(v);
    }
  });
  return plan;
}

function guardarDerivados_(sesion, idSolicitud, datos) {
  const fila = filaSolicitud_(idSolicitud);
  if (!permisoSolicitud_(sesion, fila).editar) throw new Error('No puedes editar esta solicitud.');
  const det = detalleSolicitud_(fila, leerTabla_('Actividades'), leerTabla_('Imagenes'), tablasSolicitud_(), { editar: true }, formatoFecha_);
  const plan = planDerivados_(datos || {}, det);
  if (plan.errores.length) throw new Error(plan.errores.join(' '));
  if (!Object.keys(plan.solicitud).length) return { marca: String(marcaDe_(fila.FECHA_ACTUALIZACION)), estado: fila.ESTADO };
  return aplicarCambioContenido_(sesion, fila, plan.solicitud, 'Se cambiaron el objetivo, el alcance o las responsabilidades');
}

// ─────────────────────────────── Vista previa y confirmación ───────────────────────────────

/** Lo que falta para poder confirmar (vacío = se puede). */
function faltantesConfirmacion_(det, preguntas) {
  const f = [];
  const conTexto = det.actividades.filter(function (a) { return a.texto.trim(); });
  if (!conTexto.length) f.push('Escribe al menos una actividad.');
  det.actividades.forEach(function (a, i) {
    if (!a.texto.trim()) f.push('La actividad ' + (i + 1) + ' está vacía: escríbela o elimínala.');
    else if (!a.responsable.trim()) f.push('Falta quién realiza la actividad ' + (i + 1) + '.');
  });
  if (det.actualizacion) {
    if (!det.actualizacion.motivos.length) f.push('Marca el motivo del cambio (control de cambios).');
    if (!det.actualizacion.descripcion.trim()) f.push('Describe qué cambió en esta actualización (control de cambios).');
  }
  if (!det.objetivo.trim()) f.push('Falta el objetivo.');
  if (!det.alcance.trim()) f.push('Falta el alcance.');
  const pendientes = preguntas.filter(function (q) { return q.ESTADO === 'PENDIENTE'; }).length;
  if (pendientes) f.push(pendientes === 1 ? 'Falta responder 1 pregunta (puede ser «No aplica» o «No lo sé»).'
    : 'Faltan ' + pendientes + ' preguntas por responder (pueden ser «No aplica» o «No lo sé»).');
  return f;
}

/** Puestos que participan, en el orden en que aparecen (sección «Puestos involucrados»). */
function puestosInvolucrados_(det) {
  const vistos = [];
  det.actividades.forEach(function (a) {
    const p = a.responsable.trim();
    if (p && !vistos.some(function (v) { return normalizar_(v) === normalizar_(p); })) vistos.push(p);
  });
  return vistos;
}

/**
 * «Puestos y responsabilidades» (decisión 25: antes eran dos secciones y se repetían los puestos): cada
 * puesto que participa, en el orden de las actividades, con lo que le toca según las responsabilidades
 * («Puesto: lo que le toca»). Las de un puesto que no aparece en las actividades van al final, tal cual.
 */
function puestosYResponsabilidades_(det) {
  const lineas = det.responsabilidades.map(function (r) {
    const i = r.indexOf(':');
    return i > 0 ? { puesto: r.slice(0, i).trim(), texto: r.slice(i + 1).trim(), linea: r } : { puesto: '', texto: r, linea: r };
  });
  const usadas = [];
  const resultado = puestosInvolucrados_(det).map(function (p) {
    const suyas = [];
    lineas.forEach(function (l, k) {
      if (usadas.indexOf(k) !== -1) return;
      // «Puesto: lo que le toca», o un renglón que solo repite el puesto (no agrega nada).
      const suyo = l.puesto ? normalizar_(l.puesto) === normalizar_(p) : normalizar_(l.texto) === normalizar_(p);
      if (!suyo) return;
      usadas.push(k);
      if (l.puesto && l.texto) suyas.push(l.texto);
    });
    return suyas.length ? p + ': ' + suyas.join('; ') : p;
  });
  return resultado.concat(lineas.filter(function (l, k) { return usadas.indexOf(k) === -1; }).map(function (l) { return l.linea; }));
}

function vistaPrevia_(sesion, idSolicitud) {
  const fila = filaSolicitud_(idSolicitud);
  const permiso = permisoSolicitud_(sesion, fila);
  if (!permiso.ver) throw new Error('No puedes ver esta solicitud.');
  const det = detalleSolicitud_(fila, leerTabla_('Actividades'), leerTabla_('Imagenes'), tablasSolicitud_(), permiso, formatoFecha_);
  const preguntas = leerTabla_('Aclaraciones').filter(function (q) { return q.ID_SOLICITUD === idSolicitud; });
  det.puestos = puestosInvolucrados_(det);
  det.puestosYResponsabilidades = puestosYResponsabilidades_(det);
  det.actualizacion = datosActualizacion_(fila, det, leerTabla_('Documentos'), leerTabla_('Actividades'));
  det.faltantes = permiso.editar ? faltantesConfirmacion_(det, preguntas) : [];
  det.huella = huellaDeDetalle_(det);
  det.confirmada = fila.ESTADO === ESTADOS.CONFIRMADO && det.huella === String(fila.HUELLA_CONFIRMADA);
  det.puedeConfirmar = permiso.editar && fila.ESTADO !== ESTADOS.CONFIRMADO && !det.faltantes.length;
  // Documentos generados (fase 4) y si se puede generar uno con el contenido actual.
  // Al colaborador solo le sirve el PDF (el Word es para Procesos).
  det.archivos = archivosSolicitud_(leerTabla_('Archivos'), idSolicitud, det.huella, formatoFecha_)
    .filter(function (a) { return !soloPdf_(sesion, fila) || a.formato === 'PDF'; });
  det.soloPdf = soloPdf_(sesion, fila);
  det.puedeGenerar = puedeGenerarPreliminar_(sesion, fila) && (fila.ESTADO !== ESTADOS.CONFIRMADO || det.confirmada);
  // Revisión de Procesos (fase 5): sus observaciones y si ya se puede enviar.
  det.observaciones = observacionesDe_(leerTabla_('Observaciones'), idSolicitud, det, formatoFecha_);
  det.revision = String(fila.REVISION || '');
  det.motivoCierre = String(fila.MOTIVO_CIERRE || '');
  det.esSuya = fila.ELABORO_ID === sesion.idUsuario;
  const revisor = leerTabla_('Usuarios').filter(function (u) { return u.ID_USUARIO === fila.REVISOR_ASIGNADO_ID; })[0];
  det.revisor = revisor ? String(revisor.NOMBRE) : '';
  // Autorización en CH (fase 6): quién autorizó, como lo registró Procesos.
  det.autorizo = String(fila.AUTORIZO_NOMBRE || '');
  det.autorizoPuesto = String(fila.AUTORIZO_PUESTO || '');
  det.fechaAutorizacion = marcaDe_(fila.FECHA_AUTORIZACION) ? formatoDia_(new Date(marcaDe_(fila.FECHA_AUTORIZACION))) : '';
  det.puedeEnviar = det.esSuya && fila.ESTADO === ESTADOS.CONFIRMADO && det.confirmada &&
    !det.observaciones.some(function (o) { return o.estado === 'ABIERTA'; });
  return det;
}

/**
 * «Sí, es correcto: enviar a Procesos» (decisión 29): confirma (si hace falta) y la envía a revisión en un
 * solo paso. Si todavía no se puede enviar (observaciones por atender), se queda confirmada y dice qué falta.
 */
function confirmarYEnviar_(sesion, idSolicitud, huellaVista) {
  const fila = filaSolicitud_(idSolicitud);
  const yaConfirmada = fila.ESTADO === ESTADOS.CONFIRMADO && String(fila.HUELLA_CONFIRMADA) === String(huellaVista);
  if (!yaConfirmada) confirmarSolicitud_(sesion, idSolicitud, huellaVista);
  const porAtender = leerTabla_('Observaciones').filter(function (o) { return o.ID_SOLICITUD === idSolicitud && o.ESTADO === 'ABIERTA'; }).length;
  if (porAtender) {
    return { estado: ESTADOS.CONFIRMADO, enviada: false,
      motivo: 'Quedó confirmada, pero antes de enviarla atiende ' + (porAtender === 1 ? 'la observación' : 'las ' + porAtender + ' observaciones') + ' de Procesos.' };
  }
  const r = enviarARevision_(sesion, idSolicitud);
  return { estado: r.estado, enviada: true, revision: r.revision };
}

/**
 * Confirmación del colaborador (§3.4, §3.5): solo si no falta nada y si lo que vio en la vista previa
 * (su huella) es exactamente lo que hay. No equivale al Vo.Bo. de Procesos.
 */
function confirmarSolicitud_(sesion, idSolicitud, huellaVista) {
  const fila = filaSolicitud_(idSolicitud);
  if (!permisoSolicitud_(sesion, fila).editar) throw new Error('No puedes confirmar esta solicitud.');
  if (!transicionValida_(fila.ESTADO, ESTADOS.CONFIRMADO)) {
    throw new Error(fila.ESTADO === ESTADOS.CONFIRMADO ? 'Ya está confirmada.' : 'En este estado no se puede confirmar.');
  }
  const det = detalleSolicitud_(fila, leerTabla_('Actividades'), leerTabla_('Imagenes'), tablasSolicitud_(), { editar: true }, formatoFecha_);
  det.actualizacion = datosActualizacion_(fila, det, leerTabla_('Documentos'), leerTabla_('Actividades'));
  const faltantes = faltantesConfirmacion_(det, leerTabla_('Aclaraciones').filter(function (q) { return q.ID_SOLICITUD === idSolicitud; }));
  if (faltantes.length) throw new Error(faltantes.join(' '));
  const huella = huellaDeDetalle_(det);
  if (huella !== String(huellaVista)) throw new Error('El contenido cambió desde que abriste la vista previa. Revísala de nuevo antes de confirmar.');
  const ahora = marcaDeTiempo_(new Date());
  actualizarFila_('Solicitudes', fila._fila, { ESTADO: ESTADOS.CONFIRMADO, HUELLA_CONTENIDO: huella, HUELLA_CONFIRMADA: huella,
    FECHA_CONFIRMACION: ahora, FECHA_ACTUALIZACION: ahora });
  registrarBitacora_(sesion, 'CONFIRMAR_SOLICITUD', 'El colaborador confirmó que el documento describe el proceso (huella ' +
    huella.slice(0, 12) + '…).', idSolicitud, fila.ESTADO, ESTADOS.CONFIRMADO);
  return { estado: ESTADOS.CONFIRMADO, marca: String(ahora.getTime()) };
}
