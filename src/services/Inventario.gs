/**
 * INVENTARIO DOCUMENTAL (fase 6): los documentos oficiales con su versión vigente y su historial.
 *
 * Un documento entra cuando Procesos registra que CH autorizó su solicitud (AutorizacionCH.gs); su
 * Word y PDF finales (sin marca) se ligan al generarse. El inventario anterior de Procesos (pregunta J)
 * se cargará cuando lo entreguen, con ORIGEN = HISTORICO. Lo puro está probado en tests/autorizacion-ch.test.js.
 */

/** La lista para la pantalla (sin tocar Google), por código. */
function inventario_(documentos, historial, archivos, t, formatos) {
  const nombreDe = function (lista, campo, id) { const x = lista.filter(function (r) { return r[campo] === id; })[0]; return x ? String(x.NOMBRE) : ''; };
  const dia = function (v) { return marcaDe_(v) ? formatos.dia(new Date(marcaDe_(v))) : ''; };
  const existe = function (id) { return id && archivos.some(function (a) { return a.ID_ARCHIVO === id; }) ? String(id) : ''; };
  return documentos.slice().sort(function (a, b) { return String(a.CODIGO).localeCompare(String(b.CODIGO)); }).map(function (d) {
    return {
      id: d.ID_DOCUMENTO, codigo: String(d.CODIGO || ''), nombre: String(d.NOMBRE || ''), tipoDocumento: nombreDe(t.tipos, 'ID_TIPO', d.ID_TIPO),
      departamento: nombreDe(t.departamentos, 'ID_DEPARTAMENTO', d.ID_DEPARTAMENTO), area: nombreDe(t.areas, 'ID_AREA', d.ID_AREA),
      subarea: nombreDe(t.subareas, 'ID_SUBAREA', d.ID_SUBAREA), version: String(d.VERSION_VIGENTE || ''), vigencia: dia(d.FECHA_VIGENCIA),
      estatus: String(d.ESTATUS || ''), origen: NOMBRES_ORIGEN_DOCUMENTO[d.ORIGEN] || String(d.ORIGEN || ''),
      idSolicitud: String(d.ID_SOLICITUD_VIGENTE || ''), pdf: existe(d.ID_ARCHIVO_PDF), docx: existe(d.ID_ARCHIVO_WORD),
      historial: historial.filter(function (h) { return h.ID_DOCUMENTO === d.ID_DOCUMENTO; })
        .sort(function (a, b) { return marcaDe_(b.FECHA) - marcaDe_(a.FECHA); })
        .map(function (h) {
          return { version: String(h.VERSION || ''), fecha: dia(h.FECHA), motivos: String(h.MOTIVOS || ''), descripcion: String(h.DESCRIPCION || ''),
            responsable: String(h.RESPONSABLE || ''), autorizo: String(h.AUTORIZO_NOMBRE || ''), puesto: String(h.AUTORIZO_PUESTO || ''),
            idSolicitud: String(h.ID_SOLICITUD || '') };
        })
    };
  });
}

function pantallaInventario_() {
  return inventario_(leerTabla_('Documentos'), leerTabla_('HistorialCambios'), leerTabla_('Archivos'), tablasSolicitud_(), formatosFecha_());
}
