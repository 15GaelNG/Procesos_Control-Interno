/**
 * VALIDACIÓN DEL ANÁLISIS DE LA IA
 *
 * La IA propone; este archivo decide qué de lo propuesto tiene sustento (requerimiento §3.3: la IA
 * nunca inventa). No usa servicios de Google, así que se prueba en node (tests/ia-analisis.test.js).
 *
 * Reglas:
 *  - Las actividades salen SIEMPRE en el orden del colaborador y con sus mismos IDs; lo que la IA
 *    agregue de más se descarta y lo que omita se queda con el texto original (§3.4).
 *  - Un responsable solo se acepta si su "evidencia" aparece en el texto de esa actividad. Si no,
 *    se descarta y se pregunta «¿Qué puesto realiza esta actividad?».
 *  - Un puesto solo se liga al catálogo si el ID existe; si el nombre no coincide claramente con el
 *    catálogo, queda marcado para que el colaborador lo confirme.
 *  - Si la redacción propuesta trae cifras que no estaban en el texto original, se avisa.
 */

/**
 * @param {Object} entrada   Lo que se mandó (ver construirPromptAnalisis_).
 * @param {Object} salida    Lo que respondió la IA.
 * @return {{analisis: Object, avisos: string[]}}
 */
function validarAnalisis_(entrada, salida) {
  salida = salida && typeof salida === 'object' ? salida : {};
  const avisos = [];
  const ids = entrada.actividades.map(function (a) { return a.id; });
  const puestos = entrada.puestos || [];
  const porId = {};
  (Array.isArray(salida.actividades) ? salida.actividades : []).forEach(function (a) {
    if (a && ids.indexOf(a.id) !== -1 && !porId[a.id]) porId[a.id] = a;
  });
  const sobrantes = (Array.isArray(salida.actividades) ? salida.actividades : []).filter(function (a) {
    return !a || ids.indexOf(a.id) === -1;
  }).length;
  if (sobrantes) avisos.push('La IA propuso ' + sobrantes + ' actividad(es) que no existían; se descartaron.');

  const preguntas = [];
  const actividades = entrada.actividades.map(function (original) {
    const propuesta = porId[original.id];
    if (!propuesta) {
      avisos.push('La IA no devolvió la actividad ' + original.id + '; se conserva tal como la escribiste.');
      preguntas.push({ idActividad: original.id, tipo: 'responsable', pregunta: PREGUNTA_RESPONSABLE });
      return { id: original.id, textoOriginal: original.texto, textoPropuesto: original.texto, cambios: '',
        responsable: null, cifrasNuevas: [] };
    }
    const textoPropuesto = texto_(propuesta.texto_propuesto) || original.texto;
    const cifrasNuevas = cifrasNuevas_(original.texto, textoPropuesto);
    if (cifrasNuevas.length) {
      avisos.push('La redacción propuesta para ' + original.id + ' menciona datos que no estaban en tu texto (' +
        cifrasNuevas.join(', ') + '). Revísala antes de aceptarla.');
    }
    const responsable = validarResponsable_(propuesta.responsable, original.texto, puestos);
    if (!responsable) {
      if (propuesta.responsable && propuesta.responsable.puesto) {
        avisos.push('Se descartó el responsable «' + propuesta.responsable.puesto + '» de ' + original.id +
          ' porque tu texto no lo menciona.');
      }
      preguntas.push({ idActividad: original.id, tipo: 'responsable', pregunta: PREGUNTA_RESPONSABLE });
    }
    return { id: original.id, textoOriginal: original.texto, textoPropuesto: textoPropuesto,
      cambios: texto_(propuesta.cambios), responsable: responsable, cifrasNuevas: cifrasNuevas };
  });

  (Array.isArray(salida.preguntas) ? salida.preguntas : []).forEach(function (q) {
    const pregunta = texto_(q && q.pregunta);
    if (!pregunta) return;
    const idActividad = q.id_actividad && ids.indexOf(q.id_actividad) !== -1 ? q.id_actividad : null;
    const tipo = TIPOS_PREGUNTA.indexOf(q.tipo) !== -1 ? q.tipo : 'otro';
    // La pregunta de responsable la pone el validador; no se duplica.
    if (tipo === 'responsable' && idActividad && preguntas.some(function (p) { return p.idActividad === idActividad && p.tipo === 'responsable'; })) return;
    if (preguntas.some(function (p) { return normalizar_(p.pregunta) === normalizar_(pregunta); })) return;
    preguntas.push({ idActividad: idActividad, tipo: tipo, pregunta: pregunta });
  });

  const analisis = {
    actividades: actividades,
    objetivo: derivado_(salida.objetivo, ids),
    alcance: derivado_(salida.alcance, ids),
    responsabilidades: (Array.isArray(salida.responsabilidades) ? salida.responsabilidades : [])
      .map(function (r) {
        const puesto = texto_(r && r.puesto);
        const idPuesto = idPuestoValido_(r && r.id_puesto, puestos);
        // Solo las actividades donde ESTE puesto quedó como responsable aceptado.
        const acts = actividades.filter(function (a) {
          return a.responsable && (Array.isArray(r && r.actividades) ? r.actividades : []).indexOf(a.id) !== -1 &&
            ((idPuesto && a.responsable.idPuesto === idPuesto) || normalizar_(a.responsable.puesto) === normalizar_(puesto));
        }).map(function (a) { return a.id; });
        return { puesto: puesto, idPuesto: idPuesto,
          responsabilidades: (Array.isArray(r && r.responsabilidades) ? r.responsabilidades : []).map(texto_).filter(Boolean),
          actividades: acts };
      })
      .filter(function (r) { return r.puesto && r.actividades.length && r.responsabilidades.length; }),
    definiciones: (Array.isArray(salida.definiciones) ? salida.definiciones : [])
      .map(function (d) { return { termino: texto_(d && d.termino), definicion: texto_(d && d.definicion) }; })
      .filter(function (d) { return d.termino && d.definicion && aparece_(d.termino, textoCompleto_(entrada)); }),
    preguntas: preguntas,
    sugerenciasOrden: (Array.isArray(salida.sugerencias_orden) ? salida.sugerencias_orden : [])
      .map(function (s) {
        return { descripcion: texto_(s && s.descripcion), motivo: texto_(s && s.motivo),
          actividades: (Array.isArray(s && s.actividades) ? s.actividades : []).filter(function (id) { return ids.indexOf(id) !== -1; }) };
      })
      .filter(function (s) { return s.descripcion && s.motivo; })
  };
  return { analisis: analisis, avisos: avisos };
}

/** Responsable aceptado o null. requiereConfirmacion = no se pudo ligar con certeza al catálogo. */
function validarResponsable_(r, textoActividad, puestos) {
  if (!r || !texto_(r.puesto) || !texto_(r.evidencia)) return null;
  if (!aparece_(r.evidencia, textoActividad)) return null;
  const evidencia = texto_(r.evidencia);
  const mencionado = function (p) {
    return nombresDelPuesto_(p).some(function (n) { return aparece_(n, evidencia); });
  };
  // 1) El ID que propuso la IA, si ese puesto se menciona en la evidencia o se llama igual.
  const idPuesto = idPuestoValido_(r.id_puesto, puestos);
  let delCatalogo = idPuesto ? puestos.filter(function (p) {
    return p.id === idPuesto && (mencionado(p) || nombresDelPuesto_(p).some(function (n) { return normalizar_(n) === normalizar_(r.puesto); }));
  })[0] : null;
  // 2) Si no, el único puesto del catálogo que la evidencia menciona. Dos o más = ambiguo.
  if (!delCatalogo) {
    const candidatos = puestos.filter(mencionado);
    if (candidatos.length === 1) delCatalogo = candidatos[0];
  }
  return {
    puesto: delCatalogo ? delCatalogo.nombre : texto_(r.puesto),
    idPuesto: delCatalogo ? delCatalogo.id : null,
    evidencia: evidencia,
    requiereConfirmacion: !delCatalogo
  };
}

function idPuestoValido_(id, puestos) {
  return id && puestos.some(function (p) { return p.id === id; }) ? id : null;
}

function nombresDelPuesto_(p) {
  return [p.nombre].concat(String(p.sinonimos || '').split(',')).map(texto_).filter(Boolean);
}

function derivado_(d, ids) {
  if (!d || !texto_(d.texto)) return null;
  return { texto: texto_(d.texto),
    basadoEn: (Array.isArray(d.basado_en) ? d.basado_en : []).filter(function (id) { return ids.indexOf(id) !== -1; }) };
}

/** Cifras (números, horas, porcentajes) de la propuesta que no estaban en el original. */
function cifrasNuevas_(original, propuesto) {
  const enOriginal = (String(original).match(/\d+(?:[.,:]\d+)*/g) || []);
  return (String(propuesto).match(/\d+(?:[.,:]\d+)*/g) || []).filter(function (c, i, todas) {
    return enOriginal.indexOf(c) === -1 && todas.indexOf(c) === i;
  });
}

function textoCompleto_(e) {
  return [e.inicio, e.fin].concat(e.actividades.map(function (a) { return a.texto; })).join(' ');
}

/** ¿El fragmento aparece en el texto? Sin importar mayúsculas, acentos, puntuación ni espacios. */
function aparece_(fragmento, texto) {
  const f = normalizar_(fragmento);
  return !!f && normalizar_(texto).indexOf(f) !== -1;
}

function normalizar_(s) {
  return String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9ñ]+/g, ' ').trim();
}

function texto_(v) {
  return v === null || v === undefined ? '' : String(v).trim();
}
