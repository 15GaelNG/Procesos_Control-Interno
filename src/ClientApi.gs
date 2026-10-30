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

/** Pantalla «Puestos»: el catálogo y los departamentos que se pueden asignar. */
function apiPuestos(comoUsuario) {
  const sesion = requierePerfil_(sesionEfectiva_(comoUsuario), ['ADMINISTRADOR', 'SOPORTE_CI']);
  const departamentos = leerTabla_('Departamentos');
  return {
    puestos: listaPuestos_(leerTabla_('Puestos'), departamentos),
    departamentos: departamentos.filter(function (d) { return esActivo_(d.ACTIVO); })
      .map(function (d) { return { id: d.ID_DEPARTAMENTO, nombre: String(d.NOMBRE) }; })
      .sort(function (a, b) { return a.nombre.localeCompare(b.nombre, 'es'); }),
    puedeEditar: sesion.perfiles.indexOf('ADMINISTRADOR') !== -1
  };
}

/** Alta o cambio de un puesto. datos: { id, nombre, idDepartamento, sinonimos, activo }. */
function apiGuardarPuesto(comoUsuario, datos) {
  const sesion = requierePerfil_(sesionEfectiva_(comoUsuario), ['ADMINISTRADOR']);
  return guardarPuesto_(sesion, datos);
}

/** Varios puestos de una lista pegada (un renglón por puesto; sinónimos después de «|»). */
function apiImportarPuestos(comoUsuario, texto) {
  const sesion = requierePerfil_(sesionEfectiva_(comoUsuario), ['ADMINISTRADOR']);
  return importarPuestos_(sesion, texto);
}

/** «Todas las solicitudes» (Soporte CI, solo consulta). */
function apiTodasSolicitudes(comoUsuario) {
  requierePerfil_(sesionEfectiva_(comoUsuario), ['SOPORTE_CI']);
  return todasLasSolicitudes_(leerTabla_('Solicitudes'), tablasSolicitud_(), formatoFecha_);
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

/** Los documentos vigentes que la persona puede actualizar (fase 7). */
function apiDocumentosActualizables(comoUsuario) {
  const sesion = requierePerfil_(sesionEfectiva_(comoUsuario), ['COLABORADOR']);
  const deptos = departamentosDe_(sesion.idUsuario, leerTabla_('UsuarioDepartamentos')).map(function (d) { return d.id; });
  return documentosActualizables_(leerTabla_('Documentos'), leerTabla_('Solicitudes'), deptos, tablasSolicitud_());
}

/** Control de cambios de una actualización. datos: { motivos: [MOTIVOS_CAMBIO], descripcion }. */
function apiGuardarControlCambios(comoUsuario, idSolicitud, datos) {
  const sesion = requierePerfil_(sesionEfectiva_(comoUsuario), ['COLABORADOR', 'REVISOR']);
  return guardarControlCambios_(sesion, idSolicitud, datos);
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
  // Sugerencias de la IA mientras se escribe (paso 3).
  detalle.sugerirRedaccion = permiso.editar && sugerenciasActivas_();
  detalle.sugerencia = { minCaracteres: IA_SUGERENCIA_MIN_CARACTERES, esperaMs: IA_SUGERENCIA_ESPERA_MS };
  // Importar un Word o PDF existente con la IA (fase 7).
  detalle.importar = permiso.editar && obtenerConfig_('IA_ACTIVA', 'NO') === 'SI';
  // Lo que Procesos observó (o corrigió) y no está cerrado: se muestra junto a cada parte.
  detalle.observaciones = observacionesDe_(leerTabla_('Observaciones'), idSolicitud, detalle, formatoFecha_)
    .filter(function (o) { return o.estado !== 'CERRADA'; });
  const revisor = leerTabla_('Usuarios').filter(function (u) { return u.ID_USUARIO === fila.REVISOR_ASIGNADO_ID; })[0];
  detalle.revisor = revisor ? String(revisor.NOMBRE) : '';
  return detalle;
}

/** La redacción que sugiere la IA para una actividad mientras se escribe (no guarda nada). */
function apiSugerirRedaccion(comoUsuario, idSolicitud, texto) {
  const sesion = requierePerfil_(sesionEfectiva_(comoUsuario), ['COLABORADOR']);
  return sugerirRedaccion_(sesion, idSolicitud, texto);
}

/** Guardado automático del borrador (inicio, actividades, pies de imagen, fin). */
function apiGuardarBorrador(comoUsuario, idSolicitud, contenido) {
  const sesion = requierePerfil_(sesionEfectiva_(comoUsuario), ['COLABORADOR']);
  return guardarBorrador_(sesion, idSolicitud, contenido);
}

/** Un Word o PDF existente que la IA separa en inicio, actividades y fin (no guarda nada: el colaborador decide). */
function apiImportarDocumento(comoUsuario, idSolicitud, archivo) {
  const sesion = requierePerfil_(sesionEfectiva_(comoUsuario), ['COLABORADOR']);
  return importarDocumento_(sesion, idSolicitud, archivo);
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
  return pantallaAnalisis_(sesionEfectiva_(comoUsuario), idSolicitud);
}

/*
 * Las acciones del paso 4 devuelven la pantalla ya al día (paso4): un solo viaje por acción.
 */

/** Manda el proceso a la IA (unos segundos; si tarda, la pantalla lanza otro intento). */
function apiAnalizar(comoUsuario, idSolicitud, operacion, intento, corrida) {
  const sesion = requierePerfil_(sesionEfectiva_(comoUsuario), ['COLABORADOR']);
  const r = analizarSolicitud_(sesion, idSolicitud, { operacion: operacion === 'REDACCION' ? 'REDACCION' : 'ANALISIS',
    intento: Math.max(0, Math.min(Number(intento) || 0, IA_INTENTOS_PARALELOS - 1)), corrida: String(corrida || '') });
  return r.descartado ? r : conPantallaAnalisis_(sesion, idSolicitud, r);
}

/*
 * sinPantalla: la pantalla ya se actualizó sola (la persona no espera al servidor) y no necesita que se
 * la regresen.
 */

/** decision: ACEPTADA | EDITADA | RECHAZADA. */
function apiDecidirPropuesta(comoUsuario, idSolicitud, idPropuesta, decision, valor, sinPantalla) {
  const sesion = requierePerfil_(sesionEfectiva_(comoUsuario), ['COLABORADOR']);
  const r = decidirPropuesta_(sesion, idSolicitud, idPropuesta, decision, valor);
  return sinPantalla ? r : conPantallaAnalisis_(sesion, idSolicitud, r);
}

/** Acepta de una vez las propuestas pendientes de un grupo: REDACCION o DEMAS (GRUPOS_PROPUESTA). */
function apiAceptarPropuestas(comoUsuario, idSolicitud, grupo, sinPantalla) {
  const sesion = requierePerfil_(sesionEfectiva_(comoUsuario), ['COLABORADOR']);
  const r = aceptarPropuestas_(sesion, idSolicitud, grupo);
  return sinPantalla ? r : conPantallaAnalisis_(sesion, idSolicitud, r);
}

/** estado: RESPONDIDA | NO_APLICA | NO_LO_SE. */
function apiResponderPregunta(comoUsuario, idSolicitud, idAclaracion, estado, respuesta, sinPantalla) {
  const sesion = requierePerfil_(sesionEfectiva_(comoUsuario), ['COLABORADOR']);
  const r = responderAclaracion_(sesion, idSolicitud, idAclaracion, estado, respuesta);
  return sinPantalla ? r : conPantallaAnalisis_(sesion, idSolicitud, r);
}

/** Objetivo, alcance, responsabilidades y definiciones escritos a mano. */
function apiGuardarDerivados(comoUsuario, idSolicitud, datos) {
  const sesion = requierePerfil_(sesionEfectiva_(comoUsuario), ['COLABORADOR']);
  return conPantallaAnalisis_(sesion, idSolicitud, guardarDerivados_(sesion, idSolicitud, datos));
}

/**
 * Lo escrito sin guardar en el paso 4 (respuestas y textos), de una vez. pendientes: { respuestas, derivados }.
 * sinPantalla: el guardado automático de una respuesta no necesita la pantalla de regreso.
 */
function apiGuardarPendientesAnalisis(comoUsuario, idSolicitud, pendientes, sinPantalla) {
  const sesion = requierePerfil_(sesionEfectiva_(comoUsuario), ['COLABORADOR']);
  const r = guardarPendientesAnalisis_(sesion, idSolicitud, pendientes);
  return sinPantalla ? r : conPantallaAnalisis_(sesion, idSolicitud, r);
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

/** «Sí, es correcto: enviar a Procesos»: confirma y envía en un paso (si falta algo, dice qué). */
function apiConfirmarYEnviar(comoUsuario, idSolicitud, huella) {
  const sesion = requierePerfil_(sesionEfectiva_(comoUsuario), ['COLABORADOR']);
  return confirmarYEnviar_(sesion, idSolicitud, huella);
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

/** El archivo para verlo en el visor de la app (mismo permiso que descargarlo). */
function apiVerArchivo(comoUsuario, idArchivo) {
  return descargarArchivo_(sesionEfectiva_(comoUsuario), idArchivo, true);
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

/** Historial de cambios de la solicitud: quien la puede ver (colaborador que la elaboró, Procesos, Soporte CI). */
function apiHistorial(comoUsuario, idSolicitud) {
  return historial_(sesionEfectiva_(comoUsuario), idSolicitud);
}

/** Procesos corrige una parte del contenido. datos: { apartado, idActividad, valor, responsable }. */
function apiEditarRevisor(comoUsuario, idSolicitud, datos) {
  const sesion = requierePerfil_(sesionEfectiva_(comoUsuario), ['REVISOR']);
  return editarComoRevisor_(sesion, idSolicitud, datos);
}

/** Procesos corrige el código después del Vo.Bo. */
function apiCambiarCodigo(comoUsuario, idSolicitud, codigo) {
  const sesion = requierePerfil_(sesionEfectiva_(comoUsuario), ['REVISOR']);
  return cambiarCodigo_(sesion, idSolicitud, codigo);
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

/** Vo.Bo. de Procesos con el código que confirma el revisor (y, en una actualización, si es mayor o menor). */
function apiVoBo(comoUsuario, idSolicitud, codigo, tipoCambio) {
  const sesion = requierePerfil_(sesionEfectiva_(comoUsuario), ['REVISOR']);
  return darVoBo_(sesion, idSolicitud, codigo, tipoCambio);
}

// ─────────────────────────────── CH e inventario (fase 6) ───────────────────────────────

/** «Envíos a CH»: por subir, en CH y resueltas, con los puestos del catálogo para el autorizador. */
function apiEnviosCH(comoUsuario) {
  const sesion = requierePerfil_(sesionEfectiva_(comoUsuario), ['REVISOR']);
  return pantallaEnviosCH_(sesion);
}

/** «Ya lo subí a CH». datos: { fecha: 'yyyy-mm-dd', folio }. */
function apiRegistrarEnvioCH(comoUsuario, idSolicitud, datos) {
  const sesion = requierePerfil_(sesionEfectiva_(comoUsuario), ['REVISOR']);
  return registrarEnvioCH_(sesion, idSolicitud, datos);
}

/** Lo que resolvió CH. datos: { resultado: 'AUTORIZADO' | 'RECHAZADO', nombre, puesto, fecha, comentario }. */
function apiResultadoCH(comoUsuario, idSolicitud, datos) {
  const sesion = requierePerfil_(sesionEfectiva_(comoUsuario), ['REVISOR']);
  return registrarResultadoCH_(sesion, idSolicitud, datos);
}

/** El documento final sin marca de agua (solo autorizado). */
function apiGenerarFinal(comoUsuario, idSolicitud) {
  const sesion = requierePerfil_(sesionEfectiva_(comoUsuario), ['REVISOR']);
  return generarFinal_(sesion, idSolicitud);
}

/** Tablero de indicadores: cómo van los procesos (solo consulta). */
function apiTablero(comoUsuario) {
  requierePerfil_(sesionEfectiva_(comoUsuario), ['ADMINISTRADOR', 'SOPORTE_CI']);
  const t = tablasSolicitud_();
  return tablero_(leerTabla_('Solicitudes'), t, new Date(), formatoFecha_);
}

function apiInventario(comoUsuario) {
  requierePerfil_(sesionEfectiva_(comoUsuario), ['REVISOR', 'ADMINISTRADOR', 'SOPORTE_CI']);
  return pantallaInventario_();
}

function apiCancelarSolicitud(comoUsuario, idSolicitud, motivo) {
  const sesion = requierePerfil_(sesionEfectiva_(comoUsuario), ['COLABORADOR']);
  return cancelarSolicitud_(sesion, idSolicitud, motivo);
}
