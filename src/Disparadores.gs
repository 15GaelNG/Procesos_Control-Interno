/**
 * DISPARADORES de la hoja de cálculo.
 *
 * onEdit es un disparador simple: Google lo corre solo cada vez que alguien edita a mano la base (no
 * hay que instalarlo). Si la hoja editada es de las que la app recuerda entre llamadas (usuarios,
 * catálogos, Config: TABLAS_ESTABLES), la olvida para que la app vea el cambio al momento.
 *
 * No lleva soloEditor_(): no es una función del editor y lo único que hace es borrar esa memoria (desde
 * el navegador no se le puede pasar una hoja, así que no hace nada).
 */
function onEdit(e) {
  try {
    const nombre = e && e.range && e.range.getSheet().getName();
    if (nombre && TABLAS_ESTABLES.indexOf(nombre) !== -1) CacheService.getScriptCache().remove(claveCacheTabla_(nombre));
  } catch (err) { /* nunca debe estorbar a quien edita */ }
}
