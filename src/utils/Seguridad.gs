/**
 * CANDADO DE LAS FUNCIONES DEL EDITOR
 *
 * En Apps Script cualquier función de nivel superior que no termine en "_" se puede llamar desde el
 * navegador con google.script.run, y la web app corre con los permisos de quien la implementó
 * (USER_DEPLOYING). Sin este candado, cualquier persona del dominio podría, desde la consola del
 * navegador, correr instalarProduccion() o gastar la cuota de la IA con probarIA().
 *
 * Deja pasar solo cuando quien la corre es la misma cuenta con la que corre el script: el editor de
 * Apps Script (o quien implementó la app). Aprendido en Control Interno.
 */
function soloEditor_() {
  const activo = String(Session.getActiveUser().getEmail() || '').toLowerCase();
  const efectivo = String(Session.getEffectiveUser().getEmail() || '').toLowerCase();
  if (!activo || activo !== efectivo) {
    throw new Error('Esta función solo se corre desde el editor de Apps Script.');
  }
}
