/**
 * PRUEBA DE CONCEPTO DE LA IA (fase 0) — se corre a mano desde el editor.
 *
 *   listarModelosIA()  → qué modelos tiene disponibles la llave de este ambiente.
 *   probarIA()         → analiza un proceso de EJEMPLO (inventado, con huecos a propósito) y muestra
 *                        qué propuso la IA, qué descartó el validador y qué preguntaría al colaborador.
 *
 * No escribe nada en la base salvo el renglón de UsoIA de cada llamada. Funciona aunque
 * Config → IA_ACTIVA esté en NO: es un diagnóstico.
 */

function listarModelosIA() {
  const llave = PropertiesService.getScriptProperties().getProperty(PROP.IA_LLAVE);
  if (!llave) throw new Error('Falta IA_LLAVE en las Propiedades del script.');
  const modelos = modelosDisponiblesIA_(llave);
  const preferidos = IA_MODELOS_PREFERIDOS.filter(function (m) {
    return modelos.some(function (d) { return d.id === m; });
  });
  Logger.log('Modelos disponibles para generar texto (' + modelos.length + '):\n' +
    modelos.map(function (m) { return '  · ' + m.id + (m.nombre ? '  (' + m.nombre + ')' : ''); }).join('\n'));
  Logger.log(preferidos.length
    ? 'Se usará: ' + (obtenerConfig_('IA_MODELO', '') || preferidos[0]) + (obtenerConfig_('IA_MODELO', '') ? ' (fijado en Config → IA_MODELO)' : ' (primero de la lista de preferidos)')
    : 'Ninguno de los preferidos está disponible: captura uno de la lista en Config → IA_MODELO.');
  return modelos;
}

function probarIA() {
  const entrada = procesoDeEjemplo_();
  const prompt = construirPromptAnalisis_(entrada);
  const r = llamarIAJson_({ operacion: 'PRUEBA', sistema: prompt.sistema, usuario: prompt.usuario });
  const v = validarAnalisis_(entrada, r.datos);
  const a = v.analisis;

  const lineas = [];
  lineas.push('MODELO: ' + r.modelo + ' · ' + r.duracionMs + ' ms · tokens: ' + r.tokensEntrada + ' entrada / ' + r.tokensSalida + ' salida');
  lineas.push('INTENTOS: ' + r.intentos.join(' · '));
  lineas.push('');
  lineas.push('ACTIVIDADES (en el orden del colaborador):');
  a.actividades.forEach(function (act, i) {
    lineas.push((i + 1) + '. Original:  ' + act.textoOriginal);
    lineas.push('   Propuesta: ' + act.textoPropuesto + (act.cambios ? '   [' + act.cambios + ']' : ''));
    lineas.push('   Responsable: ' + (act.responsable
      ? act.responsable.puesto + (act.responsable.idPuesto ? ' (' + act.responsable.idPuesto + ')' : '') +
        (act.responsable.requiereConfirmacion ? ' — pedir confirmación' : '') + ' · evidencia: «' + act.responsable.evidencia + '»'
      : '— (se pregunta al colaborador)'));
  });
  lineas.push('');
  lineas.push('OBJETIVO: ' + (a.objetivo ? a.objetivo.texto : '—'));
  lineas.push('ALCANCE:  ' + (a.alcance ? a.alcance.texto : '—'));
  lineas.push('');
  lineas.push('RESPONSABILIDADES:');
  a.responsabilidades.forEach(function (resp) {
    lineas.push('  · ' + resp.puesto + ': ' + resp.responsabilidades.join(' / '));
  });
  lineas.push('');
  lineas.push('PREGUNTAS PARA EL COLABORADOR (' + a.preguntas.length + '):');
  a.preguntas.forEach(function (q) {
    lineas.push('  · [' + q.tipo + (q.idActividad ? ' · ' + q.idActividad : '') + '] ' + q.pregunta);
  });
  if (a.sugerenciasOrden.length) {
    lineas.push('');
    lineas.push('SUGERENCIAS DE ORDEN (no se aplican solas):');
    a.sugerenciasOrden.forEach(function (s) { lineas.push('  · ' + s.descripcion + ' — ' + s.motivo); });
  }
  if (a.definiciones.length) {
    lineas.push('');
    lineas.push('DEFINICIONES: ' + a.definiciones.map(function (d) { return d.termino; }).join(', '));
  }
  lineas.push('');
  lineas.push('AVISOS DEL VALIDADOR (' + v.avisos.length + '):');
  (v.avisos.length ? v.avisos : ['ninguno']).forEach(function (x) { lineas.push('  · ' + x); });

  Logger.log(lineas.join('\n'));
  return v;
}

/**
 * Proceso INVENTADO para la prueba. Tiene huecos a propósito: la actividad 2 y la 4 no dicen quién
 * las hace, no se sabe qué pasa si faltan documentos y no se dice qué sistema se usa.
 */
function procesoDeEjemplo_() {
  return {
    tipoDocumento: 'Procedimiento',
    nombre: 'Alta de proveedores (EJEMPLO DE PRUEBA)',
    departamento: 'Compras',
    inicio: 'cuando un area pide dar de alta un proveedor nuevo por correo',
    fin: 'cuando el proveedor ya queda activo y el area ya puede pedirle cosas',
    actividades: [
      { id: 'ACT-1', texto: 'el auxiliar de compras recibe la solicitud y checa que traiga la constancia de situacion fiscal y el estado de cuenta' },
      { id: 'ACT-2', texto: 'se capturan los datos del proveedor en el sistema' },
      { id: 'ACT-3', texto: 'el jefe de compras revisa la captura y si esta bien la autoriza' },
      { id: 'ACT-4', texto: 'se le avisa al area que lo pidio' }
    ],
    puestos: [
      { id: 'PUE-0001', nombre: 'Auxiliar de Compras', sinonimos: 'auxiliar de compras, aux. compras' },
      { id: 'PUE-0002', nombre: 'Jefe de Compras', sinonimos: 'jefe de compras, responsable de compras' },
      { id: 'PUE-0003', nombre: 'Analista de Tesorería', sinonimos: 'tesorería' }
    ]
  };
}
