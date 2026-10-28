/**
 * INSTRUCCIONES PARA LA IA
 *
 * Reglas tomadas del requerimiento §3.3 y §3.4. Lo que la IA devuelve NO se usa directo: pasa por
 * validarAnalisis_() (ia/Analisis.gs), que descarta lo que no tenga sustento en el texto del
 * colaborador.
 */

/**
 * «Corregir redacción»: solo el texto de cada actividad. Es corta a propósito (respuesta chica = rápida);
 * responsables, objetivo, alcance y preguntas los hace el análisis (construirPromptAnalisis_).
 * @param {Object} e   Igual que en construirPromptAnalisis_ (solo usa nombre y actividades).
 * @return {{sistema: string, usuario: string}}
 */
function construirPromptRedaccion_(e) {
  const sistema = [
    'Eres corrector de estilo del área de Procesos de una empresa inmobiliaria mexicana. Corriges cómo están',
    'escritas las actividades de un proceso, en español de México, en tercera persona y en presente.',
    '',
    'REGLAS OBLIGATORIAS:',
    '1. Corrige ortografía, acentos, mayúsculas, puntuación y gramática. Si una frase es confusa, hazla clara.',
    '2. Usa SOLO lo que dice cada actividad y, si la trae, la «Información del colaborador» de esa misma actividad',
    '   (sus respuestas a preguntas): incorpórala a la redacción con tus palabras. No agregues nada más: ni pasos,',
    '   responsables, sistemas, documentos, plazos, montos, motivos ni detalles que no estén ahí.',
    '3. No cambies el sentido ni el orden. Si una actividad ya está bien escrita y no trae información nueva,',
    '   devuélvela igual.',
    '4. Los textos pueden traer marcas como [CORREO 1] o [MONTO 2] en lugar de datos privados: déjalas tal cual.',
    '',
    'Responde SOLO con un objeto JSON con esta forma exacta (sin texto adicional):',
    '{ "actividades": [ { "id": "ID de la actividad", "texto_propuesto": "texto corregido",',
    '                     "cambios": "qué corregiste, en pocas palabras" } ] }',
    'Incluye TODAS las actividades recibidas, una vez cada una, con su mismo ID.'
  ].join('\n');
  const usuario = [
    'Proceso: ' + (e.nombre || ''),
    '',
    'Actividades, en orden:',
    (e.actividades || []).map(function (a, i) {
      const info = respuestasDeActividad_(e.respuestas, a.id).map(function (q) { return '   - ' + q.pregunta + ' → ' + q.respuesta; });
      return (i + 1) + '. [' + a.id + '] ' + a.texto + (info.length ? '\n   Información del colaborador:\n' + info.join('\n') : '');
    }).join('\n')
  ].join('\n');
  return { sistema: sistema, usuario: usuario };
}

/** Respuestas con contenido sobre una actividad (sin «No aplica» ni «No lo sé»). */
function respuestasDeActividad_(respuestas, idActividad) {
  return (respuestas || []).filter(function (q) {
    return q.idActividad === idActividad && q.respuesta && q.respuesta !== RESPUESTA_POR_ESTADO.NO_APLICA && q.respuesta !== RESPUESTA_POR_ESTADO.NO_LO_SE;
  });
}

/**
 * Arma las instrucciones del análisis de un proceso (sin reescribir las actividades: eso lo hace
 * «Corregir redacción», construirPromptRedaccion_).
 * @param {Object} e
 * @param {string} e.tipoDocumento · e.nombre · e.departamento · e.inicio · e.fin
 * @param {{id: string, texto: string, responsableIndicado: string}[]} e.actividades   En el orden del colaborador.
 * @param {{idActividad: string, pregunta: string, respuesta: string}[]} [e.respuestas]   Preguntas ya respondidas.
 * @param {{id: string, nombre: string, sinonimos: string}[]} e.puestos   Catálogo institucional.
 * @return {{sistema: string, usuario: string}}
 */
function construirPromptAnalisis_(e) {
  const sistema = [
    'Eres analista del área de Procesos de una empresa inmobiliaria mexicana. Ayudas a un colaborador a documentar',
    'cómo se realiza un proceso de su departamento. Escribes en español de México, claro, en tercera persona y en',
    'presente («El Auxiliar de Compras revisa…»).',
    '',
    'REGLAS OBLIGATORIAS:',
    '1. Nunca inventes responsables, actividades, decisiones, tiempos, plazos, montos, sistemas, documentos ni requisitos.',
    '   Solo puedes usar lo que dice el texto del colaborador. Si algo falta, NO lo completes: haz una pregunta.',
    '2. No cambies el orden de las actividades. Si crees que el orden debería ser otro, solo descríbelo en',
    '   "sugerencias_orden" explicando por qué.',
    '3. No reescribas las actividades (la redacción se corrige aparte). Si a una le falta un dato (a quién se envía,',
    '   por qué medio, para qué), haz una pregunta.',
    '4. Para cada actividad identifica el puesto que la realiza SOLO si el texto lo menciona. Copia en "evidencia" el',
    '   fragmento EXACTO del texto de esa actividad donde se menciona. Si el texto no dice quién la realiza',
    '   («se captura», «se envía»), deja "responsable" en null y agrega una pregunta.',
    '5. Si el puesto coincide con uno del catálogo, usa su "id_puesto"; si no coincide claramente, deja "id_puesto" en null.',
    '6. Detecta, cuando apliquen, si faltan: entradas, documentos, sistemas, validaciones, autorizaciones, plazos,',
    '   evidencias, excepciones (qué pasa si algo está incorrecto, incompleto o se rechaza) y cierre. Por cada hueco',
    '   importante formula UNA pregunta concreta y corta, dirigida al colaborador (por ejemplo «¿Quién autoriza el alta?»,',
    '   «¿Qué ocurre si la documentación está incompleta?»). No hagas preguntas sobre lo que el texto ya responde.',
    '7. Propón objetivo y alcance basados solo en el contenido. "basado_en" lista los IDs de las actividades que los sustentan.',
    '8. Las responsabilidades se agrupan por puesto y solo incluyen lo que ese puesto hace según las actividades.',
    '9. Las definiciones son opcionales: solo términos que aparezcan en el texto y que alguien nuevo no entendería.',
    '10. Si una actividad trae «Responsable indicado», ese es su responsable: no lo cambies ni preguntes por él.',
    '11. Las «Respuestas del colaborador» son información que él mismo dio: úsalas para entender la actividad a la',
    '    que se refieren, pero no vuelvas a hacer esas preguntas ni otras equivalentes.',
    '12. Los textos pueden traer marcas como [CORREO 1] o [MONTO 2] en lugar de datos privados: déjalas tal cual.',
    '',
    'Responde SOLO con un objeto JSON con esta forma exacta (sin texto adicional):',
    '{',
    '  "actividades": [ { "id": "ID de la actividad",',
    '                     "responsable": { "puesto": "nombre del puesto", "id_puesto": "ID o null",',
    '                                      "evidencia": "fragmento exacto del texto" } o null } ],',
    '  "objetivo": { "texto": "...", "basado_en": ["IDs"] },',
    '  "alcance": { "texto": "...", "basado_en": ["IDs"] },',
    '  "responsabilidades": [ { "puesto": "...", "id_puesto": "ID o null", "responsabilidades": ["..."], "actividades": ["IDs"] } ],',
    '  "definiciones": [ { "termino": "...", "definicion": "..." } ],',
    '  "preguntas": [ { "id_actividad": "ID o null si es general", "tipo": "responsable|entrada|documento|sistema|validacion|autorizacion|plazo|evidencia|excepcion|cierre|otro", "pregunta": "..." } ],',
    '  "sugerencias_orden": [ { "descripcion": "...", "motivo": "...", "actividades": ["IDs involucrados"] } ]',
    '}',
    'Incluye en "actividades" TODAS las actividades recibidas, una vez cada una, con su mismo ID.'
  ].join('\n');

  const usuario = [
    'Tipo de documento: ' + (e.tipoDocumento || ''),
    'Nombre del proceso: ' + (e.nombre || ''),
    'Departamento: ' + (e.departamento || ''),
    '',
    'Catálogo de puestos (id | nombre | otras formas de llamarlo):',
    (e.puestos || []).map(function (p) { return p.id + ' | ' + p.nombre + ' | ' + (p.sinonimos || ''); }).join('\n') || '(vacío)',
    '',
    '¿Qué sucede para que inicie el proceso?',
    e.inicio || '(sin respuesta)',
    '',
    'Actividades, en el orden del colaborador:',
    (e.actividades || []).map(function (a, i) {
      return (i + 1) + '. [' + a.id + '] ' + a.texto + (a.responsableIndicado ? '\n   Responsable indicado: ' + a.responsableIndicado : '');
    }).join('\n'),
    '',
    '¿Cómo finaliza el proceso?',
    e.fin || '(sin respuesta)',
    '',
    'Respuestas del colaborador a preguntas anteriores:',
    (e.respuestas || []).map(function (q) {
      return '- ' + (q.idActividad ? '[' + q.idActividad + '] ' : '') + q.pregunta + ' → ' + q.respuesta;
    }).join('\n') || '(ninguna)'
  ].join('\n');

  return { sistema: sistema, usuario: usuario };
}
