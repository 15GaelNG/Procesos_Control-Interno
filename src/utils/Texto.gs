/**
 * TEXTO: comparar y limpiar textos escritos por personas.
 *
 * normalizar_ sirve para comparar sin importar mayúsculas, acentos, puntuación ni espacios
 * («Facturación OOAM» = «FACTURACION  ooam»). La usan el validador de la IA y los catálogos.
 */

function normalizar_(s) {
  return String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9ñ]+/g, ' ').trim();
}

function texto_(v) {
  return v === null || v === undefined ? '' : String(v).trim();
}
