/**
 * CLIENTE DE IA — la única puerta del sistema hacia el proveedor (hoy: API de Gemini).
 *
 * Cambiar de proveedor es cambiar este archivo; el resto del sistema solo llama a
 * llamarIAJson_(). La llave vive en las Propiedades del script (IA_LLAVE) y viaja en un encabezado,
 * nunca en la URL, en la hoja ni en el navegador. Cada llamada queda en la hoja UsoIA.
 */

/**
 * Manda instrucciones + texto y devuelve la respuesta ya convertida de JSON.
 *
 * Si el modelo está saturado (5xx), no existe (404) o no tiene cuota (429), prueba de inmediato con el
 * siguiente modelo disponible (reintentar el mismo llegó a dejar la llamada colgada minutos); solo si
 * es el último reintenta una vez. Cada intento queda en UsoIA.
 * @param {Object} p
 * @param {string} p.operacion   Nombre corto para UsoIA (ANALISIS, REDACCION, PRUEBA…).
 * @param {string} p.sistema     Instrucciones del sistema (reglas fijas).
 * @param {string} p.usuario     El contenido a analizar.
 * @param {string} [p.idSolicitud]
 * @param {boolean} [p.rapido]          Usa la lista de modelos rápidos (corregir redacción).
 * @param {number} [p.desplazamiento]   Intento en paralelo de la pantalla: 1 empieza con el 2.º modelo…
 * @return {{datos: Object, modelo: string, tokensEntrada: number, tokensSalida: number,
 *           duracionMs: number, intentos: string[]}}
 */
function llamarIAJson_(p) {
  const llave = PropertiesService.getScriptProperties().getProperty(PROP.IA_LLAVE);
  if (!llave) throw new Error('Falta la llave de la IA: captura IA_LLAVE en las Propiedades del script.');
  if ((p.sistema + p.usuario).length > IA_MAX_CARACTERES_ENTRADA) {
    throw new Error('El texto es demasiado largo para analizarlo en una sola llamada.');
  }
  reservarLlamadaIA_(p.operacion);

  const intentos = [];
  let ultimoError = null;
  const cache = CacheService.getScriptCache();
  const claveElegido = 'ia-modelo-elegido' + (p.rapido ? '-rapido' : '');
  const modelos = modelosCandidatosIA_(llave, p.rapido, p.desplazamiento);
  for (let m = 0; m < modelos.length; m++) {
    for (let vuelta = 1; vuelta <= 2; vuelta++) {
      try {
        const r = llamarModeloIA_(modelos[m], p, llave);
        intentos.push(modelos[m] + ': OK');
        r.intentos = intentos;
        cache.put(claveElegido, modelos[m], 21600);
        return r;
      } catch (e) {
        ultimoError = e;
        intentos.push(modelos[m] + ': ' + (e.codigoHttp ? 'HTTP ' + e.codigoHttp : e.message));
        if (e.codigoHttp >= 500 && vuelta === 1 && m === modelos.length - 1) { Utilities.sleep(1500); continue; }
        break;
      }
    }
    // No contestó a tiempo: se manda al final de la lista por un rato. Ya no hay tiempo para otro aquí.
    if (ultimoError.tiempoAgotado) {
      cache.put('ia-lento-' + modelos[m], 'SI', IA_HORAS_MODELO_LENTO * 3600);
      if (cache.get(claveElegido) === modelos[m]) cache.remove(claveElegido);
      break;
    }
    // 404 (no existe), 429 (sin cuota) y 5xx (saturado): se intenta con el siguiente modelo.
    const cambiarModelo = ultimoError.codigoHttp === 404 || ultimoError.codigoHttp === 429 || ultimoError.codigoHttp >= 500;
    if (!cambiarModelo) break;
    if (cache.get(claveElegido) === modelos[m]) cache.remove(claveElegido);
  }
  ultimoError.intentos = intentos;
  ultimoError.message += ' (Intentos: ' + intentos.join(' · ') + ')';
  throw ultimoError;
}

/**
 * Lo que se le pide al modelo además del texto: JSON, temperatura baja y topes de respuesta y de
 * «razonamiento» (sin tope, una respuesta puede tardar minutos). conPensamiento = false omite el tope de
 * razonamiento, para los modelos que no lo aceptan.
 */
function configuracionGeneracionIA_(conPensamiento) {
  const c = { responseMimeType: 'application/json', temperature: IA_TEMPERATURA, maxOutputTokens: IA_MAX_TOKENS_SALIDA };
  if (conPensamiento) c.thinkingConfig = { thinkingBudget: IA_PRESUPUESTO_PENSAMIENTO };
  return c;
}

/**
 * Una sola llamada a un modelo. Los errores HTTP llevan `codigoHttp`. Si el modelo rechaza el tope de
 * razonamiento (HTTP 400), se repite una vez sin él y se recuerda para ese modelo.
 */
function llamarModeloIA_(modelo, p, llave) {
  const cache = CacheService.getScriptCache();
  const sinTope = cache.get('ia-sin-tope-pensamiento-' + modelo) === 'SI';
  try {
    return llamarModeloUnaVezIA_(modelo, p, llave, !sinTope);
  } catch (e) {
    if (sinTope || e.codigoHttp !== 400 || !/think/i.test(e.message)) throw e;
    cache.put('ia-sin-tope-pensamiento-' + modelo, 'SI', 21600);
    return llamarModeloUnaVezIA_(modelo, p, llave, false);
  }
}

function llamarModeloUnaVezIA_(modelo, p, llave, conPensamiento) {
  const cuerpo = {
    systemInstruction: { parts: [{ text: p.sistema }] },
    contents: [{ role: 'user', parts: [{ text: p.usuario }] }],
    generationConfig: configuracionGeneracionIA_(conPensamiento)
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
      const error = new Error(mensajeErrorIA_(codigo, json));
      error.codigoHttp = codigo;
      throw error;
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
    if (candidato.finishReason === 'MAX_TOKENS') {
      resultado = 'MAX_TOKENS';
      throw new Error('La respuesta de la IA fue más larga de lo permitido y se cortó. Intenta de nuevo; si se repite, divide el proceso en menos actividades.');
    }
    const datos = extraerJson_(texto);
    if (!datos) {
      resultado = 'JSON_INVALIDO';
      throw new Error('La IA respondió en un formato que no se pudo leer. Intenta de nuevo.');
    }
    return { datos: datos, modelo: modelo, tokensEntrada: tokensEntrada, tokensSalida: tokensSalida,
      duracionMs: Date.now() - inicio };
  } catch (e) {
    // UrlFetchApp corta una llamada que tarda demasiado («Tiempo de espera» / «Timeout»).
    if (!e.codigoHttp && /tiempo de espera|timeout|timed out/i.test(e.message)) {
      resultado = 'TIEMPO_AGOTADO';
      const lento = new Error('La IA (' + modelo + ') tardó demasiado en responder y Google cortó la llamada (' +
        Math.round((Date.now() - inicio) / 1000) + ' s). La próxima vez se usará primero otro modelo.');
      lento.tiempoAgotado = true;
      throw lento;
    }
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

/**
 * Modelos a intentar, en orden: el de Config (IA_MODELO, o IA_MODELO_RAPIDO para la redacción; si está,
 * es el único); si no, el último que funcionó y luego los de la lista (IA_MODELOS_PREFERIDOS o
 * IA_MODELOS_RAPIDOS) que la llave tenga, con los que no contestaron a tiempo al final (máximo
 * IA_MAX_MODELOS). `desplazamiento` rota la lista: el intento en paralelo 1 empieza con el 2.º modelo.
 */
function modelosCandidatosIA_(llave, rapido, desplazamiento) {
  const configurado = obtenerConfig_(rapido ? 'IA_MODELO_RAPIDO' : 'IA_MODELO', '');
  if (configurado) return [configurado];
  const cache = CacheService.getScriptCache();
  let disponibles = cache.get('ia-modelos-disponibles');
  disponibles = disponibles ? JSON.parse(disponibles) : modelosDisponiblesIA_(llave).map(function (m) { return m.id; });
  cache.put('ia-modelos-disponibles', JSON.stringify(disponibles), 21600);
  let candidatos = (rapido ? IA_MODELOS_RAPIDOS : IA_MODELOS_PREFERIDOS).filter(function (m) { return disponibles.indexOf(m) !== -1; });
  const ultimo = cache.get('ia-modelo-elegido' + (rapido ? '-rapido' : ''));
  if (ultimo && candidatos.indexOf(ultimo) !== -1) {
    candidatos.splice(candidatos.indexOf(ultimo), 1);
    candidatos.unshift(ultimo);
  }
  const lento = function (m) { return cache.get('ia-lento-' + m) === 'SI'; };
  candidatos = candidatos.filter(function (m) { return !lento(m); }).concat(candidatos.filter(lento));
  if (!candidatos.length) {
    throw new Error('Ninguno de los modelos preferidos está disponible. Corre listarModelosIA() y captura uno en Config → IA_MODELO.');
  }
  candidatos = candidatos.slice(0, IA_MAX_MODELOS);
  const n = (Number(desplazamiento) || 0) % candidatos.length;
  return candidatos.slice(n).concat(candidatos.slice(0, n));
}

/**
 * Tope diario propio (Config → IA_MAX_LLAMADAS_DIA) para no llegar al límite de Google a media
 * captura. Es un tope suave: vive en la caché del script.
 */
function reservarLlamadaIA_(operacion) {
  // Las sugerencias mientras se escribe llevan su propio tope (son muchas y cortas).
  const sugerencia = operacion === 'SUGERENCIA';
  const tope = Number(sugerencia ? obtenerConfig_('IA_MAX_SUGERENCIAS_DIA', String(IA_MAX_SUGERENCIAS_DIA)) : obtenerConfig_('IA_MAX_LLAMADAS_DIA', '200'));
  const clave = 'ia-' + (sugerencia ? 'sugerencias' : 'llamadas') + '-' + Utilities.formatDate(new Date(), ZONA_HORARIA, 'yyyyMMdd');
  const candado = LockService.getScriptLock();
  candado.waitLock(10000);
  try {
    const cache = CacheService.getScriptCache();
    const usadas = Number(cache.get(clave) || 0);
    if (usadas >= tope) {
      throw new Error(sugerencia ? 'Se llegó al tope de sugerencias al escribir por hoy; puedes usar «Corregir redacción» en el paso 4.'
        : 'Se llegó al tope de ' + tope + ' análisis con IA por hoy. Puedes seguir sin sugerencias.');
    }
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
  if (codigo >= 500) return 'El servicio de IA está saturado o no disponible por ahora (' + codigo + '). Intenta más tarde.' + detalle;
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
