/**
 * PUERTA DEL NAVEGADOR AL SERVIDOR
 *
 * Las únicas funciones que la app llama con google.script.run (todas empiezan con "api"). Cada una
 * es delgada: pide la sesión, revisa permisos y llama al servicio que hace el trabajo. Todas reciben
 * `comoUsuario` (vacío = la persona real) y piden la sesión con sesionEfectiva_, que solo deja
 * «ver como» a un administrador en PRUEBAS.
 *
 * Consultar: ADMINISTRADOR y SOPORTE_CI. Cambiar: solo ADMINISTRADOR (Soporte CI nunca cambia nada).
 */

/** Cambia de usuario con «ver como» (o regresa al real con comoUsuario vacío). */
function apiSesion(comoUsuario) {
  const sesion = sesionEfectiva_(comoUsuario || '');
  if (sesion.verComo) {
    registrarBitacora_(sesion, 'VER_COMO', 'Perfiles: ' + (sesion.perfiles.join(', ') || 'ninguno'));
  }
  return { sesion: sesion, modulos: sesion.registrado ? modulosDe_(sesion.perfiles) : [] };
}

/** Pantalla «Catálogos»: departamentos → áreas → subáreas. */
function apiCatalogoAreas(comoUsuario) {
  requierePerfil_(sesionEfectiva_(comoUsuario), ['ADMINISTRADOR', 'SOPORTE_CI']);
  return arbolCatalogo_(leerTabla_('Departamentos'), leerTabla_('Areas'), leerTabla_('Subareas'));
}

/** Pantalla «Usuarios y perfiles»: la lista y los departamentos que se pueden asignar. */
function apiUsuarios(comoUsuario) {
  const sesion = requierePerfil_(sesionEfectiva_(comoUsuario), ['ADMINISTRADOR', 'SOPORTE_CI']);
  const departamentos = leerTabla_('Departamentos');
  return {
    usuarios: listaUsuarios_(leerTabla_('Usuarios'), leerTabla_('UsuarioPerfiles'), leerTabla_('UsuarioDepartamentos'), departamentos),
    departamentos: departamentos.filter(function (d) { return esActivo_(d.ACTIVO); })
      .map(function (d) { return { id: d.ID_DEPARTAMENTO, nombre: String(d.NOMBRE), clave: String(d.CLAVE_CODIGO) }; })
      .sort(function (a, b) { return a.nombre.localeCompare(b.nombre, 'es'); }),
    puedeEditar: sesion.perfiles.indexOf('ADMINISTRADOR') !== -1,
    yo: sesion.idUsuario,
    dominios: DOMINIOS_CORREO[ambienteActual_()] || DOMINIOS_CORREO.PRODUCCION
  };
}

/** Alta o cambio de un usuario (solo ADMINISTRADOR). Ver reglas en services/Usuarios.gs. */
function apiGuardarUsuario(comoUsuario, datos) {
  const sesion = requierePerfil_(sesionEfectiva_(comoUsuario), ['ADMINISTRADOR']);
  return guardarUsuario_(sesion, datos || {});
}

/** Pantalla «Bitácora»: los renglones más recientes. */
function apiBitacora(comoUsuario) {
  requierePerfil_(sesionEfectiva_(comoUsuario), ['ADMINISTRADOR', 'SOPORTE_CI']);
  return entradasBitacora_(leerTabla_('Bitacora'), formatoFecha_, BITACORA_MAX_RENGLONES);
}

// ─────────────────────────────── Solicitudes (fase 2) ───────────────────────────────

/** Lo que se puede elegir al crear una solicitud (tipos, departamentos de la persona con sus áreas). */
function apiOpcionesSolicitud(comoUsuario) {
  const sesion = requierePerfil_(sesionEfectiva_(comoUsuario), ['COLABORADOR']);
  return opcionesNuevaSolicitud_(sesion, tablasSolicitud_());
}

/** Documentos vigentes y solicitudes en curso con nombre parecido (§2.1). */
function apiBuscarCoincidencias(comoUsuario, nombre, excluir) {
  requierePerfil_(sesionEfectiva_(comoUsuario), ['COLABORADOR', 'REVISOR']);
  return coincidenciasNombre_(String(nombre || ''), leerTabla_('Documentos'), leerTabla_('Solicitudes'), excluir || '');
}

function apiCrearSolicitud(comoUsuario, datos) {
  const sesion = requierePerfil_(sesionEfectiva_(comoUsuario), ['COLABORADOR']);
  return crearSolicitud_(sesion, datos || {});
}

/** «Mis solicitudes». */
function apiMisSolicitudes(comoUsuario) {
  const sesion = requierePerfil_(sesionEfectiva_(comoUsuario), ['COLABORADOR']);
  return resumenSolicitudes_(leerTabla_('Solicitudes'), sesion.idUsuario, tablasSolicitud_(), formatoFecha_);
}

/** Una solicitud completa para la captura (o para consultarla). */
function apiSolicitud(comoUsuario, idSolicitud) {
  const sesion = sesionEfectiva_(comoUsuario);
  const fila = filaSolicitud_(idSolicitud);
  const permiso = permisoSolicitud_(sesion, fila);
  if (!permiso.ver) throw new Error('No puedes ver esta solicitud.');
  const detalle = detalleSolicitud_(fila, leerTabla_('Actividades'), leerTabla_('Imagenes'), tablasSolicitud_(), permiso, formatoFecha_);
  detalle.esSuya = fila.ELABORO_ID === sesion.idUsuario;
  detalle.imagen = parametrosImagen_();
  return detalle;
}

/** Guardado automático del borrador (inicio, actividades, pies de imagen, fin). */
function apiGuardarBorrador(comoUsuario, idSolicitud, contenido) {
  const sesion = requierePerfil_(sesionEfectiva_(comoUsuario), ['COLABORADOR']);
  return guardarBorrador_(sesion, idSolicitud, contenido);
}

/** Imagen ya optimizada por el navegador (WebP, JPG/PNG para el documento y miniatura). */
function apiSubirImagen(comoUsuario, idSolicitud, datos) {
  const sesion = requierePerfil_(sesionEfectiva_(comoUsuario), ['COLABORADOR']);
  return subirImagen_(sesion, idSolicitud, datos || {});
}

function apiMiniaturas(comoUsuario, idSolicitud) {
  return miniaturasSolicitud_(sesionEfectiva_(comoUsuario), idSolicitud);
}

function apiImagen(comoUsuario, idImagen) {
  return imagenCompleta_(sesionEfectiva_(comoUsuario), idImagen);
}

// ─────────────────────────────── Análisis con IA y confirmación (fase 3) ───────────────────────────────

/** Paso 4: actividades, propuestas y preguntas vigentes, y textos derivados. */
function apiAnalisis(comoUsuario, idSolicitud) {
  const sesion = sesionEfectiva_(comoUsuario);
  const fila = filaSolicitud_(idSolicitud);
  const permiso = permisoSolicitud_(sesion, fila);
  if (!permiso.ver) throw new Error('No puedes ver esta solicitud.');
  const det = detalleSolicitud_(fila, leerTabla_('Actividades'), leerTabla_('Imagenes'), tablasSolicitud_(), permiso, formatoFecha_);
  const estado = estadoAnalisis_(det, leerTabla_('PropuestasIA'), leerTabla_('Aclaraciones'), obtenerConfig_('IA_ACTIVA', 'NO') === 'SI', formatoFecha_);
  estado.solicitud = { id: det.id, nombre: det.nombre, estado: det.estado, esSuya: fila.ELABORO_ID === sesion.idUsuario };
  return estado;
}

/** Manda el proceso a la IA (puede tardar hasta un minuto). */
function apiAnalizar(comoUsuario, idSolicitud) {
  const sesion = requierePerfil_(sesionEfectiva_(comoUsuario), ['COLABORADOR']);
  return analizarSolicitud_(sesion, idSolicitud);
}

/** decision: ACEPTADA | EDITADA | RECHAZADA. */
function apiDecidirPropuesta(comoUsuario, idSolicitud, idPropuesta, decision, valor) {
  const sesion = requierePerfil_(sesionEfectiva_(comoUsuario), ['COLABORADOR']);
  return decidirPropuesta_(sesion, idSolicitud, idPropuesta, decision, valor);
}

/** estado: RESPONDIDA | NO_APLICA | NO_LO_SE. */
function apiResponderPregunta(comoUsuario, idSolicitud, idAclaracion, estado, respuesta) {
  const sesion = requierePerfil_(sesionEfectiva_(comoUsuario), ['COLABORADOR']);
  return responderAclaracion_(sesion, idSolicitud, idAclaracion, estado, respuesta);
}

/** Objetivo, alcance, responsabilidades y definiciones escritos a mano. */
function apiGuardarDerivados(comoUsuario, idSolicitud, datos) {
  const sesion = requierePerfil_(sesionEfectiva_(comoUsuario), ['COLABORADOR']);
  return guardarDerivados_(sesion, idSolicitud, datos);
}

/** Paso 5: el borrador integral, lo que falta y la huella de lo que se está viendo. */
function apiVistaPrevia(comoUsuario, idSolicitud) {
  return vistaPrevia_(sesionEfectiva_(comoUsuario), idSolicitud);
}

/** «¿El documento describe correctamente cómo se realiza el proceso?» → Sí. */
function apiConfirmar(comoUsuario, idSolicitud, huella) {
  const sesion = requierePerfil_(sesionEfectiva_(comoUsuario), ['COLABORADOR']);
  return confirmarSolicitud_(sesion, idSolicitud, huella);
}

// ─────────────────────────────── Documentos (fase 4) ───────────────────────────────

/** Word y PDF con «COPIA NO AUTORIZADA» del contenido confirmado (puede tardar hasta un minuto). */
function apiGenerarPreliminar(comoUsuario, idSolicitud) {
  const sesion = requierePerfil_(sesionEfectiva_(comoUsuario), ['COLABORADOR', 'REVISOR']);
  return generarPreliminar_(sesion, idSolicitud);
}

/** El archivo para descargarlo; el permiso se revisa en el servidor (§4.4). */
function apiDescargarArchivo(comoUsuario, idArchivo) {
  return descargarArchivo_(sesionEfectiva_(comoUsuario), idArchivo);
}

// ─────────────────────────────── Revisión de Procesos (fase 5) ───────────────────────────────

/** El colaborador manda su solicitud confirmada a revisión. */
function apiEnviarRevision(comoUsuario, idSolicitud) {
  const sesion = requierePerfil_(sesionEfectiva_(comoUsuario), ['COLABORADOR']);
  return enviarARevision_(sesion, idSolicitud);
}

/** Bandeja de Procesos. El administrador la ve solo para reasignar. */
function apiBandeja(comoUsuario) {
  const sesion = requierePerfil_(sesionEfectiva_(comoUsuario), ['REVISOR', 'ADMINISTRADOR']);
  const t = tablasSolicitud_();
  return {
    grupos: bandejaRevision_(leerTabla_('Solicitudes'), sesion, t, t.usuarios, formatoFecha_, new Date()),
    soyRevisor: sesion.perfiles.indexOf('REVISOR') !== -1,
    puedeReasignar: sesion.perfiles.indexOf('ADMINISTRADOR') !== -1,
    revisores: revisoresActivos_(t.usuarios, leerTabla_('UsuarioPerfiles'))
  };
}

function apiTomar(comoUsuario, idSolicitud) {
  const sesion = requierePerfil_(sesionEfectiva_(comoUsuario), ['REVISOR']);
  return tomarSolicitud_(sesion, idSolicitud);
}

function apiLiberar(comoUsuario, idSolicitud) {
  const sesion = requierePerfil_(sesionEfectiva_(comoUsuario), ['REVISOR']);
  return liberarSolicitud_(sesion, idSolicitud);
}

/** idRevisor vacío = de regreso a «sin asignar». */
function apiReasignar(comoUsuario, idSolicitud, idRevisor) {
  const sesion = requierePerfil_(sesionEfectiva_(comoUsuario), ['ADMINISTRADOR']);
  return reasignarSolicitud_(sesion, idSolicitud, idRevisor);
}

/** La pantalla de revisión de una solicitud (Soporte CI la ve en consulta; el administrador solo reasigna). */
function apiRevision(comoUsuario, idSolicitud) {
  const sesion = requierePerfil_(sesionEfectiva_(comoUsuario), ['REVISOR', 'SOPORTE_CI']);
  return detalleRevision_(sesion, idSolicitud);
}

/** datos: { apartado, idActividad, texto }. */
function apiObservar(comoUsuario, idSolicitud, datos) {
  const sesion = requierePerfil_(sesionEfectiva_(comoUsuario), ['REVISOR']);
  return agregarObservacion_(sesion, idSolicitud, datos);
}

/** accion: ATENDER (colaborador) · CERRAR o REABRIR (revisor). */
function apiCambiarObservacion(comoUsuario, idSolicitud, idObservacion, accion, texto) {
  const sesion = requierePerfil_(sesionEfectiva_(comoUsuario), ['COLABORADOR', 'REVISOR']);
  return cambiarObservacion_(sesion, idSolicitud, idObservacion, accion, texto);
}

function apiDevolver(comoUsuario, idSolicitud) {
  const sesion = requierePerfil_(sesionEfectiva_(comoUsuario), ['REVISOR']);
  return devolverSolicitud_(sesion, idSolicitud);
}

function apiNoProcedente(comoUsuario, idSolicitud, motivo) {
  const sesion = requierePerfil_(sesionEfectiva_(comoUsuario), ['REVISOR']);
  return noProcedente_(sesion, idSolicitud, motivo);
}

/** Vo.Bo. de Procesos con el código que confirma el revisor. */
function apiVoBo(comoUsuario, idSolicitud, codigo) {
  const sesion = requierePerfil_(sesionEfectiva_(comoUsuario), ['REVISOR']);
  return darVoBo_(sesion, idSolicitud, codigo);
}

function apiCancelarSolicitud(comoUsuario, idSolicitud, motivo) {
  const sesion = requierePerfil_(sesionEfectiva_(comoUsuario), ['COLABORADOR']);
  return cancelarSolicitud_(sesion, idSolicitud, motivo);
}
