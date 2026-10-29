/**
 * HUELLA DEL CONTENIDO
 *
 * Un resumen (SHA-256) del contenido de una solicitud. La confirmación del colaborador queda ligada a
 * la huella de lo que confirmó (§3.5): si después cambia algo, la huella ya no coincide y hay que
 * volver a confirmar. Cuenta lo que el colaborador confirma: inicio y fin, objetivo, alcance,
 * responsabilidades, definiciones y cada actividad (texto, responsable, imágenes y sus pies, en su
 * orden). Los espacios de más no cuentan.
 */

/** Texto canónico del contenido: el mismo contenido da siempre el mismo texto. */
function contenidoCanonico_(contenido) {
  const t = function (v) { return String(v === null || v === undefined ? '' : v).replace(/\s+/g, ' ').trim(); };
  return JSON.stringify({
    nombre: t(contenido.nombre),
    inicio: t(contenido.inicio),
    fin: t(contenido.fin),
    objetivo: t(contenido.objetivo),
    alcance: t(contenido.alcance),
    responsabilidades: (contenido.responsabilidades || []).map(t),
    definiciones: (contenido.definiciones || []).map(t),
    actividades: (contenido.actividades || []).map(function (a) {
      const actividad = { texto: t(a.texto), responsable: t(a.responsable),
        imagenes: (a.imagenes || []).map(function (i) { return [t(i.id), t(i.pie)]; }) };
      // Solo si hay: así las huellas de lo que se confirmó antes de que existieran los enlaces no cambian.
      if (a.enlaces && a.enlaces.length) actividad.enlaces = a.enlaces.map(function (e) { return [t(e.url), t(e.texto)]; });
      return actividad;
    })
  });
}

/** SHA-256 en hexadecimal. */
function huella_(texto) {
  return Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, texto, Utilities.Charset.UTF_8)
    .map(function (b) { return ((b + 256) % 256).toString(16).padStart(2, '0'); }).join('');
}
