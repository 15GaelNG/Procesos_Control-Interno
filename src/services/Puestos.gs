/**
 * CATÁLOGO DE PUESTOS (decisión 34): la IA coteja contra él a los responsables de cada actividad (§3.3) y
 * el puesto de cada usuario sale en «Elaboró» y «Revisó».
 *
 * El administrador da de alta, corrige y da de baja (nada se borra: ACTIVO = NO); Soporte CI consulta.
 * Los sinónimos (otras formas de llamarlo, separadas por coma) ayudan a la IA a reconocer el puesto.
 * También se puede pegar una lista (un puesto por renglón) cuando Procesos entregue el catálogo.
 * Lo puro está probado en tests/puestos.test.js.
 */

/** La lista para la pantalla (sin tocar Google), por nombre. */
function listaPuestos_(puestos, departamentos) {
  const nombreDepto = {};
  departamentos.forEach(function (d) { nombreDepto[d.ID_DEPARTAMENTO] = String(d.NOMBRE || ''); });
  return puestos.map(function (p) {
    return { id: p.ID_PUESTO, nombre: String(p.NOMBRE || ''), idDepartamento: String(p.ID_DEPARTAMENTO || ''),
      departamento: nombreDepto[p.ID_DEPARTAMENTO] || '', sinonimos: String(p.SINONIMOS || ''), activo: String(p.ACTIVO).trim().toUpperCase() !== 'NO' };
  }).sort(function (a, b) { return (b.activo - a.activo) || a.nombre.localeCompare(b.nombre, 'es'); });
}

/** Sinónimos limpios: separados por coma, sin repetir ni vacíos. */
function sinonimosLimpios_(texto) {
  const vistos = [];
  return String(texto || '').split(/[,;\n]+/).map(function (s) { return s.replace(/\s+/g, ' ').trim(); })
    .filter(function (s) { if (!s || vistos.indexOf(normalizar_(s)) !== -1) return false; vistos.push(normalizar_(s)); return true; })
    .join(', ');
}

/**
 * Qué escribir al guardar un puesto (sin tocar Google). datos: { id ('' = nuevo), nombre, idDepartamento,
 * sinonimos, activo }. Devuelve { errores, cambios }.
 */
function planPuesto_(datos, puestos, departamentos) {
  const d = datos || {};
  const plan = { errores: [], cambios: {} };
  const nombre = String(d.nombre || '').replace(/\s+/g, ' ').trim();
  const actual = d.id ? puestos.filter(function (p) { return p.ID_PUESTO === d.id; })[0] : null;
  if (d.id && !actual) { plan.errores.push('Ese puesto ya no existe; recarga la página.'); return plan; }
  if (nombre.length < 3) plan.errores.push('Escribe el nombre del puesto.');
  if (nombre.length > LIMITES_CAPTURA.RESPONSABLE_MAX) plan.errores.push('El nombre es demasiado largo.');
  const repetido = puestos.filter(function (p) {
    return p.ID_PUESTO !== d.id && String(p.ACTIVO).trim().toUpperCase() !== 'NO' && normalizar_(p.NOMBRE) === normalizar_(nombre);
  })[0];
  if (repetido && d.activo !== false) plan.errores.push('Ya existe el puesto «' + repetido.NOMBRE + '».');
  const idDepartamento = String(d.idDepartamento || '');
  if (idDepartamento && !departamentos.some(function (x) { return x.ID_DEPARTAMENTO === idDepartamento; })) plan.errores.push('Ese departamento no existe.');
  const sinonimos = sinonimosLimpios_(d.sinonimos);
  if (sinonimos.length > 500) plan.errores.push('Los sinónimos pasan de 500 caracteres.');
  if (plan.errores.length) return plan;
  const nuevo = { NOMBRE: nombre, ID_DEPARTAMENTO: idDepartamento, SINONIMOS: sinonimos, ACTIVO: d.activo === false ? 'NO' : 'SI' };
  Object.keys(nuevo).forEach(function (k) { if (!actual || String(actual[k] || '') !== nuevo[k]) plan.cambios[k] = nuevo[k]; });
  return plan;
}

function guardarPuesto_(sesion, datos) {
  const puestos = leerTablaFresca_('Puestos');
  const plan = planPuesto_(datos, puestos, leerTabla_('Departamentos'));
  if (plan.errores.length) throw new Error(plan.errores.join(' '));
  const d = datos || {};
  if (!Object.keys(plan.cambios).length) return { id: d.id, sinCambios: true };
  if (d.id) {
    const actual = puestos.filter(function (p) { return p.ID_PUESTO === d.id; })[0];
    actualizarFila_('Puestos', actual._fila, plan.cambios);
    registrarBitacora_(sesion, 'CAMBIO_PUESTO', actual.NOMBRE + ': ' + Object.keys(plan.cambios).map(function (k) { return k + ' = ' + plan.cambios[k]; }).join('; '));
    return { id: d.id };
  }
  const id = siguienteId_('PUE', 4);
  agregarFila_('Puestos', Object.assign({ ID_PUESTO: id }, plan.cambios));
  registrarBitacora_(sesion, 'ALTA_PUESTO', plan.cambios.NOMBRE);
  return { id: id };
}

/**
 * Los puestos de una lista pegada (sin tocar Google): un renglón por puesto, con sus sinónimos después de
 * «|» si los tiene («Auxiliar de Compras | aux. compras, auxiliar»). Los que ya existen no se repiten.
 */
function planImportarPuestos_(texto, puestos) {
  const existentes = puestos.filter(function (p) { return String(p.ACTIVO).trim().toUpperCase() !== 'NO'; }).map(function (p) { return normalizar_(p.NOMBRE); });
  const plan = { nuevos: [], repetidos: [], errores: [] };
  String(texto || '').split('\n').forEach(function (renglon, i) {
    const partes = renglon.split('|');
    const nombre = partes[0].replace(/\s+/g, ' ').trim();
    if (!nombre) return;
    if (nombre.length < 3 || nombre.length > LIMITES_CAPTURA.RESPONSABLE_MAX) { plan.errores.push('Renglón ' + (i + 1) + ': nombre no válido.'); return; }
    if (existentes.indexOf(normalizar_(nombre)) !== -1) { plan.repetidos.push(nombre); return; }
    existentes.push(normalizar_(nombre));
    plan.nuevos.push({ NOMBRE: nombre, ID_DEPARTAMENTO: '', SINONIMOS: sinonimosLimpios_(partes.slice(1).join(',')), ACTIVO: 'SI' });
  });
  return plan;
}

function importarPuestos_(sesion, texto) {
  const plan = planImportarPuestos_(texto, leerTablaFresca_('Puestos'));
  if (plan.errores.length) throw new Error(plan.errores.join(' '));
  const ids = reservarIds_('PUE', plan.nuevos.length, 4);
  agregarFilas_('Puestos', plan.nuevos.map(function (p, i) { return Object.assign({ ID_PUESTO: ids[i] }, p); }));
  if (plan.nuevos.length) registrarBitacora_(sesion, 'ALTA_PUESTO', plan.nuevos.length + ' puestos de una lista: ' + plan.nuevos.map(function (p) { return p.NOMBRE; }).join(', ').slice(0, 400));
  return { creados: plan.nuevos.length, repetidos: plan.repetidos };
}
