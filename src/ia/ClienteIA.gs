/**
 * CLIENTE DE IA — la única puerta del sistema hacia el proveedor (hoy: API de Gemini).
 *
 * Cambiar de proveedor es cambiar este archivo; el resto del sistema solo llama a
 * llamarIAJson_(). La llave vive en las Propiedades del script (IA_LLAVE) y viaja en un encabezado,
 * nunca en la URL, en la hoja ni en el navegador. Cada llamada queda en la hoja UsoIA.
 */

/**
 * Manda instrucciones + texto y devuelve la respuesta ya convertida de JSON.
 * @param {Object} p
 * @param {string} p.operacion   Nombre corto para UsoIA (ANALISIS, REDACCION, PRUEBA…).
 * @param {string} p.sistema     Instrucciones del sistema (reglas fijas).
 * @param {string} p.usuario     El contenido a analizar.
 * @param {string} [p.idSolicitud]
 * @return {{datos: Object, modelo: string, tokensEntrada: number, tokensSalida: number, duracionMs: number}}
 */
function llamarIAJson_(p) {
  const llave = PropertiesService.getScriptProperties().getProperty(PROP.IA_LLAVE);
  if (!llave) throw new Error('Falta la llave de la IA: captura IA_LLAVE en las Propiedades del script.');
  if ((p.sistema + p.usuario).length > IA_MAX_CARACTERES_ENTRADA) {
    throw new Error('El texto es demasiado largo para analizarlo en una sola llamada.');
  }
  reservarLlamadaIA_();

  const modelo = elegirModeloIA_(llave);
  const cuerpo = {
    systemInstruction: { parts: [{ text: p.sistema }] },
    contents: [{ role: 'user', parts: [{ text: p.usuario }] }],
    generationConfig: { responseMimeType: 'application/json' }
  };
  const inicio = Date.now();
  let resultado = 'OK';
  let tokensEntrada = 0;
  let tokensSalida = 0;
  try {
    const resp = UrlFetchApp.fetch(IA_URL_BASE + '/models/' + encodeURIComponent(modelo) + ':generateContent', {
      method: 'post',
      contentType: 'application/json',
      headers: { 'x-goog-api-key': llave },
      payload: JSON.stringify(cuerpo),
      muteHttpExceptions: true
    });
    const codigo = resp.getResponseCode();
    const json = leerJsonSeguro_(resp.getContentText());
    if (codigo !== 200) {
      resultado = 'HTTP ' + codigo;
      throw new Error(mensajeErrorIA_(codigo, json));
    }
    const uso = json.usageMetadata || {};
    tokensEntrada = uso.promptTokenCount || 0;
    tokensSalida = uso.candidatesTokenCount || 0;

    if (json.promptFeedback && json.promptFeedback.blockReason) {
      resultado = 'BLOQUEADO';
      throw new Error('La IA no procesó el texto (motivo: ' + json.promptFeedback.blockReason + ').');
    }
    const candidato = (json.candidates || [])[0];
    const texto = candidato && candidato.content && candidato.content.parts
      ? candidato.content.parts.filter(function (parte) { return !parte.thought && parte.text; })
          .map(function (parte) { return parte.text; }).join('')
      : '';
    if (!texto) {
      resultado = 'SIN_RESPUESTA';
      throw new Error('La IA no devolvió respuesta' + (candidato && candidato.finishReason ? ' (' + candidato.finishReason + ')' : '') + '.');
    }
    const datos = extraerJson_(texto);
    if (!datos) {
      resultado = 'JSON_INVALIDO';
      throw new Error('La IA respondió en un formato que no se pudo leer. Intenta de nuevo.');
    }
    return { datos: datos, modelo: modelo, tokensEntrada: tokensEntrada, tokensSalida: tokensSalida,
      duracionMs: Date.now() - inicio };
  } catch (e) {
    if (resultado === 'OK') resultado = 'ERROR';
    throw e;
  } finally {
    registrarUsoIA_(p, modelo, tokensEntrada, tokensSalida, Date.now() - inicio, resultado);
  }
}

/** Modelos de la llave que sirven para generar texto, como los da Google. */
function modelosDisponiblesIA_(llave) {
  const modelos = [];
  let pagina = '';
  do {
    const resp = UrlFetchApp.fetch(IA_URL_BASE + '/models?pageSize=1000' + (pagina ? '&pageToken=' + encodeURIComponent(pagina) : ''), {
      headers: { 'x-goog-api-key': llave },
      muteHttpExceptions: true
    });
    const json = leerJsonSeguro_(resp.getContentText());
    if (resp.getResponseCode() !== 200) throw new Error(mensajeErrorIA_(resp.getResponseCode(), json));
    (json.models || []).forEach(function (m) {
      if ((m.supportedGenerationMethods || []).indexOf('generateContent') !== -1) {
        modelos.push({ id: String(m.name).replace(/^models\//, ''), nombre: m.displayName || '' });
      }
    });
    pagina = json.nextPageToken || '';
  } while (pagina);
  return modelos;
}

/** El de Config → IA_MODELO o, si está vacío, el primero de IA_MODELOS_PREFERIDOS disponible. */
function elegirModeloIA_(llave) {
  const configurado = obtenerConfig_('IA_MODELO', '');
  if (configurado) return configurado;
  const cache = CacheService.getScriptCache();
  const guardado = cache.get('ia-modelo-elegido');
  if (guardado) return guardado;
  const disponibles = modelosDisponiblesIA_(llave).map(function (m) { return m.id; });
  const elegido = IA_MODELOS_PREFERIDOS.filter(function (m) { return disponibles.indexOf(m) !== -1; })[0];
  if (!elegido) {
    throw new Error('Ninguno de los modelos preferidos está disponible. Corre listarModelosIA() y captura uno en Config → IA_MODELO.');
  }
  cache.put('ia-modelo-elegido', elegido, 21600);
  return elegido;
}

/**
 * Tope diario propio (Config → IA_MAX_LLAMADAS_DIA) para no llegar al límite de Google a media
 * captura. Es un tope suave: vive en la caché del script.
 */
function reservarLlamadaIA_() {
  const tope = Number(obtenerConfig_('IA_MAX_LLAMADAS_DIA', '200'));
  const clave = 'ia-llamadas-' + Utilities.formatDate(new Date(), ZONA_HORARIA, 'yyyyMMdd');
  const candado = LockService.getScriptLock();
  candado.waitLock(10000);
  try {
    const cache = CacheService.getScriptCache();
    const usadas = Number(cache.get(clave) || 0);
    if (usadas >= tope) throw new Error('Se llegó al tope de ' + tope + ' análisis con IA por hoy. Puedes seguir sin sugerencias.');
    cache.put(clave, String(usadas + 1), 90000);
  } finally {
    candado.releaseLock();
  }
}

function registrarUsoIA_(p, modelo, tokensEntrada, tokensSalida, duracionMs, resultado) {
  try {
    agregarFila_('UsoIA', {
      FECHA: new Date(),
      USUARIO: Session.getActiveUser().getEmail() || Session.getEffectiveUser().getEmail(),
      ID_SOLICITUD: p.idSolicitud || '',
      OPERACION: p.operacion || '',
      PROVEEDOR: 'GEMINI',
      MODELO: modelo || '',
      TOKENS_ENTRADA: String(tokensEntrada),
      TOKENS_SALIDA: String(tokensSalida),
      DURACION_MS: String(duracionMs),
      RESULTADO: resultado
    });
  } catch (e) {
    // Que falle la bitácora no debe tirar el análisis.
    console.error('No se pudo registrar UsoIA: ' + e.message);
  }
}

function mensajeErrorIA_(codigo, json) {
  const detalle = json && json.error && json.error.message ? ' Detalle: ' + json.error.message : '';
  if (codigo === 400) return 'La IA rechazó la solicitud (400).' + detalle;
  if (codigo === 401 || codigo === 403) return 'La llave de la IA no es válida o no tiene permiso (' + codigo + '). Revisa IA_LLAVE.' + detalle;
  if (codigo === 404) return 'El modelo de IA no existe o ya no está disponible (404). Revisa Config → IA_MODELO o corre listarModelosIA().' + detalle;
  if (codigo === 429) return 'Se alcanzó el límite de uso de la IA (429). Espera un momento o mañana se renueva la cuota.' + detalle;
  if (codigo >= 500) return 'El servicio de IA no está disponible por ahora (' + codigo + '). Intenta más tarde.';
  return 'Error de la IA (' + codigo + ').' + detalle;
}

function leerJsonSeguro_(texto) {
  try { return JSON.parse(texto); } catch (e) { return {}; }
}

/** Convierte la respuesta en objeto aunque venga envuelta en ```json ... ```. */
function extraerJson_(texto) {
  const limpio = String(texto).trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '');
  try { return JSON.parse(limpio); } catch (e) { /* se intenta con el primer objeto que aparezca */ }
  const inicio = limpio.indexOf('{');
  const fin = limpio.lastIndexOf('}');
  if (inicio === -1 || fin <= inicio) return null;
  try { return JSON.parse(limpio.slice(inicio, fin + 1)); } catch (e) { return null; }
}
