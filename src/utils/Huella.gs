/**
 * HUELLA DEL CONTENIDO
 *
 * Un resumen (SHA-256) del contenido de una solicitud. La confirmación del colaborador queda ligada a
 * la huella de lo que confirmó (§3.5): si después cambia algo, la huella ya no coincide y hay que
 * volver a confirmar. Solo cuenta lo que va en el documento (textos, responsables, imágenes y sus pies,
 * en su orden); los espacios de más no cuentan.
 */

/** Texto canónico del contenido: el mismo contenido da siempre el mismo texto. */
function contenidoCanonico_(contenido) {
  const t = function (v) { return String(v === null || v === undefined ? '' : v).replace(/\s+/g, ' ').trim(); };
  return JSON.stringify({
    nombre: t(contenido.nombre),
    inicio: t(contenido.inicio),
    fin: t(contenido.fin),
    actividades: (contenido.actividades || []).map(function (a) {
      return { texto: t(a.texto), responsable: t(a.responsable),
        imagenes: (a.imagenes || []).map(function (i) { return [t(i.id), t(i.pie)]; }) };
    })
  });
}

/** SHA-256 en hexadecimal. */
function huella_(texto) {
  return Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, texto, Utilities.Charset.UTF_8)
    .map(function (b) { return ((b + 256) % 256).toString(16).padStart(2, '0'); }).join('');
}
