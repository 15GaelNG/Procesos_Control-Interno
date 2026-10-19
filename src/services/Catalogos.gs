/**
 * CATÁLOGOS: departamentos, áreas y subáreas (ver docs/catalogos.md).
 *
 *   importarCatalogoInicial()  → (editor) carga CATALOGO_INICIAL (config/CatalogoInicial.gs, generado del
 *                                Excel de Procesos). Solo agrega lo que falta: nunca borra ni cambia lo
 *                                que ya está en la base. Es seguro correrla varias veces.
 *   arbolCatalogo_()           → departamentos → áreas → subáreas, para la pantalla «Catálogos».
 *
 * El código documental se arma con la clave del departamento y la del área (P-CI04-001). Las subáreas
 * no cambian el código: heredan la clave de su área.
 */

function importarCatalogoInicial() {
  soloEditor_();
  ['Departamentos', 'Areas', 'Subareas'].forEach(function (nombre) {
    const def = ESQUEMA_BD.filter(function (d) { return d.hoja === nombre; })[0];
    const hoja = obtenerBD_().getSheetByName(nombre);
    const encabezados = hoja ? leerEncabezados_(hoja) : [];
    if (def.columnas.some(function (c) { return encabezados.indexOf(c) === -1; })) {
      throw new Error('La hoja ' + nombre + ' no está al día. Corre primero la instalación del ambiente (instalarPruebas o instalarProduccion).');
    }
  });
  const actuales = { departamentos: leerTabla_('Departamentos'), areas: leerTabla_('Areas'), subareas: leerTabla_('Subareas') };

  // Primero se cuenta cuántos IDs hacen falta, se reservan en bloque y se arma el plan con ellos.
  const conteo = { DEP: 0, ARE: 0, SUB: 0 };
  planImportacionCatalogo_(CATALOGO_INICIAL, actuales, function (serie) { conteo[serie]++; return serie; });
  const ids = { DEP: reservarIds_('DEP', conteo.DEP, 3), ARE: reservarIds_('ARE', conteo.ARE, 4), SUB: reservarIds_('SUB', conteo.SUB, 4) };
  const plan = planImportacionCatalogo_(CATALOGO_INICIAL, actuales, function (serie) { return ids[serie].shift(); });

  agregarFilas_('Departamentos', plan.departamentos);
  agregarFilas_('Areas', plan.areas);
  agregarFilas_('Subareas', plan.subareas);
  const resumen = 'Nuevos: ' + plan.departamentos.length + ' departamentos, ' + plan.areas.length + ' áreas, ' +
    plan.subareas.length + ' subáreas. Ya existían: ' + plan.existentes.departamentos + ' departamentos, ' +
    plan.existentes.areas + ' áreas, ' + plan.existentes.subareas + ' subáreas.';
  agregarFila_('Bitacora', { FECHA: new Date(), USUARIO: Session.getEffectiveUser().getEmail(), ACCION: 'IMPORTAR_CATALOGO',
    DETALLE: resumen + (plan.avisos.length ? ' Avisos: ' + plan.avisos.length : '') });
  Logger.log(resumen + (plan.avisos.length ? '\n\nAvisos (no se cambió nada de la base):\n  · ' + plan.avisos.join('\n  · ') : ''));
  return plan;
}

/**
 * Qué agregar a la base para que tenga todo el catálogo, sin tocar Google (probado en node).
 * actuales: { departamentos, areas, subareas } (filas de leerTabla_). nuevoId(serie): 'DEP' | 'ARE' | 'SUB'.
 * Empata sin importar mayúsculas ni acentos: departamento por nombre; área por departamento + nombre
 * + clave (o solo nombre, si es único en el departamento); subárea por área + nombre. Si lo que hay en
 * la base difiere del archivo, se respeta la base y se avisa.
 */
function planImportacionCatalogo_(catalogo, actuales, nuevoId) {
  const plan = { departamentos: [], areas: [], subareas: [], existentes: { departamentos: 0, areas: 0, subareas: 0 }, avisos: [] };
  const deptos = actuales.departamentos.slice();
  const areas = actuales.areas.slice();
  const subareas = actuales.subareas.slice();
  const igual = function (a, b) { return normalizar_(a) === normalizar_(b); };

  catalogo.forEach(function (d) {
    let depto = deptos.filter(function (x) { return igual(x.NOMBRE, d.nombre); })[0];
    if (!depto) {
      depto = { ID_DEPARTAMENTO: nuevoId('DEP'), NOMBRE: d.nombre, CLAVE_CODIGO: d.clave, DIRECCION: '', ACTIVO: 'SI' };
      deptos.push(depto);
      plan.departamentos.push(depto);
    } else {
      plan.existentes.departamentos++;
      if (String(depto.CLAVE_CODIGO).trim() !== d.clave) {
        plan.avisos.push(d.nombre + ': en la base su clave es «' + depto.CLAVE_CODIGO + '» y el archivo dice «' + d.clave + '».');
      }
    }

    d.areas.forEach(function (a) {
      const delDepto = areas.filter(function (x) { return x.ID_DEPARTAMENTO === depto.ID_DEPARTAMENTO && igual(x.NOMBRE, a.nombre); });
      // Primero nombre + clave; solo por nombre si el archivo no trae otra área con ese nombre en el
      // departamento (p. ej. Capital Humano tiene SUBDIRECCION 06, de baja, y SUBDIRECCION 09).
      const nombreUnico = d.areas.filter(function (y) { return igual(y.nombre, a.nombre); }).length === 1;
      let area = delDepto.filter(function (x) { return String(x.CLAVE_CODIGO).trim() === a.clave; })[0] ||
        (nombreUnico ? delDepto[0] : null);
      if (!area) {
        area = { ID_AREA: nuevoId('ARE'), ID_DEPARTAMENTO: depto.ID_DEPARTAMENTO, NOMBRE: a.nombre, CLAVE_CODIGO: a.clave,
          ACTIVO: a.activo, OBSERVACIONES: a.observaciones };
        areas.push(area);
        plan.areas.push(area);
      } else {
        plan.existentes.areas++;
        if (String(area.CLAVE_CODIGO).trim() !== a.clave) {
          plan.avisos.push(d.nombre + ' / ' + a.nombre + ': en la base su clave es «' + area.CLAVE_CODIGO + '» y el archivo dice «' + a.clave + '».');
        }
      }

      a.subareas.forEach(function (s) {
        const existe = subareas.some(function (x) { return x.ID_AREA === area.ID_AREA && igual(x.NOMBRE, s.nombre); });
        if (existe) { plan.existentes.subareas++; return; }
        const sub = { ID_SUBAREA: nuevoId('SUB'), ID_AREA: area.ID_AREA, NOMBRE: s.nombre, CLAVE_ANTERIOR: s.claveAnterior,
          ACTIVO: 'SI', OBSERVACIONES: s.observaciones };
        subareas.push(sub);
        plan.subareas.push(sub);
      });
    });
  });
  return plan;
}

/** Departamentos → áreas → subáreas, ordenados por nombre y clave, con el cuerpo del código de cada área. */
function arbolCatalogo_(departamentos, areas, subareas) {
  const activo = function (v) { return String(v).trim().toUpperCase() !== 'NO'; };
  const texto = function (v) { return v === null || v === undefined ? '' : String(v).trim(); };
  return departamentos.map(function (d) {
    const clave = texto(d.CLAVE_CODIGO);
    return {
      id: d.ID_DEPARTAMENTO, nombre: texto(d.NOMBRE), clave: clave, activo: activo(d.ACTIVO),
      areas: areas.filter(function (a) { return a.ID_DEPARTAMENTO === d.ID_DEPARTAMENTO; })
        .map(function (a) {
          return {
            id: a.ID_AREA, nombre: texto(a.NOMBRE), clave: texto(a.CLAVE_CODIGO), cuerpo: clave + texto(a.CLAVE_CODIGO),
            activo: activo(a.ACTIVO), observaciones: texto(a.OBSERVACIONES),
            subareas: subareas.filter(function (s) { return s.ID_AREA === a.ID_AREA; }).map(function (s) {
              return { id: s.ID_SUBAREA, nombre: texto(s.NOMBRE), claveAnterior: texto(s.CLAVE_ANTERIOR),
                activo: activo(s.ACTIVO), observaciones: texto(s.OBSERVACIONES) };
            }).sort(function (x, y) { return x.nombre.localeCompare(y.nombre, 'es'); })
          };
        })
        .sort(function (x, y) { return x.clave.localeCompare(y.clave) || x.nombre.localeCompare(y.nombre, 'es'); })
    };
  }).sort(function (x, y) { return x.nombre.localeCompare(y.nombre, 'es'); });
}
