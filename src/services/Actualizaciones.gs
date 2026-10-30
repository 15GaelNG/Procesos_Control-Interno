/**
 * ACTUALIZACIONES DE DOCUMENTOS VIGENTES (fase 7; requerimiento §2.1 y §4.2, respuesta 5 de Procesos,
 * decisión 32).
 *
 *   documentosActualizables_() → los vigentes de los departamentos de la persona, y si ya hay una
 *                                actualización en curso de cada uno.
 *   crearActualizacion_()      → solicitud ACTUALIZACION: conserva código, tipo, departamento y área del
 *                                documento y copia su contenido (inicio, fin, objetivo, alcance,
 *                                responsabilidades, definiciones y actividades con responsable, enlaces e
 *                                imágenes) para modificarlo. Si el documento no nació en el sistema
 *                                (inventario anterior), empieza vacía y se importa su Word o PDF con la IA.
 *   motivosSugeridos_()        → compara con la versión vigente: cambio de responsable, actividades
 *                                agregadas o eliminadas (§4.2). El colaborador los confirma y describe el
 *                                cambio; «Actualización completa» excluye a los demás.
 *   siguienteVersion_()        → MAYOR (1.0 → 2.0) o MENOR (1.0 → 1.1): lo decide Procesos en el Vo.Bo.
 *
 * La versión vigente y el inventario no cambian hasta que CH autoriza (AutorizacionCH.gs).
 * Lo puro está probado en tests/actualizaciones.test.js.
 */

// Estados en los que una solicitud ya no está «en curso».
function solicitudCerrada_(estado) {
  return [ESTADOS.AUTORIZADO, ESTADOS.NO_PROCEDENTE, ESTADOS.CANCELADO].indexOf(estado) !== -1;
}

/** Los documentos vigentes que la persona puede actualizar (sin tocar Google). */
function documentosActualizables_(documentos, solicitudes, idsDepartamentos, t) {
  const nombreDe = function (lista, campo, id) { const x = lista.filter(function (r) { return r[campo] === id; })[0]; return x ? String(x.NOMBRE) : ''; };
  return documentos.filter(function (d) {
    return String(d.ESTATUS).trim().toUpperCase() === ESTATUS_DOCUMENTO.VIGENTE && idsDepartamentos.indexOf(d.ID_DEPARTAMENTO) !== -1;
  }).map(function (d) {
    const tipo = t.tipos.filter(function (x) { return x.ID_TIPO === d.ID_TIPO; })[0] || {};
    const enCurso = solicitudes.filter(function (s) { return s.ID_DOCUMENTO === d.ID_DOCUMENTO && !solicitudCerrada_(s.ESTADO); })[0];
    return { id: d.ID_DOCUMENTO, codigo: String(d.CODIGO || ''), nombre: String(d.NOMBRE || ''), tipoDocumento: String(tipo.NOMBRE || ''),
      departamento: nombreDe(t.departamentos, 'ID_DEPARTAMENTO', d.ID_DEPARTAMENTO), area: nombreDe(t.areas, 'ID_AREA', d.ID_AREA),
      version: String(d.VERSION_VIGENTE || ''), estructurado: esActivo_(d.CONTENIDO_ESTRUCTURADO) && !!d.ID_SOLICITUD_VIGENTE,
      disponible: esActivo_(tipo.EN_SISTEMA), enCurso: enCurso ? enCurso.ID_SOLICITUD : '' };
  }).sort(function (a, b) { return a.codigo.localeCompare(b.codigo) || a.nombre.localeCompare(b.nombre, 'es'); });
}

/** Por qué no se puede actualizar un documento (vacío = sí se puede). */
function erroresActualizacion_(doc, item) {
  if (!doc || !item) return ['Elige un documento vigente de tus departamentos.'];
  if (!item.disponible) return ['El tipo «' + item.tipoDocumento + '» todavía no se documenta en el sistema.'];
  if (item.enCurso) return ['Ya hay una actualización en curso de este documento (' + item.enCurso + ').'];
  return [];
}

/**
 * Lo que se copia del documento vigente (sin tocar Google): los datos de la solicitud y sus actividades e
 * imágenes, sin IDs. base: la solicitud que lo autorizó (o null si viene del inventario anterior).
 */
function planActualizacion_(doc, base, actividadesBase, imagenesBase) {
  const texto = function (v) { return String(v === null || v === undefined ? '' : v); };
  const plan = {
    solicitud: { TIPO_SOLICITUD: TIPOS_SOLICITUD.ACTUALIZACION, ID_TIPO: doc.ID_TIPO, ID_DOCUMENTO: doc.ID_DOCUMENTO,
      NOMBRE_DOCUMENTO: texto(doc.NOMBRE), ID_DEPARTAMENTO: doc.ID_DEPARTAMENTO, ID_AREA: doc.ID_AREA, ID_SUBAREA: texto(doc.ID_SUBAREA),
      CODIGO: texto(doc.CODIGO), VERSION: '', INICIO_PROCESO: '', FIN_PROCESO: '', OBJETIVO: '', ALCANCE: '', RESPONSABILIDADES: '',
      DEFINICIONES: '', MOTIVOS_CAMBIO: '', DESCRIPCION_CAMBIO: '' },
    actividades: [], imagenes: []
  };
  if (!base) return plan;
  ['INICIO_PROCESO', 'FIN_PROCESO', 'OBJETIVO', 'ALCANCE', 'RESPONSABILIDADES', 'DEFINICIONES'].forEach(function (c) { plan.solicitud[c] = texto(base[c]); });
  const vivas = function (r) { return r.ID_SOLICITUD === base.ID_SOLICITUD && !esActivo_(r.ELIMINADA); };
  actividadesBase.filter(vivas).sort(function (a, b) { return Number(a.ORDEN) - Number(b.ORDEN); }).forEach(function (a, i) {
    plan.actividades.push({ base: a.ID_ACTIVIDAD, ORDEN: String(i + 1),
      TEXTO_ORIGINAL: texto(a.TEXTO_FINAL).trim() ? texto(a.TEXTO_FINAL) : texto(a.TEXTO_ORIGINAL), TEXTO_FINAL: '',
      ID_PUESTO: texto(a.ID_PUESTO), PUESTO_TEXTO: texto(a.PUESTO_TEXTO), RESPONSABLE_CONFIRMADO: esActivo_(a.RESPONSABLE_CONFIRMADO) ? 'SI' : 'NO',
      ELIMINADA: 'NO', ENLACES: texto(a.ENLACES), ID_ACTIVIDAD_BASE: a.ID_ACTIVIDAD });
    imagenesBase.filter(function (im) { return vivas(im) && im.ID_ACTIVIDAD === a.ID_ACTIVIDAD; })
      .sort(function (x, y) { return Number(x.ORDEN) - Number(y.ORDEN); })
      .forEach(function (im) {
        const copia = {};
        ['ORDEN', 'ID_ARCHIVO', 'ID_ARCHIVO_DOCUMENTO', 'ID_ARCHIVO_MINIATURA', 'FORMATO', 'ANCHO', 'ALTO', 'PESO_KB', 'PIE'].forEach(function (c) { copia[c] = texto(im[c]); });
        plan.imagenes.push(Object.assign({ base: a.ID_ACTIVIDAD, ELIMINADA: 'NO' }, copia));
      });
  });
  return plan;
}

function crearActualizacion_(sesion, idDocumento) {
  const t = tablasSolicitud_();
  const doc = leerTabla_('Documentos').filter(function (d) { return d.ID_DOCUMENTO === idDocumento; })[0];
  const deptos = departamentosDe_(sesion.idUsuario, t.usuarioDeptos).map(function (d) { return d.id; });
  const item = documentosActualizables_(doc ? [doc] : [], leerTabla_('Solicitudes'), deptos, t)[0];
  const errores = erroresActualizacion_(doc, item);
  if (errores.length) throw new Error(errores.join(' '));
  const base = doc.ID_SOLICITUD_VIGENTE ? leerTabla_('Solicitudes').filter(function (s) { return s.ID_SOLICITUD === doc.ID_SOLICITUD_VIGENTE; })[0] : null;
  const plan = planActualizacion_(doc, base || null, leerTabla_('Actividades'), leerTabla_('Imagenes'));

  const ahora = new Date();
  const opciones = opcionesNuevaSolicitud_(sesion, t);
  const serie = obtenerConfig_('PREFIJO_SOLICITUD', 'SOL') + '-' + Utilities.formatDate(ahora, ZONA_HORARIA, 'yyyy');
  const id = siguienteId_(serie, 4);
  const carpeta = DriveApp.getFolderById(propiedadObligatoria_('ID_CARPETA_SOLICITUDES')).createFolder(id + ' · ' + plan.solicitud.NOMBRE_DOCUMENTO);
  carpeta.setDescription('Actualización ' + id + ' de ' + plan.solicitud.CODIGO + ', de ' + correoReal_(sesion) + '. La administra el sistema; no se edita a mano.');
  const marca = marcaDeTiempo_(ahora);
  const idsActividades = reservarIds_('ACT', plan.actividades.length, 6);
  const nuevaDe = {};
  agregarFilas_('Actividades', plan.actividades.map(function (a, i) {
    nuevaDe[a.base] = idsActividades[i];
    const fila = Object.assign({ ID_ACTIVIDAD: idsActividades[i], ID_SOLICITUD: id, FECHA_ACTUALIZACION: marca }, a);
    delete fila.base;
    return fila;
  }));
  const idsImagenes = reservarIds_('IMG', plan.imagenes.length, 6);
  agregarFilas_('Imagenes', plan.imagenes.map(function (im, i) {
    const fila = Object.assign({ ID_IMAGEN: idsImagenes[i], ID_ACTIVIDAD: nuevaDe[im.base], ID_SOLICITUD: id, FECHA_CARGA: ahora }, im);
    delete fila.base;
    return fila;
  }));
  agregarFila_('Solicitudes', Object.assign({
    ID_SOLICITUD: id, ESTADO: ESTADOS.BORRADOR, REVISION: '0',
    ELABORO_ID: sesion.idUsuario, ELABORO_NOMBRE: opciones.elaborador.nombre, ELABORO_PUESTO: opciones.elaborador.puesto,
    FECHA_ELABORACION: ahora, ID_CARPETA: carpeta.getId(), FECHA_ACTUALIZACION: marca
  }, plan.solicitud));
  registrarBitacora_(sesion, 'CREAR_SOLICITUD', 'Actualización de ' + plan.solicitud.CODIGO + ' «' + plan.solicitud.NOMBRE_DOCUMENTO + '» (versión vigente ' +
    (doc.VERSION_VIGENTE || '?') + ')' + (base ? '.' : '; sin contenido en el sistema: se captura o se importa.'), id, '', ESTADOS.BORRADOR);
  return { idSolicitud: id };
}

// ─────────────────────────────── Control de cambios ───────────────────────────────

/**
 * Motivos que se sugieren comparando con la versión vigente (sin tocar Google). actuales: las actividades
 * de la solicitud con su idBase; base: las de la versión vigente ({ id, responsable }). Sin base (documento
 * del inventario anterior) no se puede comparar: [].
 */
function motivosSugeridos_(actuales, base) {
  if (!base || !base.length) return [];
  const motivos = [];
  const ids = base.map(function (b) { return b.id; });
  if (actuales.some(function (a) { return !a.idBase || ids.indexOf(a.idBase) === -1; })) motivos.push('ACTIVIDADES_AGREGADAS');
  if (base.some(function (b) { return !actuales.some(function (a) { return a.idBase === b.id; }); })) motivos.push('ACTIVIDADES_ELIMINADAS');
  if (actuales.some(function (a) {
    const b = base.filter(function (x) { return x.id === a.idBase; })[0];
    return b && normalizar_(b.responsable) !== normalizar_(a.responsable);
  })) motivos.unshift('CAMBIO_RESPONSABLE');
  return motivos;
}

/** Valida los motivos y la descripción del cambio (sin tocar Google): { errores, motivos, descripcion }. */
function planControlCambios_(datos) {
  const d = datos || {};
  const plan = { errores: [], motivos: [], descripcion: String(d.descripcion || '').replace(/\r\n/g, '\n').trim() };
  plan.motivos = Object.keys(MOTIVOS_CAMBIO).filter(function (k) { return (d.motivos || []).indexOf(k) !== -1; });
  if (plan.motivos.indexOf('COMPLETA') !== -1) plan.motivos = ['COMPLETA'];   // excluye a los demás (§4.2)
  if (plan.descripcion.length > LIMITES_CAPTURA.DERIVADO_MAX) plan.errores.push('La descripción del cambio pasa de ' + LIMITES_CAPTURA.DERIVADO_MAX + ' caracteres.');
  return plan;
}

/**
 * Guarda el control de cambios de una actualización: el colaborador mientras la puede editar, o el revisor
 * asignado mientras la revisa («el colaborador o Procesos los confirmará», §4.2). No es contenido del
 * documento: no cambia la huella ni la confirmación.
 */
function guardarControlCambios_(sesion, idSolicitud, datos) {
  const fila = filaSolicitud_(idSolicitud);
  if (fila.TIPO_SOLICITUD !== TIPOS_SOLICITUD.ACTUALIZACION) throw new Error('El control de cambios es solo de las actualizaciones.');
  const revisor = esRevisorAsignado_(sesion, fila) && fila.ESTADO === ESTADOS.EN_REVISION;
  if (!permisoSolicitud_(sesion, fila).editar && !revisor) throw new Error('No puedes cambiar el control de cambios de esta solicitud.');
  const plan = planControlCambios_(datos);
  if (plan.errores.length) throw new Error(plan.errores.join(' '));
  actualizarFila_('Solicitudes', fila._fila, { MOTIVOS_CAMBIO: JSON.stringify(plan.motivos), DESCRIPCION_CAMBIO: plan.descripcion });
  return { motivos: plan.motivos, descripcion: plan.descripcion };
}

/** Las actividades de la versión vigente para comparar ({ id, responsable }), o [] si no hay. */
function actividadesBase_(idSolicitudBase, actividades) {
  if (!idSolicitudBase) return [];
  return actividades.filter(function (a) { return a.ID_SOLICITUD === idSolicitudBase && !esActivo_(a.ELIMINADA); })
    .map(function (a) { return { id: a.ID_ACTIVIDAD, responsable: String(a.PUESTO_TEXTO || '') }; });
}

/** Lo de la actualización para las pantallas: versión vigente, motivos (guardados y sugeridos) y descripción. */
function datosActualizacion_(fila, det, documentos, actividades) {
  if (fila.TIPO_SOLICITUD !== TIPOS_SOLICITUD.ACTUALIZACION) return null;
  const doc = documentos.filter(function (d) { return d.ID_DOCUMENTO === fila.ID_DOCUMENTO; })[0] || {};
  return { idDocumento: String(fila.ID_DOCUMENTO || ''), versionVigente: String(doc.VERSION_VIGENTE || ''),
    motivos: listaJson_(fila.MOTIVOS_CAMBIO), descripcion: String(fila.DESCRIPCION_CAMBIO || ''),
    sugeridos: motivosSugeridos_(det.actividades, actividadesBase_(doc.ID_SOLICITUD_VIGENTE, actividades)),
    estructurado: !!doc.ID_SOLICITUD_VIGENTE, nombresMotivos: MOTIVOS_CAMBIO, tipoCambio: String(fila.TIPO_CAMBIO || '') };
}

// ─────────────────────────────── Versión ───────────────────────────────

/** La versión que sigue: MAYOR 1.3 → 2.0, MENOR 1.3 → 1.4 (respuesta 5 de Procesos). */
function siguienteVersion_(actual, tipo) {
  const m = /^(\d+)\.(\d+)$/.exec(String(actual || '').trim()) || [null, '0', '0'];
  return tipo === TIPOS_CAMBIO.MAYOR ? (Number(m[1]) + 1) + '.0' : m[1] + '.' + (Number(m[2]) + 1);
}
