/**
 * SOLICITUDES: crear, consultar, capturar el desarrollo (borrador) y cancelar (fase 2).
 *
 * Una solicitud nace en BORRADOR con folio interno (SOL-2026-0001) y su carpeta en Drive. El
 * colaborador captura inicio, actividades (con imágenes) y fin; cada cambio se guarda solo
 * (guardarBorrador_). Lo puro (validar, planear, armar lo que va a la pantalla) está separado de lo
 * que toca Google para probarlo en node (tests/solicitudes.test.js).
 *
 * Permisos (permisoSolicitud_):
 *  - Ver: quien la elaboró, los revisores de Procesos y Soporte CI.
 *  - Editar: solo quien la elaboró, con perfil COLABORADOR, en BORRADOR, CONFIRMADO o DEVUELTO.
 */

// ─────────────────────────────── Lectura de tablas ───────────────────────────────

function tablasSolicitud_() {
  return {
    tipos: leerTabla_('TiposDocumento'), usuarios: leerTabla_('Usuarios'), puestos: leerTabla_('Puestos'),
    usuarioDeptos: leerTabla_('UsuarioDepartamentos'), departamentos: leerTabla_('Departamentos'),
    areas: leerTabla_('Areas'), subareas: leerTabla_('Subareas')
  };
}

function filaSolicitud_(idSolicitud) {
  const fila = leerTabla_('Solicitudes').filter(function (s) { return s.ID_SOLICITUD === idSolicitud; })[0];
  if (!fila) throw new Error('No existe la solicitud ' + idSolicitud + '.');
  return fila;
}

// ─────────────────────────────── Nueva solicitud ───────────────────────────────

/** Lo que la persona puede elegir al crear: tipos de documento, sus departamentos con áreas y subáreas. */
function opcionesNuevaSolicitud_(sesion, t) {
  const usuario = t.usuarios.filter(function (u) { return u.ID_USUARIO === sesion.idUsuario; })[0] || {};
  const puesto = t.puestos.filter(function (p) { return p.ID_PUESTO && p.ID_PUESTO === usuario.ID_PUESTO; })[0];
  const suyos = departamentosDe_(sesion.idUsuario, t.usuarioDeptos);
  const texto = function (v) { return String(v === null || v === undefined ? '' : v).trim(); };
  return {
    tiposSolicitud: Object.keys(TIPOS_SOLICITUD).map(function (k) {
      return { id: k, nombre: NOMBRES_TIPO_SOLICITUD[k], disponible: k === 'NUEVO',
        nota: k === 'NUEVO' ? '' : 'Llega con las actualizaciones (fase 7).' };
    }),
    tiposDocumento: t.tipos.filter(function (x) { return esActivo_(x.ACTIVO); }).map(function (x) {
      return { id: x.ID_TIPO, nombre: texto(x.NOMBRE), prefijo: texto(x.PREFIJO_CODIGO), disponible: esActivo_(x.EN_SISTEMA) };
    }),
    departamentos: suyos.map(function (s) {
      const d = t.departamentos.filter(function (x) { return x.ID_DEPARTAMENTO === s.id && esActivo_(x.ACTIVO); })[0];
      if (!d) return null;
      return {
        id: d.ID_DEPARTAMENTO, nombre: texto(d.NOMBRE), clave: texto(d.CLAVE_CODIGO), principal: s.principal,
        areas: t.areas.filter(function (a) { return a.ID_DEPARTAMENTO === d.ID_DEPARTAMENTO && esActivo_(a.ACTIVO); })
          .map(function (a) {
            return { id: a.ID_AREA, nombre: texto(a.NOMBRE), clave: texto(a.CLAVE_CODIGO), cuerpo: texto(d.CLAVE_CODIGO) + texto(a.CLAVE_CODIGO),
              subareas: t.subareas.filter(function (s2) { return s2.ID_AREA === a.ID_AREA && esActivo_(s2.ACTIVO); })
                .map(function (s2) { return { id: s2.ID_SUBAREA, nombre: texto(s2.NOMBRE) }; })
                .sort(function (x, y) { return x.nombre.localeCompare(y.nombre, 'es'); }) };
          })
          .sort(function (x, y) { return x.clave.localeCompare(y.clave) || x.nombre.localeCompare(y.nombre, 'es'); })
      };
    }).filter(Boolean).sort(function (a, b) { return (b.principal - a.principal) || a.nombre.localeCompare(b.nombre, 'es'); }),
    elaborador: { nombre: sesion.nombre, puesto: puesto ? texto(puesto.NOMBRE) : '' }
  };
}

/** Errores de los datos generales de una solicitud nueva (vacío = válida). */
function validarNuevaSolicitud_(datos, opciones) {
  const e = [];
  const nombre = String(datos.nombre || '').replace(/\s+/g, ' ').trim();
  const tipoSol = opciones.tiposSolicitud.filter(function (x) { return x.id === datos.tipoSolicitud; })[0];
  if (!tipoSol) e.push('Elige si es un documento nuevo o una actualización.');
  else if (!tipoSol.disponible) e.push(tipoSol.nota);
  const tipo = opciones.tiposDocumento.filter(function (x) { return x.id === datos.idTipo; })[0];
  if (!tipo) e.push('Elige el tipo de documento.');
  else if (!tipo.disponible) e.push('El tipo «' + tipo.nombre + '» todavía no se documenta en el sistema.');
  if (nombre.length < LIMITES_CAPTURA.NOMBRE_MIN) e.push('Escribe el nombre del documento.');
  if (nombre.length > LIMITES_CAPTURA.NOMBRE_MAX) e.push('El nombre es demasiado largo (máximo ' + LIMITES_CAPTURA.NOMBRE_MAX + ' caracteres).');
  if (!opciones.departamentos.length) {
    e.push('No tienes departamentos asignados: pide a un administrador que te asigne el tuyo.');
    return e;
  }
  const depto = opciones.departamentos.filter(function (d) { return d.id === datos.idDepartamento; })[0];
  if (!depto) { e.push('Elige el departamento.'); return e; }
  const area = depto.areas.filter(function (a) { return a.id === datos.idArea; })[0];
  if (!area) { e.push('Elige el área.'); return e; }
  if (datos.idSubarea && !area.subareas.some(function (s) { return s.id === datos.idSubarea; })) e.push('La subárea no es de esa área.');
  return e;
}

/** Palabras que cuentan para comparar nombres: sin acentos, sin palabras vacías y sin plural. */
function palabrasClave_(texto) {
  return normalizar_(texto).split(' ').filter(function (p) { return p.length > 2 && PALABRAS_VACIAS.indexOf(p) === -1; })
    .map(function (p) { return p.length > 5 && /es$/.test(p) ? p.slice(0, -2) : (p.length > 4 && /s$/.test(p) ? p.slice(0, -1) : p); })
    .filter(function (p, i, l) { return l.indexOf(p) === i; });
}

/** Qué tanto se parecen dos nombres, de 0 a 1 (Dice sobre palabras clave; 1 si uno contiene al otro). */
function parecido_(a, b) {
  const na = normalizar_(a), nb = normalizar_(b);
  if (!na || !nb) return 0;
  if (na === nb || (Math.min(na.length, nb.length) >= 8 && (na.indexOf(nb) !== -1 || nb.indexOf(na) !== -1))) return 1;
  const pa = palabrasClave_(a), pb = palabrasClave_(b);
  if (!pa.length || !pb.length) return 0;
  const comunes = pa.filter(function (p) { return pb.indexOf(p) !== -1; }).length;
  return 2 * comunes / (pa.length + pb.length);
}

/**
 * Documentos vigentes y solicitudes en curso con nombre parecido (§2.1: sugerir coincidencias; Procesos
 * decide si procede). Devuelve [{ tipo: 'DOCUMENTO' | 'SOLICITUD', id, codigo, nombre, estado, parecido }].
 */
function coincidenciasNombre_(nombre, documentos, solicitudes, excluir) {
  const resultado = [];
  documentos.forEach(function (d) {
    if (String(d.ESTATUS).trim().toUpperCase() !== 'VIGENTE') return;
    const p = parecido_(nombre, d.NOMBRE);
    if (p >= COINCIDENCIAS_PARECIDO_MIN) {
      resultado.push({ tipo: 'DOCUMENTO', id: d.ID_DOCUMENTO, codigo: String(d.CODIGO || ''), nombre: String(d.NOMBRE), estado: 'Vigente', parecido: p });
    }
  });
  solicitudes.forEach(function (s) {
    if (s.ID_SOLICITUD === excluir || ['CANCELADO', 'NO_PROCEDENTE', 'AUTORIZADO'].indexOf(s.ESTADO) !== -1) return;
    const p = parecido_(nombre, s.NOMBRE_DOCUMENTO);
    if (p >= COINCIDENCIAS_PARECIDO_MIN) {
      resultado.push({ tipo: 'SOLICITUD', id: s.ID_SOLICITUD, codigo: String(s.CODIGO || ''), nombre: String(s.NOMBRE_DOCUMENTO),
        estado: NOMBRES_ESTADO[s.ESTADO] || s.ESTADO, parecido: p });
    }
  });
  return resultado.sort(function (a, b) { return b.parecido - a.parecido; }).slice(0, COINCIDENCIAS_MAX)
    .map(function (r) { r.parecido = Math.round(r.parecido * 100) / 100; return r; });
}

function crearSolicitud_(sesion, datos) {
  requierePerfil_(sesion, ['COLABORADOR']);
  const t = tablasSolicitud_();
  const opciones = opcionesNuevaSolicitud_(sesion, t);
  const errores = validarNuevaSolicitud_(datos, opciones);
  if (errores.length) throw new Error(errores.join(' '));

  const ahora = new Date();
  const nombre = String(datos.nombre).replace(/\s+/g, ' ').trim();
  const serie = obtenerConfig_('PREFIJO_SOLICITUD', 'SOL') + '-' + Utilities.formatDate(ahora, ZONA_HORARIA, 'yyyy');
  const id = siguienteId_(serie, 4);
  const carpeta = DriveApp.getFolderById(propiedadObligatoria_('ID_CARPETA_SOLICITUDES')).createFolder(id + ' · ' + nombre);
  carpeta.setDescription('Solicitud ' + id + ' de ' + correoReal_(sesion) + '. La administra el sistema; no se edita a mano.');
  agregarFila_('Solicitudes', {
    ID_SOLICITUD: id, TIPO_SOLICITUD: datos.tipoSolicitud, ID_TIPO: datos.idTipo, ID_DOCUMENTO: '', NOMBRE_DOCUMENTO: nombre,
    ID_DEPARTAMENTO: datos.idDepartamento, ID_AREA: datos.idArea, ID_SUBAREA: datos.idSubarea || '',
    ESTADO: ESTADOS.BORRADOR, REVISION: '0', INICIO_PROCESO: '', FIN_PROCESO: '',
    ELABORO_ID: sesion.idUsuario, ELABORO_NOMBRE: opciones.elaborador.nombre, ELABORO_PUESTO: opciones.elaborador.puesto,
    FECHA_ELABORACION: ahora, ID_CARPETA: carpeta.getId(), FECHA_ACTUALIZACION: marcaDeTiempo_(ahora)
  });
  registrarBitacora_(sesion, 'CREAR_SOLICITUD', nombre, id, '', ESTADOS.BORRADOR);
  return { idSolicitud: id };
}

// ─────────────────────────────── Permisos y consulta ───────────────────────────────

/** { ver, editar } de una sesión sobre una solicitud. */
function permisoSolicitud_(sesion, fila) {
  const suya = !!sesion.registrado && fila.ELABORO_ID === sesion.idUsuario;
  const tiene = function (p) { return sesion.perfiles.indexOf(p) !== -1; };
  return {
    ver: suya || tiene('REVISOR') || tiene('SOPORTE_CI'),
    editar: suya && tiene('COLABORADOR') && ESTADOS_EDITABLES.indexOf(fila.ESTADO) !== -1
  };
}

/** Las solicitudes que elaboró la persona, la más reciente primero, para «Mis solicitudes». */
function resumenSolicitudes_(filas, idUsuario, t, formatear) {
  const nombreDe = function (lista, campoId, id) {
    const x = lista.filter(function (r) { return r[campoId] === id; })[0];
    return x ? String(x.NOMBRE) : '';
  };
  return filas.filter(function (s) { return s.ELABORO_ID === idUsuario; })
    .sort(function (a, b) { return marcaDe_(b.FECHA_ACTUALIZACION) - marcaDe_(a.FECHA_ACTUALIZACION); })
    .map(function (s) {
      return {
        id: s.ID_SOLICITUD, nombre: String(s.NOMBRE_DOCUMENTO), estado: s.ESTADO, nombreEstado: NOMBRES_ESTADO[s.ESTADO] || s.ESTADO,
        editable: ESTADOS_EDITABLES.indexOf(s.ESTADO) !== -1, tipoSolicitud: NOMBRES_TIPO_SOLICITUD[s.TIPO_SOLICITUD] || s.TIPO_SOLICITUD,
        tipoDocumento: nombreDe(t.tipos, 'ID_TIPO', s.ID_TIPO), departamento: nombreDe(t.departamentos, 'ID_DEPARTAMENTO', s.ID_DEPARTAMENTO),
        area: nombreDe(t.areas, 'ID_AREA', s.ID_AREA), codigo: String(s.CODIGO || ''),
        actualizada: marcaDe_(s.FECHA_ACTUALIZACION) ? formatear(new Date(marcaDe_(s.FECHA_ACTUALIZACION))) : ''
      };
    });
}

/** Todo lo que necesita la pantalla de captura: datos generales, inicio, actividades con imágenes y fin. */
function detalleSolicitud_(fila, actividades, imagenes, t, permiso, formatear) {
  const buscar = function (lista, campoId, id) { return lista.filter(function (r) { return r[campoId] === id; })[0] || {}; };
  const tipo = buscar(t.tipos, 'ID_TIPO', fila.ID_TIPO);
  const depto = buscar(t.departamentos, 'ID_DEPARTAMENTO', fila.ID_DEPARTAMENTO);
  const area = buscar(t.areas, 'ID_AREA', fila.ID_AREA);
  const subarea = buscar(t.subareas, 'ID_SUBAREA', fila.ID_SUBAREA);
  const texto = function (v) { return String(v === null || v === undefined ? '' : v); };
  const vivas = function (r) { return r.ID_SOLICITUD === fila.ID_SOLICITUD && !esActivo_(r.ELIMINADA); };
  return {
    id: fila.ID_SOLICITUD, nombre: texto(fila.NOMBRE_DOCUMENTO), estado: fila.ESTADO, nombreEstado: NOMBRES_ESTADO[fila.ESTADO] || fila.ESTADO,
    tipoSolicitud: NOMBRES_TIPO_SOLICITUD[fila.TIPO_SOLICITUD] || fila.TIPO_SOLICITUD,
    tipoDocumento: texto(tipo.NOMBRE), prefijo: texto(tipo.PREFIJO_CODIGO),
    departamento: texto(depto.NOMBRE), area: texto(area.NOMBRE), cuerpo: texto(depto.CLAVE_CODIGO) + texto(area.CLAVE_CODIGO),
    subarea: texto(subarea.NOMBRE), elaborador: texto(fila.ELABORO_NOMBRE), puesto: texto(fila.ELABORO_PUESTO),
    fechaElaboracion: marcaDe_(fila.FECHA_ELABORACION) ? formatear(new Date(marcaDe_(fila.FECHA_ELABORACION))) : '',
    codigo: texto(fila.CODIGO), version: texto(fila.VERSION),
    inicio: texto(fila.INICIO_PROCESO), fin: texto(fila.FIN_PROCESO),
    marca: String(marcaDe_(fila.FECHA_ACTUALIZACION)), puedeEditar: permiso.editar,
    actividades: actividades.filter(vivas).sort(function (a, b) { return Number(a.ORDEN) - Number(b.ORDEN); }).map(function (a) {
      return {
        id: a.ID_ACTIVIDAD, texto: texto(a.TEXTO_ORIGINAL), responsable: texto(a.PUESTO_TEXTO),
        imagenes: imagenes.filter(function (i) { return vivas(i) && i.ID_ACTIVIDAD === a.ID_ACTIVIDAD; })
          .sort(function (x, y) { return Number(x.ORDEN) - Number(y.ORDEN); })
          .map(function (i) { return { id: i.ID_IMAGEN, pie: texto(i.PIE), ancho: Number(i.ANCHO) || 0, alto: Number(i.ALTO) || 0 }; })
      };
    })
  };
}

// ─────────────────────────────── Guardar el borrador ───────────────────────────────

/** Milisegundos de una fecha de la hoja (o de su texto); 0 si no hay. */
function marcaDe_(v) {
  if (Object.prototype.toString.call(v) === '[object Date]') return v.getTime();
  return v ? (Date.parse(v) || 0) : 0;
}

/** La hoja guarda segundos: la marca de una versión se redondea al segundo para poder compararla. */
function marcaDeTiempo_(fecha) {
  return new Date(Math.floor(fecha.getTime() / 1000) * 1000);
}

/**
 * Qué escribir para dejar la solicitud como la mandó el navegador (sin tocar Google).
 *   contenido: { marca, inicio, fin, actividades: [{ id ('' = nueva), clave, texto, responsable, imagenes: [{ id, pie }] }] }
 * Las actividades que ya no vienen se marcan ELIMINADA (nada se borra); las imágenes siguen ligadas a
 * su actividad por ID aunque se reordene. Editar una solicitud CONFIRMADA la regresa a BORRADOR.
 */
function planGuardarBorrador_(contenido, fila, actividades, imagenes) {
  const L = LIMITES_CAPTURA;
  const plan = { errores: [], conflicto: false, actividadesNuevas: [], actividadesCambios: [], actividadesEliminar: [],
    imagenesCambios: [], imagenesEliminar: [], solicitud: {}, estadoNuevo: '', sinCambios: false };
  const e = plan.errores;
  if (String(contenido.marca) !== String(marcaDe_(fila.FECHA_ACTUALIZACION))) {
    plan.conflicto = true;
    e.push('La solicitud cambió en otra ventana o pestaña. Recarga la página para ver lo más reciente.');
    return plan;
  }
  const limpio = function (v) { return String(v === null || v === undefined ? '' : v).replace(/\r\n/g, '\n').trim(); };
  const inicio = limpio(contenido.inicio);
  const fin = limpio(contenido.fin);
  const lista = contenido.actividades || [];
  if (inicio.length > L.PREGUNTA_MAX || fin.length > L.PREGUNTA_MAX) e.push('Las respuestas de inicio y fin tienen un máximo de ' + L.PREGUNTA_MAX + ' caracteres.');
  if (lista.length > L.ACTIVIDADES_MAX) e.push('El máximo es de ' + L.ACTIVIDADES_MAX + ' actividades.');

  const vivas = actividades.filter(function (a) { return a.ID_SOLICITUD === fila.ID_SOLICITUD && !esActivo_(a.ELIMINADA); });
  const imagenesVivas = imagenes.filter(function (i) { return i.ID_SOLICITUD === fila.ID_SOLICITUD && !esActivo_(i.ELIMINADA); });
  const vistas = [];
  const imagenesVistas = [];

  lista.forEach(function (a, i) {
    const texto = limpio(a.texto);
    const responsable = limpio(a.responsable).replace(/\s+/g, ' ');
    if (texto.length > L.ACTIVIDAD_MAX) e.push('La actividad ' + (i + 1) + ' pasa de ' + L.ACTIVIDAD_MAX + ' caracteres.');
    if (responsable.length > L.RESPONSABLE_MAX) e.push('El responsable de la actividad ' + (i + 1) + ' es demasiado largo.');
    const orden = String(i + 1);
    if (!a.id) {
      plan.actividadesNuevas.push({ clave: String(a.clave || ''), ORDEN: orden, TEXTO_ORIGINAL: texto, PUESTO_TEXTO: responsable });
      return;
    }
    const actual = vivas.filter(function (x) { return x.ID_ACTIVIDAD === a.id; })[0];
    if (!actual) { e.push('La actividad ' + (i + 1) + ' ya no existe; recarga la página.'); return; }
    vistas.push(a.id);
    const cambios = {};
    if (String(actual.ORDEN) !== orden) cambios.ORDEN = orden;
    if (limpio(actual.TEXTO_ORIGINAL) !== texto) cambios.TEXTO_ORIGINAL = texto;
    if (limpio(actual.PUESTO_TEXTO) !== responsable) cambios.PUESTO_TEXTO = responsable;
    if (Object.keys(cambios).length) plan.actividadesCambios.push({ _fila: actual._fila, cambios: cambios });

    // Sin la lista de imágenes no se toca ninguna (así un envío incompleto nunca borra imágenes).
    if (!Array.isArray(a.imagenes)) {
      imagenesVivas.forEach(function (x) { if (x.ID_ACTIVIDAD === a.id) imagenesVistas.push(x.ID_IMAGEN); });
      return;
    }
    a.imagenes.forEach(function (im, j) {
      const img = imagenesVivas.filter(function (x) { return x.ID_IMAGEN === im.id && x.ID_ACTIVIDAD === a.id; })[0];
      if (!img) return;
      imagenesVistas.push(im.id);
      const pie = limpio(im.pie).replace(/\s+/g, ' ');
      if (pie.length > L.PIE_MAX) e.push('El pie de una imagen de la actividad ' + (i + 1) + ' pasa de ' + L.PIE_MAX + ' caracteres.');
      const c = {};
      if (String(img.ORDEN) !== String(j + 1)) c.ORDEN = String(j + 1);
      if (limpio(img.PIE) !== pie) c.PIE = pie;
      if (Object.keys(c).length) plan.imagenesCambios.push({ _fila: img._fila, cambios: c });
    });
  });
  vivas.forEach(function (a) { if (vistas.indexOf(a.ID_ACTIVIDAD) === -1) plan.actividadesEliminar.push(a._fila); });
  imagenesVivas.forEach(function (i) { if (imagenesVistas.indexOf(i.ID_IMAGEN) === -1) plan.imagenesEliminar.push(i._fila); });
  if (e.length) return plan;

  if (limpio(fila.INICIO_PROCESO) !== inicio) plan.solicitud.INICIO_PROCESO = inicio;
  if (limpio(fila.FIN_PROCESO) !== fin) plan.solicitud.FIN_PROCESO = fin;
  plan.sinCambios = !Object.keys(plan.solicitud).length && !plan.actividadesNuevas.length && !plan.actividadesCambios.length &&
    !plan.actividadesEliminar.length && !plan.imagenesCambios.length && !plan.imagenesEliminar.length;
  if (!plan.sinCambios && fila.ESTADO === ESTADOS.CONFIRMADO) plan.estadoNuevo = ESTADOS.BORRADOR;
  return plan;
}

/** Aplica el plan, recalcula la huella y devuelve la nueva marca y los IDs de las actividades nuevas. */
function guardarBorrador_(sesion, idSolicitud, contenido) {
  const fila = filaSolicitud_(idSolicitud);
  if (!permisoSolicitud_(sesion, fila).editar) throw new Error('No puedes editar esta solicitud.');
  const actividades = leerTabla_('Actividades');
  const imagenes = leerTabla_('Imagenes');
  const plan = planGuardarBorrador_(contenido || {}, fila, actividades, imagenes);
  if (plan.errores.length) throw new Error(plan.errores.join(' '));
  if (plan.sinCambios) return { marca: String(marcaDe_(fila.FECHA_ACTUALIZACION)), ids: {}, estado: fila.ESTADO };

  const ahora = marcaDeTiempo_(new Date());
  const ids = {};
  const nuevosIds = reservarIds_('ACT', plan.actividadesNuevas.length, 6);
  agregarFilas_('Actividades', plan.actividadesNuevas.map(function (a, i) {
    ids[a.clave] = nuevosIds[i];
    return { ID_ACTIVIDAD: nuevosIds[i], ID_SOLICITUD: idSolicitud, ORDEN: a.ORDEN, TEXTO_ORIGINAL: a.TEXTO_ORIGINAL, TEXTO_FINAL: '',
      ID_PUESTO: '', PUESTO_TEXTO: a.PUESTO_TEXTO, RESPONSABLE_CONFIRMADO: 'NO', ELIMINADA: 'NO', FECHA_ACTUALIZACION: ahora };
  }));
  plan.actividadesCambios.forEach(function (c) {
    actualizarFila_('Actividades', c._fila, Object.assign({ FECHA_ACTUALIZACION: ahora }, c.cambios));
  });
  plan.actividadesEliminar.forEach(function (f) { actualizarFila_('Actividades', f, { ELIMINADA: 'SI', FECHA_ACTUALIZACION: ahora }); });
  plan.imagenesCambios.forEach(function (c) { actualizarFila_('Imagenes', c._fila, c.cambios); });
  plan.imagenesEliminar.forEach(function (f) { actualizarFila_('Imagenes', f, { ELIMINADA: 'SI' }); });

  const cambios = Object.assign({ FECHA_ACTUALIZACION: ahora }, plan.solicitud);
  if (plan.estadoNuevo) cambios.ESTADO = plan.estadoNuevo;
  cambios.HUELLA_CONTENIDO = huellaSolicitud_(idSolicitud, fila, Object.assign({}, fila, cambios));
  actualizarFila_('Solicitudes', fila._fila, cambios);
  if (plan.estadoNuevo) {
    registrarBitacora_(sesion, 'EDITAR_CONFIRMADO', 'Se editó después de confirmar: hay que volver a confirmar.', idSolicitud, fila.ESTADO, plan.estadoNuevo);
  }
  return { marca: String(ahora.getTime()), ids: ids, estado: cambios.ESTADO || fila.ESTADO };
}

/** Huella del contenido tal como quedó en la hoja (después de escribir). */
function huellaSolicitud_(idSolicitud, fila, filaNueva) {
  SpreadsheetApp.flush();
  const det = detalleSolicitud_(filaNueva, leerTabla_('Actividades'), leerTabla_('Imagenes'),
    { tipos: [], departamentos: [], areas: [], subareas: [] }, { editar: false }, function () { return ''; });
  return huella_(contenidoCanonico_({ nombre: det.nombre, inicio: det.inicio, fin: det.fin, actividades: det.actividades }));
}

// ─────────────────────────────── Imágenes ───────────────────────────────

/** Parámetros de optimización de imágenes que usa el navegador (hoja Config, §3.2). */
function parametrosImagen_() {
  const c = leerConfig_();
  const numero = function (clave, porDefecto) { const n = Number(c[clave]); return isFinite(n) && n > 0 ? n : porDefecto; };
  return { anchoMax: numero('IMG_ANCHO_MAX', 1600), calidad: numero('IMG_CALIDAD', 0.82), pesoObjetivoKb: numero('IMG_PESO_OBJETIVO_KB', 300),
    maxPorActividad: numero('IMG_MAX_POR_ACTIVIDAD', 10), miniatura: MINIATURA_ANCHO, mbMax: LIMITES_CAPTURA.IMAGEN_MB_MAX };
}

/** Valida un archivo que manda el navegador ({ base64, tipo }) y devuelve su blob. */
function blobDeImagen_(archivo, nombre) {
  const tipos = { 'image/webp': 'webp', 'image/jpeg': 'jpg', 'image/png': 'png' };
  if (!archivo || !tipos[archivo.tipo]) throw new Error('Formato de imagen no permitido (solo PNG, JPG o WebP).');
  const bytes = Utilities.base64Decode(String(archivo.base64 || ''));
  if (!bytes.length) throw new Error('La imagen llegó vacía.');
  if (bytes.length > LIMITES_CAPTURA.IMAGEN_MB_MAX * 1024 * 1024) throw new Error('La imagen pesa más de ' + LIMITES_CAPTURA.IMAGEN_MB_MAX + ' MB aun optimizada.');
  return Utilities.newBlob(bytes, archivo.tipo, nombre + '.' + tipos[archivo.tipo]);
}

/**
 * Guarda una imagen ya optimizada por el navegador: WebP para la app, JPG/PNG para el Word/PDF y una
 * miniatura (§3.2). datos: { idActividad, app, documento, miniatura ({ base64, tipo }), ancho, alto }.
 */
function subirImagen_(sesion, idSolicitud, datos) {
  const fila = filaSolicitud_(idSolicitud);
  if (!permisoSolicitud_(sesion, fila).editar) throw new Error('No puedes editar esta solicitud.');
  const actividad = leerTabla_('Actividades').filter(function (a) {
    return a.ID_ACTIVIDAD === datos.idActividad && a.ID_SOLICITUD === idSolicitud && !esActivo_(a.ELIMINADA);
  })[0];
  if (!actividad) throw new Error('La actividad ya no existe; recarga la página.');
  const suyas = leerTabla_('Imagenes').filter(function (i) { return i.ID_ACTIVIDAD === actividad.ID_ACTIVIDAD && !esActivo_(i.ELIMINADA); });
  const maximo = parametrosImagen_().maxPorActividad;
  if (suyas.length >= maximo) throw new Error('Cada actividad admite hasta ' + maximo + ' imágenes.');

  const id = siguienteId_('IMG', 6);
  const app = blobDeImagen_(datos.app, id);
  const documento = blobDeImagen_(datos.documento, id + '-documento');
  const miniatura = blobDeImagen_(datos.miniatura, id + '-miniatura');
  const carpeta = asegurarCarpeta_(DriveApp.getFolderById(fila.ID_CARPETA), 'Imágenes', null, null);
  const ahora = marcaDeTiempo_(new Date());
  const orden = suyas.reduce(function (m, i) { return Math.max(m, Number(i.ORDEN) || 0); }, 0) + 1;
  agregarFila_('Imagenes', {
    ID_IMAGEN: id, ID_ACTIVIDAD: actividad.ID_ACTIVIDAD, ID_SOLICITUD: idSolicitud, ORDEN: String(orden),
    ID_ARCHIVO: carpeta.createFile(app).getId(), ID_ARCHIVO_DOCUMENTO: carpeta.createFile(documento).getId(),
    ID_ARCHIVO_MINIATURA: carpeta.createFile(miniatura).getId(),
    FORMATO: datos.app.tipo.replace('image/', '').toUpperCase(), ANCHO: String(Math.round(datos.ancho) || ''),
    ALTO: String(Math.round(datos.alto) || ''), PESO_KB: String(Math.round(app.getBytes().length / 1024)),
    PIE: '', ELIMINADA: 'NO', FECHA_CARGA: ahora
  });
  const cambios = { FECHA_ACTUALIZACION: ahora };
  if (fila.ESTADO === ESTADOS.CONFIRMADO) cambios.ESTADO = ESTADOS.BORRADOR;
  cambios.HUELLA_CONTENIDO = huellaSolicitud_(idSolicitud, fila, Object.assign({}, fila, cambios));
  actualizarFila_('Solicitudes', fila._fila, cambios);
  if (cambios.ESTADO) {
    registrarBitacora_(sesion, 'EDITAR_CONFIRMADO', 'Se agregó una imagen después de confirmar.', idSolicitud, fila.ESTADO, cambios.ESTADO);
  }
  return { id: id, marca: String(ahora.getTime()), estado: cambios.ESTADO || fila.ESTADO };
}

/** Archivo de una imagen como data URL. cual: 'miniatura' | 'app'. */
function imagenDataUrl_(img, cual) {
  const idArchivo = cual === 'miniatura' ? (img.ID_ARCHIVO_MINIATURA || img.ID_ARCHIVO) : img.ID_ARCHIVO;
  const blob = DriveApp.getFileById(idArchivo).getBlob();
  return 'data:' + blob.getContentType() + ';base64,' + Utilities.base64Encode(blob.getBytes());
}

/** Miniaturas de todas las imágenes vivas de una solicitud: { ID_IMAGEN: dataUrl }. */
function miniaturasSolicitud_(sesion, idSolicitud) {
  const fila = filaSolicitud_(idSolicitud);
  if (!permisoSolicitud_(sesion, fila).ver) throw new Error('No puedes ver esta solicitud.');
  const resultado = {};
  leerTabla_('Imagenes').filter(function (i) { return i.ID_SOLICITUD === idSolicitud && !esActivo_(i.ELIMINADA); })
    .forEach(function (i) {
      try { resultado[i.ID_IMAGEN] = imagenDataUrl_(i, 'miniatura'); } catch (e) { resultado[i.ID_IMAGEN] = ''; }
    });
  return resultado;
}

/** Una imagen en tamaño completo (WebP de la app). */
function imagenCompleta_(sesion, idImagen) {
  const img = leerTabla_('Imagenes').filter(function (i) { return i.ID_IMAGEN === idImagen; })[0];
  if (!img) throw new Error('No existe la imagen ' + idImagen + '.');
  if (!permisoSolicitud_(sesion, filaSolicitud_(img.ID_SOLICITUD)).ver) throw new Error('No puedes ver esta imagen.');
  return imagenDataUrl_(img, 'app');
}

// ─────────────────────────────── Cancelar ───────────────────────────────

/** ¿Se puede pasar de un estado a otro? (TRANSICIONES) */
function transicionValida_(de, a) {
  return (TRANSICIONES[de] || []).indexOf(a) !== -1;
}

function cancelarSolicitud_(sesion, idSolicitud, motivo) {
  const fila = filaSolicitud_(idSolicitud);
  if (fila.ELABORO_ID !== sesion.idUsuario) throw new Error('Solo quien elaboró la solicitud puede cancelarla.');
  if (!transicionValida_(fila.ESTADO, ESTADOS.CANCELADO)) {
    throw new Error('Una solicitud «' + (NOMBRES_ESTADO[fila.ESTADO] || fila.ESTADO) + '» ya no se puede cancelar.');
  }
  const texto = String(motivo || '').replace(/\s+/g, ' ').trim();
  actualizarFila_('Solicitudes', fila._fila, { ESTADO: ESTADOS.CANCELADO, MOTIVO_CIERRE: texto, FECHA_ACTUALIZACION: marcaDeTiempo_(new Date()) });
  registrarBitacora_(sesion, 'CANCELAR_SOLICITUD', texto, idSolicitud, fila.ESTADO, ESTADOS.CANCELADO);
  return { estado: ESTADOS.CANCELADO };
}
