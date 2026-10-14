/**
 * INSTALACIÓN Y VERIFICACIÓN DE LA BASE
 *
 * Se corre a mano desde el editor de Apps Script del proyecto ligado a cada hoja:
 *   - BD Procesos - PRUEBAS  →  instalarPruebas()
 *   - BD Procesos            →  instalarProduccion()
 *
 * Es seguro correrla varias veces y es también la forma de ACTUALIZAR la base cuando cambia
 * config/Esquema.gs. Nunca borra datos:
 *   - crea las hojas, columnas, carpetas y filas semilla que falten;
 *   - una hoja SIN datos se vuelve a encabezar en el orden del esquema (no hay nada que perder);
 *   - en una hoja CON datos, las columnas nuevas van al final y las retiradas se quitan solo si
 *     están vacías;
 *   - las hojas retiradas se borran solo si están vacías o conservan únicamente su semilla original;
 *     si no, se ocultan con el prefijo «(retirada)»;
 *   - en las filas semilla llena las celdas vacías y aplica CORRECCIONES_BD.
 * Si un proyecto ya quedó instalado como un ambiente, se niega a instalarlo como el otro.
 *
 * verificarBase() solo revisa y reporta; no cambia nada.
 */

function instalarPruebas() {
  soloEditor_();
  return instalarBase_(AMBIENTES.PRUEBAS.clave);
}

function instalarProduccion() {
  soloEditor_();
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

  const resumen = { ambiente: ambiente.clave, hojasCreadas: [], hojasReencabezadas: [], columnasAgregadas: [],
    columnasQuitadas: [], filasSemilla: [], celdasSemilla: [], correcciones: [], hojasRetiradas: [],
    avisos: [], carpetas: [] };
  const candado = LockService.getScriptLock();
  candado.waitLock(30000);
  try {

    ss.rename(ambiente.nombreBD);
    ss.setSpreadsheetTimeZone(ZONA_HORARIA);

    ESQUEMA_BD.forEach(function (def, i) {
      const r = asegurarHoja_(ss, def);
      if (r.creada) resumen.hojasCreadas.push(def.hoja);
      if (r.reencabezada) resumen.hojasReencabezadas.push(def.hoja);
      if (r.columnasAgregadas.length) resumen.columnasAgregadas.push(def.hoja + ': ' + r.columnasAgregadas.join(', '));
      if (r.columnasQuitadas.length) resumen.columnasQuitadas.push(def.hoja + ': ' + r.columnasQuitadas.join(', '));
      if (r.filasSemilla) resumen.filasSemilla.push(def.hoja + ': ' + r.filasSemilla);
      if (r.celdasSemilla) resumen.celdasSemilla.push(def.hoja + ': ' + r.celdasSemilla);
      resumen.avisos = resumen.avisos.concat(r.avisos);
      ss.setActiveSheet(r.hoja);
      ss.moveActiveSheet(i + 1);
    });
    resumen.correcciones = aplicarCorrecciones_(ss);
    HOJAS_RETIRADAS.forEach(function (ret) {
      const r = retirarHoja_(ss, ret);
      if (r) resumen.hojasRetiradas.push(r);
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
  soloEditor_();
  const ss = obtenerBD_();
  const props = PropertiesService.getScriptProperties().getProperties();
  const problemas = [];
  const avisos = [];

  ESQUEMA_BD.forEach(function (def) {
    const hoja = ss.getSheetByName(def.hoja);
    if (!hoja) { problemas.push('Falta la hoja ' + def.hoja); return; }
    const encabezados = leerEncabezados_(hoja);
    const retiradas = def.columnasRetiradas || [];
    def.columnas.forEach(function (col) {
      if (encabezados.indexOf(col) === -1) problemas.push(def.hoja + ': falta la columna ' + col);
    });
    encabezados.forEach(function (col) {
      if (!col || def.columnas.indexOf(col) !== -1) return;
      if (retiradas.indexOf(col) !== -1) avisos.push(def.hoja + ': la columna retirada ' + col + ' sigue ahí porque tiene datos');
      else problemas.push(def.hoja + ': columna que no está en el esquema: ' + col);
    });
  });
  HOJAS_RETIRADAS.forEach(function (ret) {
    if (ss.getSheetByName(ret.hoja)) problemas.push('Sigue la hoja retirada ' + ret.hoja + ': corre la instalación');
    if (ss.getSheetByName(PREFIJO_HOJA_RETIRADA + ret.hoja)) {
      avisos.push('La hoja oculta «' + PREFIJO_HOJA_RETIRADA + ret.hoja + '» tiene datos; revísala y bórrala a mano');
    }
  });

  [PROP.AMBIENTE, PROP.ID_BD, PROP.ID_CARPETA_AMBIENTE].concat(CARPETAS_AMBIENTE.map(function (c) { return c.propiedad; }))
    .forEach(function (p) {
      if (!props[p]) problemas.push('Falta la Propiedad del script ' + p);
    });

  const resultado = { ambiente: props[PROP.AMBIENTE] || '(sin instalar)', correcto: problemas.length === 0,
    problemas: problemas, avisos: avisos };
  Logger.log(JSON.stringify(resultado, null, 2));
  return resultado;
}

// ─────────────────────────────────── Ayudantes ───────────────────────────────────

function asegurarHoja_(ss, def) {
  const grupo = GRUPOS_BD[def.grupo];
  let hoja = ss.getSheetByName(def.hoja);
  const creada = !hoja;
  if (creada) hoja = ss.insertSheet(def.hoja);
  const avisos = [];
  const columnasQuitadas = [];
  let faltantes = [];
  let reencabezada = false;

  const actuales = creada ? [] : leerEncabezados_(hoja);
  if (hoja.getLastRow() <= 1) {
    // Sin datos: los encabezados quedan exactamente como en el esquema (orden incluido).
    if (actuales.join('|') !== def.columnas.join('|')) {
      if (hoja.getMaxColumns() < def.columnas.length) {
        hoja.insertColumnsAfter(hoja.getMaxColumns(), def.columnas.length - hoja.getMaxColumns());
      }
      hoja.getRange(1, 1, 1, hoja.getMaxColumns()).clear();
      hoja.getRange(1, 1, 1, def.columnas.length).setValues([def.columnas]);
      reencabezada = !creada;
    }
    if (hoja.getMaxColumns() > def.columnas.length) {
      hoja.deleteColumns(def.columnas.length + 1, hoja.getMaxColumns() - def.columnas.length);
    }
  } else {
    // Con datos: las que falten se agregan al final, sin mover las existentes.
    faltantes = def.columnas.filter(function (c) { return actuales.indexOf(c) === -1; });
    if (faltantes.length) {
      const inicio = actuales.length + 1;
      if (hoja.getMaxColumns() < inicio + faltantes.length - 1) {
        hoja.insertColumnsAfter(hoja.getMaxColumns(), inicio + faltantes.length - 1 - hoja.getMaxColumns());
      }
      hoja.getRange(1, inicio, 1, faltantes.length).setValues([faltantes]);
    }
    // Las retiradas se quitan solo si no tienen ningún dato.
    (def.columnasRetiradas || []).forEach(function (col) {
      const i = leerEncabezados_(hoja).indexOf(col);
      if (i === -1) return;
      const valores = hoja.getRange(2, i + 1, hoja.getLastRow() - 1, 1).getValues();
      if (valores.every(function (f) { return f[0] === '' || f[0] === null; })) {
        hoja.deleteColumn(i + 1);
        columnasQuitadas.push(col);
      } else {
        avisos.push(def.hoja + ': la columna retirada ' + col + ' tiene datos y se conservó');
      }
    });
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
  if (creada || reencabezada) hoja.autoResizeColumns(1, total);

  // Filas semilla: se agregan las que no existen (se comparan por la primera columna) y, en las que
  // ya existen, se llenan las celdas vacías (p. ej. una columna que se agregó después).
  let filasSemilla = 0;
  let celdasSemilla = 0;
  if (def.semilla && def.semilla.length) {
    const actualesFilas = hoja.getLastRow() > 1 ? hoja.getRange(2, 1, hoja.getLastRow() - 1, total).getValues() : [];
    const plan = planSemilla_(def, encabezados, actualesFilas);
    plan.celdas.forEach(function (c) {
      hoja.getRange(c.fila + 2, c.columna + 1).setValue(c.valor);
    });
    if (plan.nuevas.length) {
      hoja.getRange(hoja.getLastRow() + 1, 1, plan.nuevas.length, total).setValues(plan.nuevas);
    }
    filasSemilla = plan.nuevas.length;
    celdasSemilla = plan.celdas.length;
  }

  return { hoja: hoja, creada: creada, reencabezada: reencabezada, columnasAgregadas: faltantes,
    columnasQuitadas: columnasQuitadas, filasSemilla: filasSemilla, celdasSemilla: celdasSemilla, avisos: avisos };
}

/**
 * Qué falta de la semilla en una hoja (sin tocarla): filas que no existen, ya en el orden real de los
 * encabezados, y celdas vacías de filas existentes que la semilla sí trae ({ fila, columna, valor },
 * con índices desde 0 sobre `filas`, que son los renglones de datos sin encabezado).
 */
function planSemilla_(def, encabezados, filas) {
  const ids = filas.map(function (f) { return String(f[0]); });
  const nuevas = [];
  const celdas = [];
  def.semilla.forEach(function (semilla) {
    const ordenada = ordenarSegunEncabezados_(def.columnas, encabezados, semilla);
    const i = ids.indexOf(String(semilla[0]));
    if (i === -1) { nuevas.push(ordenada); return; }
    ordenada.forEach(function (valor, j) {
      if (valor !== '' && (filas[i][j] === '' || filas[i][j] === null)) celdas.push({ fila: i, columna: j, valor: valor });
    });
  });
  return { nuevas: nuevas, celdas: celdas };
}

/** Acomoda una fila escrita en el orden del esquema al orden real de la hoja. */
function ordenarSegunEncabezados_(columnasEsquema, encabezados, fila) {
  return encabezados.map(function (col) {
    const i = columnasEsquema.indexOf(col);
    return i === -1 || fila[i] === undefined ? '' : String(fila[i]);
  });
}

/** Aplica CORRECCIONES_BD: cambia el valor solo si la celda conserva el valor viejo. */
function aplicarCorrecciones_(ss) {
  const hechas = [];
  CORRECCIONES_BD.forEach(function (c) {
    const hoja = ss.getSheetByName(c.hoja);
    if (!hoja || hoja.getLastRow() < 2) return;
    const encabezados = leerEncabezados_(hoja);
    const col = encabezados.indexOf(c.columna);
    if (col === -1) return;
    const datos = hoja.getRange(2, 1, hoja.getLastRow() - 1, encabezados.length).getValues();
    datos.forEach(function (fila, i) {
      if (String(fila[0]) === c.id && String(fila[col]) === c.de) {
        hoja.getRange(i + 2, col + 1).setValue(c.a);
        hechas.push(c.hoja + ' ' + c.id + ' ' + c.columna + ': ' + c.de + ' → ' + c.a + ' (' + c.motivo + ')');
      }
    });
  });
  return hechas;
}

/**
 * Quita una hoja de HOJAS_RETIRADAS. Se borra si no tiene datos o si solo conserva su semilla
 * original sin cambios (`semillaOriginal`); si tiene otra cosa, se oculta y se renombra.
 */
function retirarHoja_(ss, ret) {
  const hoja = ss.getSheetByName(ret.hoja);
  if (!hoja) return null;
  const filas = hoja.getLastRow() > 1
    ? hoja.getRange(2, 1, hoja.getLastRow() - 1, Math.max(hoja.getLastColumn(), 1)).getValues() : [];
  if (soloSemillaOriginal_(filas, ret.semillaOriginal || [])) {
    ss.deleteSheet(hoja);
    return ret.hoja + ': borrada (' + ret.motivo + ')';
  }
  hoja.setName(PREFIJO_HOJA_RETIRADA + ret.hoja);
  hoja.hideSheet();
  return ret.hoja + ': tiene datos; se ocultó como «' + PREFIJO_HOJA_RETIRADA + ret.hoja + '» para revisarla (' + ret.motivo + ')';
}

/** true si cada fila es exactamente una de las de la semilla original (o no hay filas). */
function soloSemillaOriginal_(filas, semillaOriginal) {
  const texto = function (fila) {
    const valores = fila.map(function (v) { return v === null || v === undefined ? '' : String(v); });
    while (valores.length && valores[valores.length - 1] === '') valores.pop();
    return valores.join('|');
  };
  const permitidas = semillaOriginal.map(texto);
  return filas.every(function (f) { return permitidas.indexOf(texto(f)) !== -1; });
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
      PERFIL: PERFILES.ADMINISTRADOR, ID_DEPARTAMENTO: '', ACTIVO: 'SI', FECHA_ALTA: ahora });
  }
  return correo + ' (' + usuario.ID_USUARIO + ')';
}
