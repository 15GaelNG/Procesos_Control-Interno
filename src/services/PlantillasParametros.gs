/**
 * PLANTILLAS Y PARÁMETROS (pantalla del administrador; requerimiento §1: «configurar plantillas, reglas
 * documentales y parámetros del sistema»; decisión 49).
 *
 * Una sola plantilla sirve para todos los tipos de documento (decisión 36): aquí se ve cuál es y cuándo
 * cambió, qué tipos se pueden elegir al crear una solicitud, y los parámetros de la hoja Config, que se
 * cambian sin abrir la hoja. Qué parámetros salen y cómo se validan: PARAMETROS_PANTALLA (Config.gs).
 * El administrador cambia; Soporte CI consulta. Lo puro está probado en tests/parametros.test.js.
 */

/** Los parámetros para la pantalla (sin tocar Google), en el orden de PARAMETROS_PANTALLA. */
function parametrosPantalla_(config) {
  return Object.keys(PARAMETROS_PANTALLA).map(function (clave) {
    const p = PARAMETROS_PANTALLA[clave];
    return { clave: clave, grupo: p.grupo, etiqueta: p.etiqueta, ayuda: p.ayuda, tipo: p.tipo, min: p.min, max: p.max,
      editable: p.editable !== false, valor: config[clave] === undefined ? '' : String(config[clave]) };
  });
}

/**
 * Valida los cambios (sin tocar Google). cambios: { CLAVE: 'valor' }; config: { CLAVE: 'valor actual' }.
 * Devuelve { errores, cambios: [{ clave, antes, despues }] } solo con lo que de verdad cambia.
 */
function planParametros_(cambios, config) {
  const plan = { errores: [], cambios: [] };
  Object.keys(cambios || {}).forEach(function (clave) {
    const p = PARAMETROS_PANTALLA[clave];
    if (!p || p.editable === false) { plan.errores.push('«' + clave + '» no se cambia desde esta pantalla.'); return; }
    let valor = String(cambios[clave] === null || cambios[clave] === undefined ? '' : cambios[clave]).trim();
    if (p.tipo === 'SI_NO') {
      valor = valor.toUpperCase();
      if (valor !== 'SI' && valor !== 'NO') { plan.errores.push(p.etiqueta + ': elige Sí o No.'); return; }
    } else if (p.tipo === 'NUMERO') {
      const n = Number(valor);
      if (valor === '' || isNaN(n) || n < p.min || n > p.max) { plan.errores.push(p.etiqueta + ': escribe un número entre ' + p.min + ' y ' + p.max + '.'); return; }
      valor = String(n);
    } else if (p.tipo === 'CORREOS') {
      const lista = valor.split(/[,;\s]+/).filter(Boolean).map(function (c) { return c.toLowerCase(); });
      const malos = lista.filter(function (c) { return !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(c); });
      if (malos.length) { plan.errores.push(p.etiqueta + ': revisa ' + malos.join(', ') + '.'); return; }
      valor = lista.join(', ');
    } else if (valor.length > 200) {
      plan.errores.push(p.etiqueta + ': es demasiado largo.');
      return;
    }
    const antes = String(config[clave] === undefined ? '' : config[clave]).trim();
    if (antes !== valor) plan.cambios.push({ clave: clave, antes: antes, despues: valor });
  });
  return plan;
}

/** ¿Se puede habilitar o quitar este tipo? (sin tocar Google). Siempre queda al menos uno para elegir. */
function planTipoDocumento_(idTipo, enSistema, tipos) {
  const tipo = tipos.filter(function (t) { return t.ID_TIPO === idTipo; })[0];
  if (!tipo) return { errores: ['Ese tipo de documento no existe.'] };
  const quedan = tipos.filter(function (t) { return esActivo_(t.ACTIVO) && (t.ID_TIPO === idTipo ? enSistema : esActivo_(t.EN_SISTEMA)); }).length;
  if (!quedan) return { errores: ['Debe quedar al menos un tipo de documento que se pueda elegir.'] };
  return { errores: [], tipo: tipo, cambia: esActivo_(tipo.EN_SISTEMA) !== !!enSistema };
}

function pantallaPlantillasParametros_(sesion) {
  const tipos = leerTabla_('TiposDocumento');
  const general = tipos.filter(function (t) { return t.ID_TIPO === TIPO_PLANTILLA_GENERAL; })[0] || {};
  const archivo = function (id) {
    if (!id) return null;
    try {
      const f = DriveApp.getFileById(id);
      return { nombre: f.getName(), url: f.getUrl(), actualizado: formatoFecha_(f.getLastUpdated()) };
    } catch (e) {
      return { nombre: 'No se encontró el archivo (' + id + ')', url: '', actualizado: '' };
    }
  };
  return {
    puedeEditar: sesion.perfiles.indexOf('ADMINISTRADOR') !== -1,
    plantilla: { tipo: String(general.NOMBRE || ''), preliminar: archivo(general.ID_PLANTILLA_PRELIMINAR), final: archivo(general.ID_PLANTILLA_FINAL),
      marcaAgua: obtenerConfig_('MARCA_AGUA_TEXTO', 'COPIA NO AUTORIZADA') },
    tipos: tipos.filter(function (t) { return esActivo_(t.ACTIVO); }).map(function (t) {
      return { id: t.ID_TIPO, nombre: String(t.NOMBRE), prefijo: String(t.PREFIJO_CODIGO || ''), enSistema: esActivo_(t.EN_SISTEMA),
        propia: t.ID_TIPO !== TIPO_PLANTILLA_GENERAL && !!t.ID_PLANTILLA_PRELIMINAR };
    }),
    parametros: parametrosPantalla_(leerConfig_())
  };
}

function guardarParametros_(sesion, cambios) {
  const filas = leerTablaFresca_('Config');
  const config = {};
  filas.forEach(function (f) { if (f.CLAVE) config[String(f.CLAVE).trim()] = String(f.VALOR); });
  const plan = planParametros_(cambios, config);
  if (plan.errores.length) throw new Error(plan.errores.join(' '));
  plan.cambios.forEach(function (c) {
    const fila = filas.filter(function (f) { return String(f.CLAVE).trim() === c.clave; })[0];
    if (fila) actualizarFila_('Config', fila._fila, { VALOR: c.despues });
    else agregarFila_('Config', { CLAVE: c.clave, VALOR: c.despues, DESCRIPCION: PARAMETROS_PANTALLA[c.clave].ayuda });
  });
  if (plan.cambios.length) {
    registrarBitacora_(sesion, 'CAMBIO_PARAMETRO', plan.cambios.map(function (c) { return c.clave + ': «' + c.antes + '» → «' + c.despues + '»'; }).join('; '));
  }
  return { cambios: plan.cambios.length };
}

function cambiarTipoDocumento_(sesion, idTipo, enSistema) {
  const tipos = leerTablaFresca_('TiposDocumento');
  const plan = planTipoDocumento_(String(idTipo || ''), !!enSistema, tipos);
  if (plan.errores.length) throw new Error(plan.errores.join(' '));
  if (plan.cambia) {
    actualizarFila_('TiposDocumento', plan.tipo._fila, { EN_SISTEMA: enSistema ? 'SI' : 'NO' });
    registrarBitacora_(sesion, 'CAMBIO_TIPO_DOCUMENTO', plan.tipo.NOMBRE + (enSistema ? ': se puede elegir.' : ': ya no se puede elegir.'));
  }
  return { enSistema: !!enSistema };
}
