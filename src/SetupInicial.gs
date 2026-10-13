/**
 * INSTALACIÓN Y VERIFICACIÓN DE LA BASE
 *
 * Se corre a mano desde el editor de Apps Script del proyecto ligado a cada hoja:
 *   - BD Procesos - PRUEBAS  →  instalarPruebas()
 *   - BD Procesos            →  instalarProduccion()
 *
 * Es seguro correrla varias veces: crea lo que falte (hojas, columnas al final, carpetas, filas
 * semilla) y nunca borra ni reescribe datos. Si un proyecto ya quedó instalado como un ambiente,
 * se niega a instalarlo como el otro (para no mezclar PRUEBAS con PRODUCCIÓN).
 *
 * verificarBase() solo revisa y reporta; no cambia nada.
 */

function instalarPruebas() {
  return instalarBase_(AMBIENTES.PRUEBAS.clave);
}

function instalarProduccion() {
  return instalarBase_(AMBIENTES.PRODUCCION.clave);
}

function instalarBase_(claveAmbiente) {
  const ambiente = AMBIENTES[claveAmbiente];
  const props = PropertiesService.getScriptProperties();
  const instalado = props.getProperty(PROP.AMBIENTE);
  if (instalado && instalado !== ambiente.clave) {
    throw new Error('Este proyecto ya está instalado como ' + instalado + '. No se puede instalar como ' +
      ambiente.clave + ': cada ambiente tiene su propia hoja y su propio proyecto.');
  }
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  if (!ss) throw new Error('Corre esta función desde el Apps Script ligado a la hoja de la base de datos.');

  const resumen = { ambiente: ambiente.clave, hojasCreadas: [], columnasAgregadas: [], filasSemilla: [], carpetas: [] };
  const candado = LockService.getScriptLock();
  candado.waitLock(30000);
  try {

    ss.rename(ambiente.nombreBD);
    ss.setSpreadsheetTimeZone(ZONA_HORARIA);

    ESQUEMA_BD.forEach(function (def, i) {
      const r = asegurarHoja_(ss, def);
      if (r.creada) resumen.hojasCreadas.push(def.hoja);
      if (r.columnasAgregadas.length) resumen.columnasAgregadas.push(def.hoja + ': ' + r.columnasAgregadas.join(', '));
      if (r.filasSemilla) resumen.filasSemilla.push(def.hoja + ': ' + r.filasSemilla);
      ss.setActiveSheet(r.hoja);
      ss.moveActiveSheet(i + 1);
    });
    quitarHojasVaciasPorDefecto_(ss);
    ss.setActiveSheet(ss.getSheetByName(ESQUEMA_BD[0].hoja));

    // Carpetas de Drive. Se guardan por ID en las Propiedades del script.
    const proyecto = DriveApp.getFolderById(ID_CARPETA_PROYECTO);
    asegurarCarpeta_(proyecto, CARPETA_DOCUMENTACION, null,
      'Documentación del proyecto: requerimientos, plantilla original y manuales.');
    const carpetaAmbiente = asegurarCarpeta_(proyecto, ambiente.carpeta, props.getProperty(PROP.ID_CARPETA_AMBIENTE),
      'Ambiente ' + ambiente.clave + ' del ' + APP_NOMBRE_LARGO + '.');
    const nuevasProps = {};
    nuevasProps[PROP.AMBIENTE] = ambiente.clave;
    nuevasProps[PROP.ID_BD] = ss.getId();
    nuevasProps[PROP.ID_CARPETA_AMBIENTE] = carpetaAmbiente.getId();
    resumen.carpetas.push(ambiente.carpeta + ' → ' + carpetaAmbiente.getId());
    CARPETAS_AMBIENTE.forEach(function (c) {
      const carpeta = asegurarCarpeta_(carpetaAmbiente, c.nombre, props.getProperty(c.propiedad), c.descripcion);
      nuevasProps[c.propiedad] = carpeta.getId();
      resumen.carpetas.push(ambiente.carpeta + '/' + c.nombre + ' → ' + carpeta.getId());
    });
    props.setProperties(nuevasProps);

    // La base de datos vive en la carpeta de su ambiente.
    const archivoBD = DriveApp.getFileById(ss.getId());
    if (!archivoBD.getParents().hasNext() || archivoBD.getParents().next().getId() !== carpetaAmbiente.getId()) {
      archivoBD.moveTo(carpetaAmbiente);
    }

    SpreadsheetApp.flush();
  } finally {
    candado.releaseLock();
  }

  // Fuera del bloqueo: siguienteId_ toma el suyo.
  resumen.administrador = registrarInstalador_();
  Logger.log(JSON.stringify(resumen, null, 2));
  return resumen;
}

/** Revisa que la hoja y las propiedades coincidan con el esquema. No cambia nada. */
function verificarBase() {
  const ss = obtenerBD_();
  const props = PropertiesService.getScriptProperties().getProperties();
  const problemas = [];

  ESQUEMA_BD.forEach(function (def) {
    const hoja = ss.getSheetByName(def.hoja);
    if (!hoja) { problemas.push('Falta la hoja ' + def.hoja); return; }
    const encabezados = leerEncabezados_(hoja);
    def.columnas.forEach(function (col) {
      if (encabezados.indexOf(col) === -1) problemas.push(def.hoja + ': falta la columna ' + col);
    });
    encabezados.forEach(function (col) {
      if (col && def.columnas.indexOf(col) === -1) problemas.push(def.hoja + ': columna que no está en el esquema: ' + col);
    });
  });

  [PROP.AMBIENTE, PROP.ID_BD, PROP.ID_CARPETA_AMBIENTE].concat(CARPETAS_AMBIENTE.map(function (c) { return c.propiedad; }))
    .forEach(function (p) {
      if (!props[p]) problemas.push('Falta la Propiedad del script ' + p);
    });

  const resultado = { ambiente: props[PROP.AMBIENTE] || '(sin instalar)', correcto: problemas.length === 0, problemas: problemas };
  Logger.log(JSON.stringify(resultado, null, 2));
  return resultado;
}

// ─────────────────────────────────── Ayudantes ───────────────────────────────────

function asegurarHoja_(ss, def) {
  const grupo = GRUPOS_BD[def.grupo];
  let hoja = ss.getSheetByName(def.hoja);
  const creada = !hoja;
  if (creada) hoja = ss.insertSheet(def.hoja);

  // Encabezados: los que falten se agregan al final, sin mover los existentes.
  const actuales = creada ? [] : leerEncabezados_(hoja);
  const faltantes = def.columnas.filter(function (c) { return actuales.indexOf(c) === -1; });
  if (faltantes.length) {
    const inicio = actuales.length + 1;
    if (hoja.getMaxColumns() < inicio + faltantes.length - 1) {
      hoja.insertColumnsAfter(hoja.getMaxColumns(), inicio + faltantes.length - 1 - hoja.getMaxColumns());
    }
    hoja.getRange(1, inicio, 1, faltantes.length).setValues([faltantes]);
  }
  const encabezados = leerEncabezados_(hoja);
  const total = encabezados.length;

  // Formato: encabezado con el color del grupo, fila congelada, descripción como nota.
  hoja.setTabColor(grupo.color);
  hoja.setFrozenRows(1);
  hoja.getRange(1, 1, 1, total)
    .setFontWeight('bold').setFontColor('#FFFFFF').setBackground(grupo.color)
    .setVerticalAlignment('middle');
  hoja.getRange(1, 1).setNote(grupo.nombre + ' · ' + def.descripcion);

  // Todo se guarda como texto (para que "1.0" o "0001" no se conviertan en número), salvo las
  // columnas de fecha.
  const filas = Math.max(hoja.getMaxRows() - 1, 1);
  encabezados.forEach(function (col, i) {
    const formato = col.indexOf('FECHA') === 0 ? 'dd/mm/yyyy hh:mm:ss' : '@';
    hoja.getRange(2, i + 1, filas, 1).setNumberFormat(formato);
  });

  // Quitar columnas sobrantes vacías a la derecha para que la hoja quede limpia.
  if (creada && hoja.getMaxColumns() > total) {
    hoja.deleteColumns(total + 1, hoja.getMaxColumns() - total);
  }
  if (creada) hoja.autoResizeColumns(1, total);

  // Filas semilla: se agregan solo las que no existen (se comparan por la primera columna).
  let filasSemilla = 0;
  if (def.semilla && def.semilla.length) {
    const existentes = hoja.getLastRow() > 1
      ? hoja.getRange(2, 1, hoja.getLastRow() - 1, 1).getValues().map(function (f) { return String(f[0]); })
      : [];
    const nuevas = def.semilla.filter(function (f) { return existentes.indexOf(String(f[0])) === -1; })
      .map(function (f) { return ordenarSegunEncabezados_(def.columnas, encabezados, f); });
    if (nuevas.length) {
      hoja.getRange(hoja.getLastRow() + 1, 1, nuevas.length, total).setValues(nuevas);
      filasSemilla = nuevas.length;
    }
  }

  return { hoja: hoja, creada: creada, columnasAgregadas: creada ? [] : faltantes, filasSemilla: filasSemilla };
}

/** Acomoda una fila escrita en el orden del esquema al orden real de la hoja. */
function ordenarSegunEncabezados_(columnasEsquema, encabezados, fila) {
  return encabezados.map(function (col) {
    const i = columnasEsquema.indexOf(col);
    return i === -1 || fila[i] === undefined ? '' : String(fila[i]);
  });
}

/** Borra la "Hoja 1" que trae toda hoja nueva, solo si está completamente vacía. */
function quitarHojasVaciasPorDefecto_(ss) {
  const delEsquema = ESQUEMA_BD.map(function (d) { return d.hoja; });
  ss.getSheets().forEach(function (h) {
    if (delEsquema.indexOf(h.getName()) === -1 && h.getLastRow() === 0 && h.getLastColumn() === 0 && ss.getSheets().length > 1) {
      ss.deleteSheet(h);
    }
  });
}

/** Devuelve la carpeta guardada por ID; si no existe, la busca por nombre dentro de `padre` o la crea. */
function asegurarCarpeta_(padre, nombre, idGuardado, descripcion) {
  if (idGuardado) {
    try {
      const guardada = DriveApp.getFolderById(idGuardado);
      if (!guardada.isTrashed()) return guardada;
    } catch (e) { /* El ID guardado ya no existe: se busca o se crea de nuevo. */ }
  }
  const encontradas = padre.getFoldersByName(nombre);
  const carpeta = encontradas.hasNext() ? encontradas.next() : padre.createFolder(nombre);
  if (descripcion) carpeta.setDescription(descripcion);
  return carpeta;
}

/** Quien instala queda como ADMINISTRADOR (si aún no está). Su nombre se corrige después en Usuarios. */
function registrarInstalador_() {
  const correo = Session.getEffectiveUser().getEmail();
  const usuarios = leerTabla_('Usuarios');
  let usuario = usuarios.filter(function (u) { return String(u.CORREO).toLowerCase() === correo.toLowerCase(); })[0];
  const ahora = new Date();
  if (!usuario) {
    usuario = { ID_USUARIO: siguienteId_('USR', 4), CORREO: correo, NOMBRE: correo, ID_PUESTO: '', ACTIVO: 'SI',
      FECHA_ALTA: ahora, ACTUALIZADO_POR: correo, FECHA_ACTUALIZACION: ahora };
    agregarFila_('Usuarios', usuario);
  }
  const perfiles = leerTabla_('UsuarioPerfiles');
  const yaEsAdmin = perfiles.some(function (p) {
    return p.ID_USUARIO === usuario.ID_USUARIO && p.PERFIL === PERFILES.ADMINISTRADOR && p.ACTIVO === 'SI';
  });
  if (!yaEsAdmin) {
    agregarFila_('UsuarioPerfiles', { ID_USUARIO_PERFIL: siguienteId_('UPE', 4), ID_USUARIO: usuario.ID_USUARIO,
      PERFIL: PERFILES.ADMINISTRADOR, ID_DEPARTAMENTO: '', NIVEL_AUTORIZACION: '', ACTIVO: 'SI', FECHA_ALTA: ahora });
  }
  return correo + ' (' + usuario.ID_USUARIO + ')';
}
