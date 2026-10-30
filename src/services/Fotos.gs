/**
 * FOTOS DE PERFIL DE GOOGLE (decisión 40), igual que en SIVET: salen del directorio de la organización
 * con el servicio avanzado People (appsscript.json). La app corre como su dueño, así que ese permiso lo da
 * él una vez corriendo autorizarFotos() en el editor.
 *
 * Son solo para mostrar: se guardan en la caché del script, nunca en la hoja. Quien no tiene foto propia,
 * o si el directorio falla, sigue viendo sus iniciales. Los correos siempre salen de la sesión o de la hoja
 * Usuarios, no de lo que mande el navegador, para que no sirva para consultar a cualquiera.
 * Lo puro está probado en tests/fotos.test.js.
 */

/** La URL de la foto de `correo` en la respuesta del directorio; '' si no tiene (la silueta genérica no cuenta). */
function fotoDeRespuesta_(respuesta, correo) {
  const persona = ((respuesta && respuesta.people) || []).filter(function (p) {
    return (p.emailAddresses || []).some(function (e) { return String(e.value || '').trim().toLowerCase() === correo; });
  })[0];
  if (!persona) return '';
  const fotos = (persona.photos || []).filter(function (f) { return f.url && !f.default; });
  if (!fotos.length) return '';
  const foto = fotos.filter(function (f) { return f.metadata && f.metadata.primary; })[0] || fotos[0];
  // Las URLs de Google traen el tamaño al final (=s100): se pide del tamaño del avatar, recortada.
  return foto.url.replace(/=s\d+(-c)?$/, '') + '=s' + FOTO_PERFIL_PX + '-c';
}

function fotoDirectorio_(correo) {
  return fotoDeRespuesta_(People.People.searchDirectoryPeople({
    query: correo,
    readMask: 'emailAddresses,photos',
    sources: ['DIRECTORY_SOURCE_TYPE_DOMAIN_PROFILE']
  }), correo);
}

/**
 * Las fotos de estos correos: { fotos: { correo: url }, faltan }. Primero las de la caché; de las demás, a
 * lo más FOTOS_POR_LLAMADA al directorio (`faltan` dice cuántas quedan para la siguiente llamada). Si el
 * directorio falla no se insiste: esos correos no vienen en `fotos` y no se recuerda nada.
 */
function fotosDe_(correos) {
  const unicos = [];
  (correos || []).forEach(function (c) {
    const correo = String(c || '').trim().toLowerCase();
    if (correo && unicos.indexOf(correo) === -1) unicos.push(correo);
  });
  const clave = function (correo) { return 'foto_' + correo; };
  const cache = CacheService.getScriptCache();
  const guardadas = unicos.length ? cache.getAll(unicos.map(clave)) : {};
  const fotos = {};
  const pendientes = unicos.filter(function (correo) {
    const guardada = guardadas[clave(correo)];
    if (guardada === undefined || guardada === null) return true;
    fotos[correo] = JSON.parse(guardada).url;
    return false;
  });
  const ahora = pendientes.slice(0, FOTOS_POR_LLAMADA);
  for (let i = 0; i < ahora.length; i++) {
    let url = '';
    try {
      url = fotoDirectorio_(ahora[i]);
    } catch (e) {
      console.log('[FOTOS] El directorio no respondió: ' + e.message);
      return { fotos: fotos, faltan: 0 };
    }
    fotos[ahora[i]] = url;
    cache.put(clave(ahora[i]), JSON.stringify({ url: url }), FOTO_CACHE_SEGUNDOS);
  }
  return { fotos: fotos, faltan: pendientes.length - ahora.length };
}

/** Correr una vez en el editor (en cada ambiente): pide el permiso de leer el directorio y lo comprueba. */
function autorizarFotos() {
  soloEditor_();
  // Google deja aceptar los permisos por casilla: si falta alguno, aquí termina y abre la ventana para aceptarlo.
  ScriptApp.requireAllScopes(ScriptApp.AuthMode.FULL);
  const correo = String(Session.getActiveUser().getEmail() || '').trim().toLowerCase();
  try {
    const url = fotoDirectorio_(correo);
    Logger.log(url ? 'Listo. Foto de ' + correo + ': ' + url
      : 'Listo, pero ' + correo + ' no tiene foto propia en su cuenta de Google (sale con sus iniciales).');
  } catch (e) {
    Logger.log('No se pudo leer el directorio: ' + e.message + (/directory\.readonly/.test(e.message)
      ? '\nGoogle no le dio este permiso al proyecto aunque ya se pidieron todos: manda esta captura a quien da soporte al sistema.'
      : '\nSi dice que el directorio no está compartido, un administrador de Google Workspace debe activar «Compartir contactos» (Directorio › Configuración del directorio › Compartir).'));
  }
}
